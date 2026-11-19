import { spawnSync } from 'node:child_process';
import { repoRoot } from './repo.mjs';

const isWindows = process.platform === 'win32';

/**
 * Runs a command to completion.
 * npm and npx are .cmd files on Windows, which Node only starts through the shell, so they go through it there.
 *
 * @param {string} command
 * @param {string[]} [args]
 * @param {{ cwd?: string, capture?: boolean, env?: Record<string, string> }} [options]
 *   capture: return stdout/stderr instead of printing them.
 * @returns {{ ok: boolean, status: number | null, stdout: string, stderr: string, error?: Error }}
 */
export function run(command, args = [], { cwd = repoRoot, capture = false, env } = {}) {
  const options = {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  };
  const result =
    isWindows && (command === 'npm' || command === 'npx')
      ? spawnSync([command, ...args.map(quoteForShell)].join(' '), { ...options, shell: true })
      : spawnSync(command, args, options);
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error,
  };
}

/** True when `<command> --version` (or the given arguments) runs successfully. */
export function canRun(command, args = ['--version']) {
  return run(command, args, { capture: true }).ok;
}

/** The last lines of a failed command's output, for an error message. */
export function outputTail(result, lines = 15) {
  const text = `${result.stdout}\n${result.stderr}`.trim() || result.error?.message || '';
  return text.split(/\r?\n/).slice(-lines).join('\n');
}

function quoteForShell(arg) {
  return /^[\w@%+=:,./\\-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '\\"')}"`;
}
