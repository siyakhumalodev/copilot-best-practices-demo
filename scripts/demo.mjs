// Switches exercise scenarios on and off.
//
//   node scripts/demo.mjs context-off      move repository instructions and skills aside (insufficient-context demo)
//   node scripts/demo.mjs context-on       put them back
//   node scripts/demo.mjs status           what is switched on, which branch, what changed
//   node scripts/demo.mjs review-setup     branch demo/settle-claim with a flawed "settle claim" change to review
//   node scripts/demo.mjs review-cleanup   back to your branch; delete demo/settle-claim

import fs from 'node:fs';
import path from 'node:path';
import { contextItems, disableContext, enableContext, parkedItems } from './lib/context.mjs';
import { copyFile, listFiles } from './lib/files.mjs';
import { run } from './lib/process.mjs';
import {
  branchExists,
  currentBranch,
  git,
  gitOrThrow,
  isGitInstalled,
  isInsideRepository,
  localBranches,
  tagExists,
  workingTreeChanges,
} from './lib/git.mjs';
import { baselineTag, clearState, demoBranchPrefix, readState, repoRoot, writeState } from './lib/repo.mjs';
import { bold, dim, exitWithError, info, ok, parseCommandLine, warn } from './lib/ui.mjs';

const usage = `Usage: node scripts/demo.mjs <command>

  context-off      Move .github/copilot-instructions.md, .github/instructions/, .github/skills/ and AGENTS.md
                   into .demo-disabled/ so Copilot works without repository context.
  context-on       Move them back.
  status           Show context, branch and uncommitted changes.
  review-setup     Create branch ${demoBranchPrefix}settle-claim with a "settle claim" endpoint to review (needs a clean tree).
  review-cleanup   Switch back to your branch and delete ${demoBranchPrefix}settle-claim.`;

const reviewBranch = `${demoBranchPrefix}settle-claim`;
const reviewAssets = path.join(repoRoot, 'scripts', 'review-fixture');

const commands = {
  'context-off': contextOff,
  'context-on': contextOn,
  status,
  'review-setup': reviewSetup,
  'review-cleanup': reviewCleanup,
};

function main() {
  const { positionals } = parseCommandLine(usage, {}, { allowPositionals: true });
  const command = commands[positionals[0]];
  if (!command || positionals.length !== 1) {
    console.error(usage);
    process.exit(2);
  }
  command();
}

function contextOff() {
  const moved = disableContext();
  if (moved.length === 0) {
    const parked = parkedItems();
    console.log(parked.length > 0 ? `Context is already off (${parked.join(', ')}).` : 'No repository context found to move.');
    return;
  }
  console.log(bold('Repository context is OFF'));
  for (const item of moved) {
    ok(`${item} -> .demo-disabled/${item}`);
  }
  console.log('\nStart a NEW chat so Copilot stops using them. Turn them back on with: node scripts/demo.mjs context-on');
}

function contextOn() {
  const restored = enableContext();
  if (restored.length === 0) {
    console.log('Context is already on - nothing to restore.');
    return;
  }
  console.log(bold('Repository context is ON'));
  for (const item of restored) {
    ok(item);
  }
  console.log('\nStart a new chat to pick the instructions and skills up again.');
}

function status() {
  const parked = parkedItems();
  const present = contextItems.filter((item) => fs.existsSync(path.join(repoRoot, item)));
  console.log(bold('ClaimsDesk demo status'));
  if (parked.length > 0) {
    warn(`Context OFF - parked in .demo-disabled/: ${parked.join(', ')}`);
  } else {
    ok(`Context ON - ${present.length > 0 ? present.join(', ') : 'no context files found'}`);
  }

  if (!isGitInstalled() || !isInsideRepository()) {
    warn('Not a git repository - branch and change information unavailable.');
    return;
  }

  const branch = currentBranch() ?? '(detached HEAD)';
  const demoBranches = localBranches(`${demoBranchPrefix}*`);
  info(`Branch: ${branch}${demoBranches.length > 0 ? dim(`  (demo branches: ${demoBranches.join(', ')})`) : ''}`);
  if (tagExists(baselineTag)) {
    const ahead = git(['rev-list', '--count', `${baselineTag}..HEAD`]).stdout.trim();
    info(`Baseline tag ${baselineTag}: present${ahead !== '0' ? dim(` (${ahead} commit(s) since)`) : ''}`);
  } else {
    warn(`Baseline tag ${baselineTag} missing - create it on the clean baseline: git tag ${baselineTag}`);
  }

  const changes = workingTreeChanges();
  info(`Uncommitted changes: ${changes.length}${changes.length > 0 ? '' : ' (clean)'}`);
  for (const line of changes.slice(0, 10)) {
    info(dim(`  ${line}`));
  }
  if (changes.length > 10) {
    info(dim(`  ... and ${changes.length - 10} more`));
  }

  const state = readState();
  if (state.previousBranch) {
    info(`Review demo: started from ${state.previousBranch}`);
  }
}

function reviewSetup() {
  requireRepository();
  if (parkedItems().length > 0) {
    throw new Error('Repository context is off. Turn it on first: node scripts/demo.mjs context-on');
  }
  const changes = workingTreeChanges();
  if (changes.length > 0) {
    throw new Error(
      `The working tree has ${changes.length} uncommitted change(s), for example "${changes[0].trim()}". ` +
        'Commit them, or reset: node scripts/reset-demo.mjs --yes',
    );
  }
  if (branchExists(reviewBranch)) {
    throw new Error(`Branch ${reviewBranch} already exists. Remove it first: node scripts/demo.mjs review-cleanup`);
  }
  const previousBranch = currentBranch();
  if (previousBranch === null) {
    throw new Error('HEAD is detached. Check out your main branch first (git switch main).');
  }

  const files = listFiles(reviewAssets);
  if (files.length === 0) {
    throw new Error(`No files in ${path.relative(repoRoot, reviewAssets)}.`);
  }

  writeState({ previousBranch, reviewBranch, createdAt: new Date().toISOString() });
  gitOrThrow(['switch', '--quiet', '--create', reviewBranch]);
  for (const file of files) {
    copyFile(path.join(reviewAssets, file), path.join(repoRoot, file));
  }
  gitOrThrow(['add', '--', ...files]);
  gitOrThrow([...identityIfMissing(), '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Add settle claim endpoint']);

  console.log(bold(`Branch ${reviewBranch} is ready (from ${previousBranch})`));
  run('git', ['--no-pager', 'diff', '--stat', 'HEAD~1', 'HEAD']);
  console.log(`
Next - review it:
  VS Code chat:    /review-changes this branch against ${previousBranch}
  Copilot CLI:     /review
  Pull request:    git push -u origin ${reviewBranch}  then open a pull request and add Copilot as a reviewer
Afterwards:        node scripts/demo.mjs review-cleanup`);
}

function reviewCleanup() {
  requireRepository();
  const state = readState();
  const branch = currentBranch();

  if (branch === reviewBranch) {
    const changes = workingTreeChanges();
    if (changes.length > 0) {
      throw new Error(
        `${reviewBranch} has ${changes.length} uncommitted change(s). Discard everything with: node scripts/reset-demo.mjs --yes`,
      );
    }
    const target = [state.previousBranch, 'main', 'master'].find(
      (name) => typeof name === 'string' && name !== reviewBranch && branchExists(name),
    );
    if (!target) {
      throw new Error('Cannot tell which branch to return to. Switch yourself (git switch <branch>), then run this again.');
    }
    gitOrThrow(['switch', '--quiet', target]);
    ok(`Switched back to ${target}`);
  }

  if (branchExists(reviewBranch)) {
    gitOrThrow(['branch', '-D', reviewBranch]);
    ok(`Deleted branch ${reviewBranch}`);
  } else {
    console.log(`Branch ${reviewBranch} does not exist - nothing to delete.`);
  }

  clearState();

  if (git(['rev-parse', '-q', '--verify', `refs/remotes/origin/${reviewBranch}`]).ok) {
    info(dim(`The branch is still on the remote. Delete it with: git push origin --delete ${reviewBranch}`));
  }
}

function requireRepository() {
  if (!isGitInstalled()) {
    throw new Error('git is not installed or not on the PATH.');
  }
  if (!isInsideRepository()) {
    throw new Error('This folder is not a git repository root. Run git init -b main here, then add and commit the files.');
  }
}

/** Commits need a name and email; use a demo identity for this commit only when none is configured. */
function identityIfMissing() {
  const configured = git(['config', 'user.email']).stdout.trim() !== '' && git(['config', 'user.name']).stdout.trim() !== '';
  return configured ? [] : ['-c', 'user.name=ClaimsDesk Demo', '-c', 'user.email=demo@example.com'];
}

try {
  main();
} catch (error) {
  exitWithError(error);
}
