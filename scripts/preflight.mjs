// Local readiness check. Start the API and the web app first, then:
//
//   node scripts/preflight.mjs                 checks only
//   node scripts/preflight.mjs --with-tests    ...and run the .NET and web unit tests
//
// Prints a ✓/✗ table. Exit code 0 = ready, 1 = something needs attention.

import fs from 'node:fs';
import path from 'node:path';
import { parkedItems } from './lib/context.mjs';
import { parseJsonc } from './lib/files.mjs';
import { currentBranch, isGitInstalled, isInsideRepository, tagExists, workingTreeChanges } from './lib/git.mjs';
import { outputTail, run } from './lib/process.mjs';
import { baselineTag, demoBranchPrefix, repoRoot } from './lib/repo.mjs';
import { bold, cross, dim, green, parseCommandLine, red, tick, yellow } from './lib/ui.mjs';

const usage = `Usage: node scripts/preflight.mjs [--with-tests]

  --with-tests   Also run dotnet test and the web unit tests (about a minute).`;

const apiHealthUrl = 'http://localhost:5080/health';
const webUrl = 'http://localhost:5173';
const webFolder = path.join(repoRoot, 'src', 'web');

async function main() {
  const { values } = parseCommandLine(usage, { 'with-tests': { type: 'boolean' } });
  const checks = [];
  const check = (label, passed, detail, fix) => checks.push({ label, passed, detail, fix });

  console.log(bold('ClaimsDesk preflight\n'));

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  check('Node.js 20 or later', nodeMajor >= 20, `v${process.versions.node}`, 'Install Node.js 22 LTS');

  const sdks = run('dotnet', ['--list-sdks'], { capture: true });
  const dotnet10 = sdks.stdout.split(/\r?\n/).filter((line) => line.startsWith('10.'));
  check(
    '.NET 10 SDK',
    dotnet10.length > 0,
    dotnet10.length > 0 ? dotnet10.map((line) => line.split(' ')[0]).join(', ') : 'not found',
    'Install it from https://dotnet.microsoft.com/download/dotnet/10.0',
  );

  const gitReady = isGitInstalled() && isInsideRepository();
  const hasTag = gitReady && tagExists(baselineTag);
  check(
    `Git tag ${baselineTag}`,
    hasTag,
    gitReady ? (hasTag ? 'found' : 'missing') : 'not a git repository root',
    `Make an initial commit first, then: git tag ${baselineTag}   (on the clean baseline)`,
  );

  const changes = gitReady ? workingTreeChanges() : [];
  check(
    'Git working tree clean',
    gitReady && changes.length === 0,
    !gitReady ? 'not a git repository root' : changes.length === 0 ? 'local MCP config is ignored' : summarise(changes),
    gitReady
      ? 'Commit what you want to keep; reset only to discard exercise work: node scripts/reset-demo.mjs --yes'
      : 'git init -b main   (in this folder), then git add . and git commit -m "Initial import"',
  );

  const branch = gitReady ? currentBranch() : null;
  const onDemoBranch = branch !== null && branch.startsWith(demoBranchPrefix);
  check(
    'Not on a demo/* branch',
    gitReady && !onDemoBranch,
    gitReady ? branch ?? 'detached HEAD' : 'not a git repository root',
    gitReady ? 'node scripts/demo.mjs review-cleanup' : 'Initialize this repository and make an initial commit first',
  );

  const parked = parkedItems();
  const instructions = fs.existsSync(path.join(repoRoot, '.github', 'copilot-instructions.md'));
  check(
    'Repository context on',
    parked.length === 0 && instructions,
    parked.length > 0
      ? `parked: ${parked.join(', ')}`
      : `.github/copilot-instructions.md ${instructions ? 'present' : 'missing'}`,
    parked.length > 0 ? 'node scripts/demo.mjs context-on' : 'node scripts/reset-demo.mjs --yes',
  );

  const vscodeServers = mcpServers(path.join(repoRoot, '.vscode', 'mcp.json'), 'servers');
  check(
    '.vscode/mcp.json',
    vscodeServers !== undefined && ['github', 'playwright'].every((name) => vscodeServers.includes(name)),
    vscodeServers === undefined ? 'missing or not valid JSON' : vscodeServers.join(', '),
    'node scripts/setup.mjs --write-mcp',
  );

  const portableServers = mcpServers(path.join(repoRoot, '.mcp.json'), 'mcpServers');
  check(
    '.mcp.json',
    portableServers !== undefined && portableServers.includes('playwright') && !portableServers.includes('github'),
    portableServers === undefined
      ? 'missing or not valid JSON'
      : `${portableServers.join(', ')}${portableServers.includes('github') ? ' - remove github (built into Copilot CLI)' : ''}`,
    'node scripts/setup.mjs --write-mcp',
  );

  check(
    'Web dependencies installed',
    fs.existsSync(path.join(webFolder, 'node_modules')),
    'src/web/node_modules',
    'node scripts/setup.mjs   (or npm install --prefix src/web)',
  );

  const api = await probe(apiHealthUrl);
  check('API running', api.ok, `${apiHealthUrl} ${api.detail}`, 'dotnet run --project src/ClaimsDesk.Api');

  const web = await probe(webUrl);
  check('Web app running', web.ok, `${webUrl} ${web.detail}`, 'npm run dev --prefix src/web');

  if (values['with-tests']) {
    process.stdout.write(dim('Running dotnet test and npm test ...\n'));
    const dotnetTests = run('dotnet', ['test', '-nologo', '-v', 'q'], { capture: true });
    check('.NET tests pass', dotnetTests.ok, dotnetTests.ok ? '' : outputTail(dotnetTests, 8), 'dotnet test -nologo -v q');
    const webTests = run('npm', ['test'], { cwd: webFolder, capture: true });
    check('Web unit tests pass', webTests.ok, webTests.ok ? '' : outputTail(webTests, 8), 'npm test --prefix src/web');
  }

  printTable(checks);
  const failed = checks.filter((item) => !item.passed).length;
  console.log(
    failed === 0
      ? green(`\nAll ${checks.length} checks passed - ready.`)
      : red(`\n${failed} of ${checks.length} checks need attention.`),
  );
  return failed === 0 ? 0 : 1;
}

/** Server names in an MCP config file, or undefined when it is missing or unreadable. */
function mcpServers(file, key) {
  try {
    const document = parseJsonc(fs.readFileSync(file, 'utf8'));
    return Object.keys(document[key] ?? {});
  } catch {
    return undefined;
  }
}

async function probe(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { ok: response.status === 200, detail: `-> ${response.status}` };
  } catch {
    return { ok: false, detail: '-> not reachable' };
  }
}

function summarise(changes) {
  const shown = changes.slice(0, 3).map((line) => line.trim()).join('; ');
  return `${changes.length} change(s): ${shown}${changes.length > 3 ? '; ...' : ''}`;
}

function printTable(checks) {
  const width = Math.max(...checks.map((item) => item.label.length));
  for (const item of checks) {
    const mark = item.passed ? green(tick) : red(cross);
    const detail = item.detail ? dim(item.detail.split(/\r?\n/).join(' | ')) : '';
    console.log(`  ${mark}  ${item.label.padEnd(width)}  ${detail}`);
    if (!item.passed) {
      console.log(`     ${' '.repeat(width)}  ${yellow('->')} ${item.fix}`);
    }
  }
}

main().then(
  (exitCode) => process.exit(exitCode),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
