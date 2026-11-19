// Splits this repository into two - claimsdesk-api and claimsdesk-web - for the "working at scale" module,
// plus a VS Code workspace that opens both.
//
//   node scripts/split-repos.mjs                 creates ../claimsdesk-split
//   node scripts/split-repos.mjs --out <dir>     somewhere else
//   node scripts/split-repos.mjs --force         replace an existing split
//
// claimsdesk-api: everything except src/web/, scripts/, docs/ and work-items/.
// claimsdesk-web: the contents of src/web/ at its root, plus .editorconfig, .gitignore and .gitattributes.
// Then scripts/split-templates/api/ and scripts/split-templates/web/ are copied over each repository.

import fs from 'node:fs';
import path from 'node:path';
import { parkedItems } from './lib/context.mjs';
import { copyFile, isInside, listFiles } from './lib/files.mjs';
import { git, gitOrThrow, isGitInstalled, isInsideRepository, workingTreeChanges } from './lib/git.mjs';
import { repoRoot } from './lib/repo.mjs';
import { bold, exitWithError, ok, parseCommandLine, warn } from './lib/ui.mjs';

const usage = `Usage: node scripts/split-repos.mjs [--out <dir>] [--force]

  --out <dir>   Where to create the repositories (default: ../claimsdesk-split next to this repository).
  --force       Replace claimsdesk-api/, claimsdesk-web/ and the workspace file if they already exist.`;

const webPrefix = 'src/web/';
const apiExcluded = ['src/web/', 'scripts/', 'docs/', 'work-items/'];
const sharedWithWeb = ['.editorconfig', '.gitignore', '.gitattributes'];
const templatesFolder = path.join(repoRoot, 'scripts', 'split-templates');

const monorepoApiCommand = 'dotnet run --project ../ClaimsDesk.Api/ClaimsDesk.Api.csproj';
const splitApiCommand = 'dotnet run --project ../claimsdesk-api/src/ClaimsDesk.Api/ClaimsDesk.Api.csproj';

function main() {
  const { values } = parseCommandLine(usage, { out: { type: 'string' }, force: { type: 'boolean' } });
  if (!isGitInstalled()) {
    throw new Error('git is not installed or not on the PATH.');
  }
  if (!isInsideRepository()) {
    throw new Error('This folder is not a git repository root. Run git init -b main here before splitting it.');
  }

  const outFolder = values.out ? path.resolve(values.out) : path.resolve(repoRoot, '..', 'claimsdesk-split');
  const sourceRoot = fs.realpathSync.native(repoRoot);
  if (isInside(sourceRoot, canonicalPath(outFolder))) {
    throw new Error(`--out must be outside this repository (got ${outFolder}).`);
  }
  const apiFolder = path.join(outFolder, 'claimsdesk-api');
  const webFolder = path.join(outFolder, 'claimsdesk-web');
  const workspaceFile = path.join(outFolder, 'claimsdesk.code-workspace');
  for (const target of [apiFolder, webFolder, workspaceFile]) {
    const resolved = canonicalPath(target);
    if (isInside(sourceRoot, resolved) || isInside(resolved, sourceRoot)) {
      throw new Error(`Output must not overlap the source repository (got ${target}).`);
    }
  }

  const existing = [apiFolder, webFolder, workspaceFile].filter((item) => fs.existsSync(item));
  if (existing.length > 0 && !values.force) {
    throw new Error(`${existing.join(' and ')} already exist(s). Use --force to replace them.`);
  }
  if (parkedItems().length > 0) {
    throw new Error('Repository context is off. Turn it on first: node scripts/demo.mjs context-on');
  }

  console.log(bold(`Splitting into ${outFolder}`));
  const changes = workingTreeChanges();
  if (changes.length > 0) {
    warn(`${changes.length} uncommitted change(s) are included. For a clean split run: node scripts/reset-demo.mjs --yes`);
  }

  const files = sourceFiles();
  const apiFiles = files.filter((file) => !apiExcluded.some((prefix) => file.startsWith(prefix)));
  const webFiles = files.filter((file) => file.startsWith(webPrefix));

  for (const item of existing) {
    fs.rmSync(item, { recursive: true, force: true });
  }

  copyAll(apiFiles, (file) => path.join(apiFolder, file));
  copyAll(webFiles, (file) => path.join(webFolder, file.slice(webPrefix.length)));
  copyAll(
    sharedWithWeb.filter((file) => files.includes(file)),
    (file) => path.join(webFolder, file),
  );
  ok(`claimsdesk-api: ${apiFiles.length} files`);
  ok(`claimsdesk-web: ${webFiles.length} files from src/web/`);

  applyTemplates('api', apiFolder);
  applyTemplates('web', webFolder);
  pointPlaywrightAtSplitApi(webFolder);

  initialiseRepository(apiFolder);
  initialiseRepository(webFolder);

  fs.writeFileSync(
    workspaceFile,
    `${JSON.stringify({ folders: [{ path: 'claimsdesk-api' }, { path: 'claimsdesk-web' }], settings: {} }, null, 2)}\n`,
  );
  ok(`Workspace: ${workspaceFile}`);

  console.log(`
Next:
  1. Open both repositories: code "${workspaceFile}"
  2. Install the web app:    cd "${webFolder}" && npm install
  3. Run them:               dotnet run --project src/ClaimsDesk.Api   (in claimsdesk-api)  and  npm run dev   (in claimsdesk-web)
  4. Optional, publish:      gh repo create claimsdesk-api --private --source "${apiFolder}" --push   (same for claimsdesk-web)`);
}

/** Files to copy: tracked plus untracked-but-not-ignored, so node_modules, bin/ and obj/ are left out. */
function sourceFiles() {
  return gitOrThrow(['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
    .split('\0')
    .filter((file) => file && fs.existsSync(path.join(repoRoot, file)));
}

/** Resolves existing ancestors so new output paths cannot hide inside a directory alias. */
function canonicalPath(file) {
  let ancestor = file;
  while (!fs.existsSync(ancestor) && path.dirname(ancestor) !== ancestor) {
    ancestor = path.dirname(ancestor);
  }
  return path.resolve(fs.realpathSync.native(ancestor), path.relative(ancestor, file));
}

function copyAll(files, targetFor) {
  for (const file of files) {
    copyFile(path.join(repoRoot, file), targetFor(file));
  }
}

function applyTemplates(name, targetFolder) {
  const folder = path.join(templatesFolder, name);
  const files = listFiles(folder);
  if (files.length === 0) {
    warn(`No templates in scripts/split-templates/${name}/ - claimsdesk-${name} keeps the monorepo files.`);
    return;
  }
  for (const file of files) {
    copyFile(path.join(folder, file), path.join(targetFolder, file));
  }
  ok(`claimsdesk-${name}: ${files.length} template file(s) from scripts/split-templates/${name}/`);
}

/** The web repository's Playwright config starts the API from the sibling claimsdesk-api repository. */
function pointPlaywrightAtSplitApi(webFolder) {
  const configFile = path.join(webFolder, 'playwright.config.ts');
  const config = fs.existsSync(configFile) ? fs.readFileSync(configFile, 'utf8') : '';
  if (!config.includes(monorepoApiCommand)) {
    warn('playwright.config.ts: default API command not found - check the webServer command by hand.');
    return;
  }
  fs.writeFileSync(configFile, config.replace(monorepoApiCommand, splitApiCommand));
  ok('claimsdesk-web: Playwright starts the API from ../claimsdesk-api');
}

function initialiseRepository(folder) {
  if (!git(['init', '--quiet', '-b', 'main'], { cwd: folder }).ok) {
    // git older than 2.28 has no -b
    gitOrThrow(['init', '--quiet'], { cwd: folder });
    gitOrThrow(['symbolic-ref', 'HEAD', 'refs/heads/main'], { cwd: folder });
  }
  for (const [key, value] of [
    ['user.name', 'ClaimsDesk Demo'],
    ['user.email', 'demo@example.com'],
  ]) {
    if (git(['config', key], { cwd: folder }).stdout.trim() === '') {
      gitOrThrow(['config', key, value], { cwd: folder });
    }
  }
  gitOrThrow(['add', '--all'], { cwd: folder });
  gitOrThrow(['-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Initial import'], { cwd: folder });
  ok(`${path.basename(folder)}: git repository with branch main and commit "Initial import"`);
}

try {
  main();
} catch (error) {
  exitWithError(error);
}
