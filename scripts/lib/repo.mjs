import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path of the repository root (the folder that contains scripts/). */
export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The git tag that marks the clean demo baseline. */
export const baselineTag = 'demo-baseline';

/** Folders that reset-demo.mjs puts back to the baseline. */
export const resetPaths = ['src', 'tests', 'reports', '.github', 'work-items'];

/** Local MCP configuration, customised with setup.mjs --ado-org ..., does not count as an exercise change. */
export const localConfigFiles = ['.vscode/mcp.json', '.mcp.json'];

/** The branch prefix used by the review demo (demo.mjs review-setup). */
export const demoBranchPrefix = 'demo/';

const statePath = path.join(repoRoot, '.demo-state.json');

/** Converts an absolute path to a repository-relative path with forward slashes. */
export function toRepoPath(absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join('/');
}

/** Demo state shared by demo.mjs and reset-demo.mjs (.demo-state.json, git-ignored). */
export function readState() {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return {};
  }
}

export function writeState(state) {
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

export function clearState() {
  fs.rmSync(statePath, { force: true });
}
