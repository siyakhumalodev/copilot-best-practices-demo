// Restores the starting point between exercises.
//
//   node scripts/reset-demo.mjs          asks before discarding anything
//   node scripts/reset-demo.mjs --yes    no question
//
// 1. Moves back anything `demo.mjs context-off` moved aside.
// 2. On a demo/* branch: returns to the branch you were on before `demo.mjs review-setup`. Deletes local demo/* branches.
// 3. Restores src/, tests/, reports/, .github/ and work-items/ to the demo-baseline tag and removes new files there.
// Everything else is left alone: .vscode/, .mcp.json, scripts/, docs/, node_modules, bin/ and obj/.

import {
  branchExists,
  currentBranch,
  existsInRevision,
  git,
  gitOrThrow,
  isGitInstalled,
  isInsideRepository,
  localBranches,
  tagExists,
} from './lib/git.mjs';
import { enableContext, parkedItems } from './lib/context.mjs';
import { baselineTag, clearState, demoBranchPrefix, readState, resetPaths } from './lib/repo.mjs';
import { bold, confirm, dim, exitWithError, info, ok, parseCommandLine } from './lib/ui.mjs';

const usage = `Usage: node scripts/reset-demo.mjs [--yes]

Restores ${resetPaths.map((folder) => `${folder}/`).join(', ')} to the '${baselineTag}' tag, turns repository
context back on, and leaves and deletes demo/* branches. Local MCP configuration, node_modules and build output
are kept.

  -y, --yes   Do not ask for confirmation.`;

// An untracked lock file is created by the first npm install; cleaning must never delete it.
const keepUntracked = 'package-lock.json';

async function main() {
  const { values } = parseCommandLine(usage, { yes: { type: 'boolean', short: 'y' } });
  checkRepository();

  const branch = currentBranch();
  const onDemoBranch = branch !== null && branch.startsWith(demoBranchPrefix);
  const demoBranches = localBranches(`${demoBranchPrefix}*`);
  const parked = parkedItems();
  const differences = changedSinceBaseline();

  console.log(bold(`Reset to '${baselineTag}'`));
  if (differences.length === 0 && parked.length === 0 && !onDemoBranch && demoBranches.length === 0) {
    clearState();
    console.log('  Already at the baseline - nothing to do.');
    return 0;
  }

  if (parked.length > 0) {
    info(`Context is off: ${parked.join(', ')} will be moved back.`);
  }
  if (onDemoBranch) {
    info(`On ${branch}: will switch back to ${returnBranch()}.`);
  }
  if (demoBranches.length > 0) {
    info(`Branches to delete: ${demoBranches.join(', ')}`);
  }
  if (differences.length > 0) {
    info(`${differences.length} path(s) differ from the baseline:`);
    for (const line of differences.slice(0, 12)) {
      info(dim(`  ${line}`));
    }
    if (differences.length > 12) {
      info(dim(`  ... and ${differences.length - 12} more`));
    }
  }

  if (!values.yes) {
    if (!process.stdin.isTTY) {
      throw new Error('Not running in a terminal. Re-run with --yes to confirm.');
    }
    if (!(await confirm('\nDiscard all of this?'))) {
      console.log('Cancelled - nothing changed.');
      return 1;
    }
  }

  console.log('');
  if (parked.length > 0) {
    ok(`Context restored: ${enableContext().join(', ')}`);
  }

  if (onDemoBranch) {
    const target = returnBranch();
    // Discard this branch's uncommitted work in the demo folders first, so the switch cannot conflict.
    restorePaths('HEAD');
    gitOrThrow(['switch', '--quiet', target]);
    ok(`Switched from ${branch} to ${target}`);
  }

  for (const demoBranch of localBranches(`${demoBranchPrefix}*`)) {
    gitOrThrow(['branch', '-D', demoBranch]);
    ok(`Deleted branch ${demoBranch}`);
  }

  restorePaths(baselineTag);
  clearState();
  ok(`Restored ${resetPaths.map((folder) => `${folder}/`).join(', ')} to '${baselineTag}'`);

  console.log('\nBaseline restored.');
  console.log(dim('If you changed C# code and the API runs with `dotnet run`, restart it (its in-memory data resets too).'));
  return 0;
}

function checkRepository() {
  if (!isGitInstalled()) {
    throw new Error('git is not installed or not on the PATH.');
  }
  if (!isInsideRepository()) {
    throw new Error('This folder is not a git repository root. Run git init -b main here, then add and commit the files.');
  }
  if (!tagExists(baselineTag)) {
    throw new Error(`Tag '${baselineTag}' not found. Make an initial commit, then tag the clean baseline: git tag ${baselineTag}`);
  }
}

/** Files in the demo folders that differ from the baseline tag, as "M path" / "?? path" lines. */
function changedSinceBaseline() {
  const tracked = git(['diff', '--name-status', baselineTag, '--', ...resetPaths])
    .stdout.split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.replace(/\t/g, ' '));
  return [...tracked, ...untrackedFiles().map((file) => `?? ${file}`)];
}

/** New, not ignored files in the demo folders (the npm lock file excepted). */
function untrackedFiles() {
  return git(['ls-files', '--others', '--exclude-standard', '--', ...resetPaths])
    .stdout.split(/\r?\n/)
    .filter((file) => file && !file.endsWith(keepUntracked));
}

/** Makes the demo folders match `revision`: unstages, restores tracked files and deletes untracked ones. */
function restorePaths(revision) {
  // Unstage first, so files added with `git add` become untracked and are cleaned below.
  const known = resetPaths.filter((folder) => existsInRevision('HEAD', folder));
  if (known.length > 0) {
    gitOrThrow(['reset', '--quiet', '--', ...known]);
  }
  const inRevision = resetPaths.filter((folder) => existsInRevision(revision, folder));
  const folders = [...new Set([...known, ...inRevision])];
  if (folders.length > 0) {
    gitOrThrow(['restore', '--source', revision, '--staged', '--worktree', '--', ...folders]);
  }
  // git clean exits non-zero when it cannot delete something (on Windows, often a file another program holds open).
  if (!git(['clean', '-fdq', '-e', keepUntracked, '--', ...resetPaths]).ok) {
    const left = untrackedFiles();
    if (left.length > 0) {
      throw new Error(`Could not delete ${left.length} new file(s), for example ${left[0]}. Close the program using it, then run this again.`);
    }
  }
}

/** The branch to return to from a demo branch: the one recorded by review-setup, else main or master. */
function returnBranch() {
  const previous = readState().previousBranch;
  if (typeof previous === 'string' && !previous.startsWith(demoBranchPrefix) && branchExists(previous)) {
    return previous;
  }
  const fallback = ['main', 'master'].find((name) => branchExists(name));
  if (!fallback) {
    throw new Error('Cannot tell which branch to return to. Switch yourself (git switch <branch>), then run this again.');
  }
  return fallback;
}

main().then(
  (exitCode) => process.exit(exitCode),
  (error) => exitWithError(error),
);
