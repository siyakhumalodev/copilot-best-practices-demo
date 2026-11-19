import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptsFolder = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.dirname(scriptsFolder);
const trailer = '\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>';

function run(root, command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function write(root, relative, text) {
  const file = path.join(root, ...relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function repository(t, { initialize = true, name = 'repo' } = {}) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'claimsdesk-workflows-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const root = path.join(temporary, name);
  fs.mkdirSync(root);
  fs.cpSync(scriptsFolder, path.join(root, 'scripts'), { recursive: true });
  fs.cpSync(path.join(sourceRoot, '.github'), path.join(root, '.github'), { recursive: true });
  fs.copyFileSync(path.join(sourceRoot, '.gitignore'), path.join(root, '.gitignore'));
  write(root, ['src', 'ClaimsDesk.Api', 'Program.cs'], 'baseline\n');
  write(root, ['src', 'web', 'index.html'], '<title>ClaimsDesk test</title>\n');
  write(root, ['src', 'web', 'playwright.config.ts'], 'dotnet run --project ../ClaimsDesk.Api/ClaimsDesk.Api.csproj\n');
  write(root, ['tests', 'baseline.txt'], 'baseline\n');
  write(root, ['reports', 'baseline.txt'], 'baseline\n');
  write(root, ['work-items', 'baseline.txt'], 'baseline\n');
  write(root, ['docs', 'baseline.txt'], 'baseline\n');
  if (!initialize) {
    return { root, split: path.join(temporary, 'split') };
  }
  run(root, 'git', ['init', '--quiet', '-b', 'main']);
  for (const [key, value] of [
    ['user.name', 'ClaimsDesk Workflow Tests'],
    ['user.email', 'tests@example.com'],
    ['commit.gpgsign', 'false'],
    ['core.hooksPath', path.join(temporary, 'no-hooks')],
    ['core.autocrlf', 'false'],
  ]) {
    run(root, 'git', ['config', key, value]);
  }
  run(root, 'git', ['add', '--all']);
  run(root, 'git', ['commit', '--quiet', '-m', `Test baseline${trailer}`]);
  run(root, 'git', ['-c', 'tag.gpgsign=false', 'tag', 'demo-baseline']);
  return { root, split: path.join(temporary, 'split') };
}

function script(root, name, ...args) {
  return run(root, process.execPath, [path.join(root, 'scripts', `${name}.mjs`), ...args]);
}

test('review setup uses the retained fixture and cleanup returns to the original branch', (t) => {
  const { root } = repository(t);
  script(root, 'demo', 'review-setup');
  assert.equal(run(root, 'git', ['branch', '--show-current']), 'demo/settle-claim');
  assert.deepEqual(run(root, 'git', ['diff', '--name-only', 'main...HEAD']).split(/\r?\n/), [
    'src/ClaimsDesk.Api/Claims/SettlementEndpoints.cs',
    'src/ClaimsDesk.Api/Program.cs',
  ]);
  script(root, 'demo', 'review-cleanup');
  assert.equal(run(root, 'git', ['branch', '--show-current']), 'main');
  assert.equal(run(root, 'git', ['branch', '--list', 'demo/*']), '');
  assert.equal(run(root, 'git', ['status', '--porcelain']), '');
});

test('context can be restored and reset still returns exercise paths to the baseline', (t) => {
  const { root } = repository(t);
  script(root, 'demo', 'context-off');
  assert.equal(fs.existsSync(path.join(root, '.github', 'copilot-instructions.md')), false);
  script(root, 'demo', 'context-on');
  assert.equal(fs.existsSync(path.join(root, '.github', 'copilot-instructions.md')), true);
  script(root, 'demo', 'context-off');
  write(root, ['src', 'ClaimsDesk.Api', 'Program.cs'], 'exercise changes\n');
  write(root, ['reports', 'exercise.txt'], 'exercise output\n');
  script(root, 'reset-demo', '--yes');
  assert.equal(fs.readFileSync(path.join(root, 'src', 'ClaimsDesk.Api', 'Program.cs'), 'utf8'), 'baseline\n');
  assert.equal(fs.existsSync(path.join(root, '.github', 'copilot-instructions.md')), true);
  assert.equal(fs.existsSync(path.join(root, 'reports', 'exercise.txt')), false);
  assert.equal(run(root, 'git', ['status', '--porcelain']), '');
});

test('split repositories retain their templates without copying exercise tooling into the API', (t) => {
  const { root, split } = repository(t);
  script(root, 'split-repos', '--out', split);
  const api = path.join(split, 'claimsdesk-api');
  const web = path.join(split, 'claimsdesk-web');
  assert.equal(fs.existsSync(path.join(api, 'src', 'ClaimsDesk.Api', 'Program.cs')), true);
  assert.equal(fs.existsSync(path.join(api, 'scripts')), false);
  assert.equal(fs.existsSync(path.join(api, 'docs')), false);
  assert.equal(fs.existsSync(path.join(web, 'index.html')), true);
  assert.match(fs.readFileSync(path.join(web, 'playwright.config.ts'), 'utf8'), /\.\.\/claimsdesk-api\/src\//);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(split, 'claimsdesk.code-workspace'), 'utf8')).folders, [
    { path: 'claimsdesk-api' },
    { path: 'claimsdesk-web' },
  ]);
  for (const folder of [api, web]) {
    assert.equal(fs.existsSync(path.join(folder, '.github', 'copilot-instructions.md')), true);
    assert.equal(run(folder, 'git', ['branch', '--show-current']), 'main');
    assert.equal(run(folder, 'git', ['status', '--porcelain']), '');
  }
  write(api, ['stale-output.txt'], 'replace on request\n');
  script(root, 'split-repos', '--out', split, '--force');
  assert.equal(fs.existsSync(path.join(api, 'stale-output.txt')), false);
});

test('split refuses a copy without Git before replacing existing output', (t) => {
  const { root, split } = repository(t, { initialize: false });
  write(split, ['claimsdesk-api', 'keep.txt'], 'existing work\n');
  assert.throws(() => script(root, 'split-repos', '--out', split, '--force'), /not a git repository/i);
  assert.equal(fs.readFileSync(path.join(split, 'claimsdesk-api', 'keep.txt'), 'utf8'), 'existing work\n');
  assert.equal(fs.existsSync(path.join(root, '.git')), false);
});

test('Git commands do not treat an enclosing repository as the source repository', (t) => {
  const { root, split } = repository(t, { initialize: false });
  run(path.dirname(root), 'git', ['init', '--quiet', '-b', 'main']);
  write(split, ['claimsdesk-api', 'keep.txt'], 'existing work\n');
  assert.throws(() => script(root, 'split-repos', '--out', split, '--force'), /not a git repository/i);
  assert.match(script(root, 'demo', 'status'), /not a git repository/i);
  assert.throws(() => script(root, 'demo', 'review-setup'), /not a git repository/i);
  assert.equal(fs.readFileSync(path.join(split, 'claimsdesk-api', 'keep.txt'), 'utf8'), 'existing work\n');
});

test('split refuses output that would replace its own source repository', (t) => {
  const { root } = repository(t, { name: 'claimsdesk-api' });
  assert.throws(() => script(root, 'split-repos', '--out', path.dirname(root), '--force'), /overlap/i);
  assert.equal(run(root, 'git', ['branch', '--show-current']), 'main');
  assert.equal(fs.readFileSync(path.join(root, 'src', 'ClaimsDesk.Api', 'Program.cs'), 'utf8'), 'baseline\n');
});

test('split rejects output aliases that point back inside the source', (t) => {
  const { root, split } = repository(t);
  fs.symlinkSync(root, split, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => script(root, 'split-repos', '--out', path.join(split, 'nested'), '--force'), /outside|overlap/i);
  assert.equal(fs.existsSync(path.join(root, 'nested')), false);
  assert.throws(() => script(root, 'split-repos', '--out', path.join(root, '..nested'), '--force'), /outside|overlap/i);
  assert.equal(fs.existsSync(path.join(root, '..nested')), false);
});

test('split preserves non-ASCII and whitespace filenames in a source path containing spaces', (t) => {
  const { root, split } = repository(t, { name: 'source copy' });
  const apiName = 'notes-\u00e9.txt';
  write(root, ['src', apiName], 'API notes\n');
  write(root, ['src', 'web', 'notes with spaces.txt'], 'web notes\n');
  write(root, [' leading space.txt'], 'keep leading whitespace\n');
  script(root, 'split-repos', '--out', split);
  assert.equal(fs.readFileSync(path.join(split, 'claimsdesk-api', 'src', apiName), 'utf8'), 'API notes\n');
  assert.equal(fs.readFileSync(path.join(split, 'claimsdesk-web', 'notes with spaces.txt'), 'utf8'), 'web notes\n');
  assert.equal(fs.readFileSync(path.join(split, 'claimsdesk-api', ' leading space.txt'), 'utf8'), 'keep leading whitespace\n');
});

test('reset removes committed and staged additions but preserves the lock file and ignored dependencies', (t) => {
  const { root } = repository(t);
  write(root, ['src', 'committed-exercise.txt'], 'exercise commit\n');
  run(root, 'git', ['add', '--all']);
  run(root, 'git', ['commit', '--quiet', '-m', `Exercise changes${trailer}`]);
  write(root, ['src', 'staged-exercise.txt'], 'staged exercise\n');
  run(root, 'git', ['add', '--', 'src/staged-exercise.txt']);
  write(root, ['src', 'web', 'package-lock.json'], '{}\n');
  write(root, ['src', 'web', 'node_modules', 'keep.txt'], 'installed dependency\n');
  fs.rmSync(path.join(root, 'tests', 'baseline.txt'));
  script(root, 'reset-demo', '--yes');
  assert.equal(fs.existsSync(path.join(root, 'src', 'committed-exercise.txt')), false);
  assert.equal(fs.existsSync(path.join(root, 'src', 'staged-exercise.txt')), false);
  assert.equal(fs.readFileSync(path.join(root, 'tests', 'baseline.txt'), 'utf8'), 'baseline\n');
  assert.equal(fs.readFileSync(path.join(root, 'src', 'web', 'package-lock.json'), 'utf8'), '{}\n');
  assert.equal(fs.readFileSync(path.join(root, 'src', 'web', 'node_modules', 'keep.txt'), 'utf8'), 'installed dependency\n');
  assert.equal(run(root, 'git', ['diff', '--name-only', 'demo-baseline', '--', 'src', 'tests', 'reports', '.github', 'work-items']), '');
});

test('review setup does not require the configured signing program or change signing preferences', (t) => {
  const { root } = repository(t);
  run(root, 'git', ['config', 'commit.gpgsign', 'true']);
  run(root, 'git', ['config', 'gpg.program', 'claimsdesk-no-such-signing-tool']);
  script(root, 'demo', 'review-setup');
  assert.equal(run(root, 'git', ['branch', '--show-current']), 'demo/settle-claim');
  assert.equal(run(root, 'git', ['config', 'commit.gpgsign']), 'true');
  script(root, 'demo', 'review-cleanup');
  assert.equal(run(root, 'git', ['branch', '--show-current']), 'main');
});

test('setup creates a baseline after the initial commit even when tag signing is configured', (t) => {
  const { root } = repository(t);
  run(root, 'git', ['tag', '-d', 'demo-baseline']);
  run(root, 'git', ['config', 'tag.gpgsign', 'true']);
  run(root, 'git', ['config', 'gpg.program', 'claimsdesk-no-such-signing-tool']);
  const stubTools = `
    import childProcess from 'node:child_process';
    import { syncBuiltinESMExports } from 'node:module';
    const spawnSync = childProcess.spawnSync;
    childProcess.spawnSync = (command, ...args) => {
      if (command === 'dotnet' || command === 'npm' || command.startsWith('npm ')) {
        return { status: 0, stdout: '10.0.100 [synthetic SDK]\\n', stderr: '' };
      }
      return spawnSync(command, ...args);
    };
    syncBuiltinESMExports();
  `;
  run(root, process.execPath, [
    '--import', `data:text/javascript,${encodeURIComponent(stubTools)}`,
    path.join(root, 'scripts', 'setup.mjs'), '--no-playwright', '--skip-tests',
  ]);
  assert.equal(run(root, 'git', ['rev-parse', 'demo-baseline']), run(root, 'git', ['rev-parse', 'HEAD']));
  assert.equal(run(root, 'git', ['cat-file', '-t', 'demo-baseline']), 'commit');
  assert.equal(run(root, 'git', ['config', 'tag.gpgsign']), 'true');
});
