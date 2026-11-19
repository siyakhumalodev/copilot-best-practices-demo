import fs from 'node:fs';
import path from 'node:path';

/** Every file below `directory`, as sorted relative paths with forward slashes. Empty when the folder is missing. */
export function listFiles(directory) {
  const files = [];
  const walk = (folder, prefix) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(folder, entry.name), relative);
      } else if (entry.isFile()) {
        files.push(relative);
      }
    }
  };
  if (fs.existsSync(directory)) {
    walk(directory, '');
  }
  return files.sort();
}

/** True when both files exist and have the same bytes. */
export function sameFile(first, second) {
  if (!fs.existsSync(first) || !fs.existsSync(second)) {
    return false;
  }
  return fs.readFileSync(first).equals(fs.readFileSync(second));
}

/** Copies a file, creating the target folder when needed. */
export function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

/** True when `child` is `parent` or inside it. */
export function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

/** Parses JSON that may contain comments and trailing commas (VS Code's JSONC), such as .vscode/mcp.json. */
export function parseJsonc(text) {
  return JSON.parse(removeTrailingCommas(removeComments(text.replace(/^\uFEFF/, ''))));
}

/**
 * Formats JSON with two-space indentation, keeping short arrays of plain values on one line
 * (`"args": ["@playwright/mcp@latest"]`) the way people write VS Code configuration by hand.
 */
export function formatJson(value) {
  return `${format(value, '')}\n`;
}

function format(value, indent) {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const plain = value.every((item) => item === null || typeof item !== 'object');
    const oneLine = `[${value.map((item) => JSON.stringify(item)).join(', ')}]`;
    if (plain && oneLine.length + indent.length <= 100) {
      return oneLine;
    }
    return `[\n${value.map((item) => `${inner}${format(item, inner)}`).join(',\n')}\n${indent}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }
    return `{\n${entries.map(([key, item]) => `${inner}${JSON.stringify(key)}: ${format(item, inner)}`).join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

function removeComments(text) {
  let result = '';
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inString) {
      result += char;
      if (char === '\\') {
        result += next ?? '';
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
    } else if (char === '"') {
      inString = true;
      result += char;
    } else if (char === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') {
        i += 1;
      }
      result += '\n';
    } else if (char === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
        i += 1;
      }
      i += 1;
    } else {
      result += char;
    }
  }
  return result;
}

function removeTrailingCommas(text) {
  let result = '';
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      result += char;
      if (char === '\\') {
        result += text[i + 1] ?? '';
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === ',') {
      const rest = text.slice(i + 1).trimStart();
      if (rest.startsWith('}') || rest.startsWith(']')) {
        continue;
      }
    }
    result += char;
  }
  return result;
}
