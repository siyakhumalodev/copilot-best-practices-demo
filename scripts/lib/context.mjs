import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './repo.mjs';

/** The repository context that `demo.mjs context-off` moves aside for the "insufficient context" demo. */
export const contextItems = ['.github/copilot-instructions.md', '.github/instructions', '.github/skills', 'AGENTS.md'];

/** Where context-off parks the items (git-ignored). */
export const disabledFolder = path.join(repoRoot, '.demo-disabled');

/** The items currently parked in .demo-disabled/. */
export function parkedItems() {
  return contextItems.filter((item) => fs.existsSync(path.join(disabledFolder, item)));
}

/** Moves every context item that exists into .demo-disabled/. Returns the items moved. */
export function disableContext() {
  const moved = [];
  for (const item of contextItems) {
    const from = path.join(repoRoot, item);
    const to = path.join(disabledFolder, item);
    if (!fs.existsSync(from) || fs.existsSync(to)) {
      continue;
    }
    moveItem(from, to);
    moved.push(item);
  }
  return moved;
}

/**
 * Moves parked items back into the repository and removes .demo-disabled/. A parked item replaces anything created
 * at the same path in the meantime, so the repository gets its own context back. Returns the items restored.
 */
export function enableContext() {
  const restored = [];
  for (const item of parkedItems()) {
    const from = path.join(disabledFolder, item);
    const to = path.join(repoRoot, item);
    fs.rmSync(to, { recursive: true, force: true });
    moveItem(from, to);
    restored.push(item);
  }
  fs.rmSync(disabledFolder, { recursive: true, force: true });
  return restored;
}

/** Moves a file or folder. Falls back to copy and delete when a rename is refused (another volume, or a file in use). */
function moveItem(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try {
    fs.renameSync(from, to);
  } catch {
    fs.cpSync(from, to, { recursive: true });
    fs.rmSync(from, { recursive: true, force: true });
  }
}
