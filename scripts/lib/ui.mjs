import readline from 'node:readline/promises';
import { parseArgs } from 'node:util';

const useColour = Boolean(process.stdout.isTTY) && !('NO_COLOR' in process.env);
const paint = (code) => (text) => (useColour ? `\u001b[${code}m${text}\u001b[0m` : String(text));

export const bold = paint('1');
export const dim = paint('2');
export const green = paint('32');
export const red = paint('31');
export const yellow = paint('33');

export const tick = '✓';
export const cross = '✗';

export const ok = (text) => console.log(`  ${green(tick)} ${text}`);
export const fail = (text) => console.log(`  ${red(cross)} ${text}`);
export const warn = (text) => console.log(`  ${yellow('!')} ${text}`);
export const info = (text) => console.log(`    ${text}`);

/** Prints the error message (no stack trace - these scripts run live) and exits with code 1. */
export function exitWithError(error) {
  console.error(`\n${red('Error:')} ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

/** Asks a yes/no question. Anything but y or yes is no; without a terminal the answer is no. */
export async function confirm(question) {
  if (!process.stdin.isTTY) {
    return false;
  }
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await prompt.question(`${question} [y/N] `)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    prompt.close();
  }
}

/**
 * Parses command-line options with node:util parseArgs. Prints the usage and exits on --help (code 0)
 * or on an unknown or malformed option (code 2).
 */
export function parseCommandLine(usage, options, { allowPositionals = false } = {}) {
  try {
    const parsed = parseArgs({
      options: { ...options, help: { type: 'boolean', short: 'h' } },
      allowPositionals,
      strict: true,
    });
    if (parsed.values.help) {
      console.log(usage);
      process.exit(0);
    }
    return parsed;
  } catch (error) {
    console.error(`${error instanceof Error ? error.message : String(error)}\n\n${usage}`);
    process.exit(2);
  }
}
