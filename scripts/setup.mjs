// One-time local setup for the exercises (Windows, macOS or Linux).
//
//   node scripts/setup.mjs                      everything below
//   node scripts/setup.mjs --ado-org <org>      ...and add the Azure DevOps remote MCP server
//   node scripts/setup.mjs --ado-local <org>    ...and add the Azure DevOps local MCP server (npx)
//   node scripts/setup.mjs --jira               ...and add the Atlassian remote MCP server (Jira, Confluence)
//
// Steps: check git, Node.js and the .NET 10 SDK -> tag the baseline -> restore and build the .NET solution ->
// npm install -> Playwright Chromium -> MCP configuration -> smoke tests.

import fs from 'node:fs';
import path from 'node:path';
import { formatJson, parseJsonc } from './lib/files.mjs';
import { currentBranch, git, isInsideRepository, tagExists, workingTreeChanges } from './lib/git.mjs';
import { canRun, outputTail, run } from './lib/process.mjs';
import { baselineTag, repoRoot } from './lib/repo.mjs';
import { bold, dim, exitWithError, info, ok, parseCommandLine, red, warn, yellow } from './lib/ui.mjs';

const usage = `Usage: node scripts/setup.mjs [options]

  --ado-org <org>     Add the Azure DevOps remote MCP server (https://mcp.dev.azure.com/<org>).
  --ado-local <org>   Add the Azure DevOps local MCP server (npx @azure-devops/mcp <org>).
  --jira              Add the Atlassian remote MCP server (Jira and Confluence).
  --write-mcp         Rewrite .vscode/mcp.json and .mcp.json even without a server option.
  --no-playwright     Skip the Playwright Chromium download.
  --skip-tests        Skip the smoke tests.

MCP files are only written when a server option or --write-mcp is given, or when a file is missing.
Servers already in the files are kept.`;

const webFolder = path.join(repoRoot, 'src', 'web');
const dotnetDownload = 'https://dotnet.microsoft.com/download/dotnet/10.0';
const totalSteps = 7;

const githubServer = { type: 'http', url: 'https://api.githubcopilot.com/mcp/' };
const playwrightServer = { type: 'stdio', command: 'npx', args: ['@playwright/mcp@latest'] };

class SetupError extends Error {}

const warnings = [];
let stepNumber = 0;

function main() {
  const { values } = parseCommandLine(usage, {
    'ado-org': { type: 'string' },
    'ado-local': { type: 'string' },
    jira: { type: 'boolean' },
    'write-mcp': { type: 'boolean' },
    'no-playwright': { type: 'boolean' },
    'skip-tests': { type: 'boolean' },
  });
  for (const option of ['ado-org', 'ado-local']) {
    if (values[option] !== undefined && !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(values[option])) {
      throw new SetupError(`--${option} needs an Azure DevOps organisation name (letters, digits and hyphens).`);
    }
  }

  console.log(bold(`ClaimsDesk setup (${process.platform}, Node.js ${process.versions.node})`));

  const hasDotnet = checkPrerequisites();
  tagBaseline();
  buildSolution(hasDotnet);
  installWebDependencies();
  installBrowser(Boolean(values['no-playwright']));
  configureMcp(values);
  runSmokeTests(hasDotnet, Boolean(values['skip-tests']));

  if (!hasDotnet) {
    console.log(red(`\nSetup incomplete: install the .NET 10 SDK (${dotnetDownload}) and run this again.`));
    return 1;
  }
  printSummary();
  return 0;
}

function step(title) {
  stepNumber += 1;
  console.log(`\n${bold(`[${stepNumber}/${totalSteps}] ${title}`)}`);
}

function addWarning(message) {
  warnings.push(message);
  warn(yellow(message));
}

/** Runs a command, printing it first; throws a SetupError with the hint when it fails. */
function runStep(command, args, { cwd = repoRoot, hint } = {}) {
  console.log(dim(`  $ ${command} ${args.join(' ')}`));
  const result = run(command, args, { cwd });
  if (!result.ok) {
    throw new SetupError(`'${command} ${args.join(' ')}' failed${hint ? `. ${hint}` : '.'}`);
  }
}

function checkPrerequisites() {
  step('Check git, Node.js and the .NET SDK');

  if (!canRun('git')) {
    throw new SetupError('git was not found. Install Git from https://git-scm.com/downloads and run this again.');
  }
  ok(run('git', ['--version'], { capture: true }).stdout.trim());

  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 20) {
    throw new SetupError(`Node.js 20 or later is required (found ${process.versions.node}). Install Node.js 22 LTS.`);
  }
  if ((major === 20 && minor < 19) || (major === 22 && minor < 12)) {
    addWarning(`Node.js ${process.versions.node}: Vite 7 needs 20.19+ or 22.12+. Install the latest Node.js 22 LTS.`);
  } else {
    ok(`Node.js ${process.versions.node}`);
  }

  const sdks = run('dotnet', ['--list-sdks'], { capture: true });
  const dotnet10 = sdks.stdout
    .split(/\r?\n/)
    .map((line) => line.split(' ')[0])
    .filter((version) => version.startsWith('10.'));
  if (dotnet10.length === 0) {
    addWarning(`No .NET 10 SDK found - the API cannot build. Install it from ${dotnetDownload}`);
    return false;
  }
  ok(`.NET SDK ${dotnet10.join(', ')}`);
  return true;
}

function tagBaseline() {
  step(`Tag the baseline (${baselineTag})`);
  if (!isInsideRepository()) {
    addWarning(
      'Not a git repository root: Git exercises need a new repository here. Run git init -b main, add and commit the files, ' +
        `then rerun setup to create ${baselineTag}. Old history is not required.`,
    );
    return;
  }
  if (tagExists(baselineTag)) {
    ok(`Tag ${baselineTag} already exists`);
    return;
  }
  const changes = workingTreeChanges();
  if (changes.length > 0) {
    addWarning(`Tag ${baselineTag} not created: ${changes.length} uncommitted change(s). Commit, then: git tag ${baselineTag}`);
    return;
  }
  const tagged = git(['-c', 'tag.gpgsign=false', 'tag', baselineTag]);
  if (!tagged.ok) {
    addWarning(`Could not create tag ${baselineTag}: ${tagged.stderr.trim()}`);
    return;
  }
  ok(`Created tag ${baselineTag} on ${currentBranch() ?? 'HEAD'}`);
}

function buildSolution(hasDotnet) {
  step('Restore and build the .NET solution');
  if (!hasDotnet) {
    info('Skipped - no .NET 10 SDK.');
    return;
  }
  runStep('dotnet', ['restore', 'ClaimsDesk.slnx'], {
    hint: 'Behind a proxy? Configure NuGet (nuget.config) or HTTPS_PROXY, then run this again.',
  });
  runStep('dotnet', ['build', '-nologo', '-v', 'q', 'ClaimsDesk.slnx']);
  ok('Solution built');
}

function installWebDependencies() {
  step('Install the web app dependencies (npm install)');
  const lockFile = path.join(webFolder, 'package-lock.json');
  const hadLockFile = fs.existsSync(lockFile);
  runStep('npm', ['install', '--no-fund', '--no-audit'], {
    cwd: webFolder,
    hint: 'Behind a proxy? Set the npm proxy (npm config set proxy ...) or an internal registry, then run this again.',
  });
  ok('Web dependencies installed');
  if (!hadLockFile && fs.existsSync(lockFile) && isInsideRepository()) {
    addWarning(
      'src/web/package-lock.json was created. Commit it so CI uses `npm ci`, then move the baseline tag:\n' +
        '      git add src/web/package-lock.json && git commit -m "Add web lock file" && git tag -f demo-baseline',
    );
  }
}

function installBrowser(skip) {
  step('Install Playwright Chromium (end-to-end tests)');
  if (skip) {
    info('Skipped (--no-playwright).');
    return;
  }
  console.log(dim('  $ npx playwright install chromium'));
  const result = run('npx', ['playwright', 'install', 'chromium'], { cwd: webFolder });
  if (result.ok) {
    ok('Chromium installed');
  } else {
    addWarning('Chromium download failed (proxy?). The end-to-end tests need it; the rest of the demo works without it.');
  }
}

function configureMcp(values) {
  step('MCP servers (.vscode/mcp.json and .mcp.json)');
  const optional = {};
  if (values['ado-org']) {
    optional['ado-remote'] = { type: 'http', url: `https://mcp.dev.azure.com/${values['ado-org']}` };
  }
  if (values['ado-local']) {
    optional.ado = {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@azure-devops/mcp', values['ado-local'], '-d', 'core', 'work', 'work-items', 'repositories', 'pipelines'],
    };
  }
  if (values.jira) {
    optional.atlassian = { type: 'http', url: 'https://mcp.atlassian.com/v2/mcp' };
  }

  const force = Boolean(values['write-mcp']) || Object.keys(optional).length > 0;
  // GitHub's MCP server is built into Copilot CLI and the cloud agent, so only VS Code's file lists it.
  const vscodeServers = { github: githubServer, playwright: playwrightServer, ...optional };
  const portableServers = { playwright: playwrightServer, ...optional };
  updateMcpFile(path.join(repoRoot, '.vscode', 'mcp.json'), 'servers', vscodeServers, [], force);
  updateMcpFile(path.join(repoRoot, '.mcp.json'), 'mcpServers', portableServers, ['github'], force);
}

/** Merges the managed servers into an MCP file by name, keeping every other server and setting. */
function updateMcpFile(file, key, managed, unwanted, force) {
  const shown = path.relative(repoRoot, file).split(path.sep).join('/');
  const exists = fs.existsSync(file);
  if (exists && !force) {
    ok(`${shown} kept as it is ${dim('(add --write-mcp to rewrite it)')}`);
    return;
  }

  let document = {};
  if (exists) {
    try {
      document = parseJsonc(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      throw new SetupError(`${shown} is not valid JSON (${error.message}). Fix or delete it, then run this again.`);
    }
  }
  const servers = { ...(document[key] ?? {}), ...managed };
  for (const name of unwanted) {
    if (name in servers) {
      delete servers[name];
      info(`Removed '${name}' from ${shown} (built into Copilot CLI and the cloud agent).`);
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, formatJson({ ...document, [key]: servers }));
  ok(`${exists ? 'Updated' : 'Created'} ${shown}: ${Object.keys(servers).join(', ')}`);
}

function runSmokeTests(hasDotnet, skip) {
  step('Smoke tests');
  if (skip) {
    info('Skipped (--skip-tests).');
    return;
  }
  if (hasDotnet) {
    smokeTest('dotnet', ['test', '-nologo', '-v', 'q'], repoRoot, '.NET tests passed');
  } else {
    info('.NET tests skipped - no .NET 10 SDK.');
  }
  smokeTest('npm', ['test'], webFolder, 'Web unit tests passed');
}

function smokeTest(command, args, cwd, success) {
  console.log(dim(`  $ ${command} ${args.join(' ')}`));
  const result = run(command, args, { cwd, capture: true });
  if (!result.ok) {
    throw new SetupError(`'${command} ${args.join(' ')}' failed:\n${outputTail(result)}`);
  }
  ok(success);
}

function printSummary() {
  console.log(`\n${bold(warnings.length === 0 ? 'Setup complete.' : 'Setup complete, with warnings:')}`);
  for (const message of warnings) {
    console.log(`  - ${message}`);
  }
  console.log(`
Next:
  1. Terminal 1: dotnet run --project src/ClaimsDesk.Api      (http://localhost:5080)
  2. Terminal 2: npm run dev --prefix src/web                  (http://localhost:5173)
  3. node scripts/preflight.mjs
  4. VS Code: start the MCP servers you need; set the chat session target to Local.`);
}

let exitCode = 1;
try {
  exitCode = main();
} catch (error) {
  if (error instanceof SetupError) {
    console.error(`\n${red('Setup failed:')} ${error.message}`);
  } else {
    exitWithError(error);
  }
}
process.exit(exitCode);
