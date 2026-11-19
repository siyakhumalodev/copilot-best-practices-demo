import fs from 'node:fs';
import path from 'node:path';
import { run } from './process.mjs';
import { localConfigFiles, repoRoot } from './repo.mjs';

/** Runs git and captures its output. Never throws; check `ok`. */
export function git(args, { cwd = repoRoot } = {}) {
  return run('git', args, { cwd, capture: true });
}

/** Runs git and returns its output unchanged, or throws with git's own message. */
export function gitOrThrow(args, { cwd = repoRoot } = {}) {
  const result = git(args, { cwd });
  if (!result.ok) {
    const message = (result.stderr || result.stdout || result.error?.message || '').trim();
    throw new Error(`git ${args.join(' ')} failed${message ? `:\n${message}` : '.'}`);
  }
  return result.stdout;
}

export function isGitInstalled() {
  return git(['--version']).ok;
}

/** Accepts this worktree root, including filesystem aliases, but not an enclosing repository. */
export function isInsideRepository(cwd = repoRoot) {
  const result = git(['rev-parse', '--show-toplevel'], { cwd });
  return result.ok && path.relative(fs.realpathSync.native(cwd), fs.realpathSync.native(result.stdout.trim())) === '';
}

export function tagExists(tag) {
  return git(['rev-parse', '-q', '--verify', `refs/tags/${tag}`]).ok;
}

export function branchExists(branch) {
  return git(['rev-parse', '-q', '--verify', `refs/heads/${branch}`]).ok;
}

/** The current branch name, or null on a detached HEAD. */
export function currentBranch() {
  const result = git(['symbolic-ref', '--quiet', '--short', 'HEAD']);
  return result.ok ? result.stdout.trim() : null;
}

/** Local branch names matching a pattern such as "demo/*". */
export function localBranches(pattern) {
  return git(['branch', '--list', pattern, '--format=%(refname:short)'])
    .stdout.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** True when `path` exists in the given commit or tag. */
export function existsInRevision(revision, path) {
  return git(['cat-file', '-e', `${revision}:${path}`]).ok;
}

/**
 * Uncommitted changes as `git status --porcelain` lines (" M src/x.cs", "?? reports/y.md").
 * Local MCP configuration is ignored unless includeLocalConfig is set.
 */
export function workingTreeChanges({ paths = [], includeLocalConfig = false } = {}) {
  const args = ['status', '--porcelain=v1', '--untracked-files=all'];
  if (paths.length > 0) {
    args.push('--', ...paths);
  }
  const lines = git(args)
    .stdout.split(/\r?\n/)
    .filter((line) => line.trim() !== '');
  return includeLocalConfig ? lines : lines.filter((line) => !localConfigFiles.includes(changedPath(line)));
}

/** The path in a porcelain status line (the new path for a rename). */
export function changedPath(statusLine) {
  const entry = statusLine.slice(3);
  const arrow = entry.indexOf(' -> ');
  return (arrow >= 0 ? entry.slice(arrow + 4) : entry).replace(/^"|"$/g, '');
}
