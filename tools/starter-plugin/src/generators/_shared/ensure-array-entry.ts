import { Tree } from '@nx/devkit';

/** Index of the `]` that closes the `[` at `openIndex` (bracket-aware). */
function matchingBracketEnd(source: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    if (source[i] === '[') {
      depth++;
    } else if (source[i] === ']') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  throw new Error('Unbalanced "[" — could not find the closing bracket.');
}

/**
 * Idempotently appends `entry` (an object/array/call literal — possibly
 * containing its own commas) to the array literal that opens at the first
 * match of `opener`. Unlike `ensureArrayItem` this never parses the
 * existing entries, so nested `{ ... }` are safe; idempotency is by
 * `marker` — a substring unique to this entry (e.g. its import path).
 * No-op (returns false) if `marker` is already anywhere in the file.
 */
export function ensureArrayEntry(
  tree: Tree,
  filePath: string,
  opener: RegExp,
  entry: string,
  marker: string,
): boolean {
  const content = tree.read(filePath, 'utf-8');
  if (content === null) {
    throw new Error(`Cannot add an array entry to missing file "${filePath}".`);
  }
  if (content.includes(marker)) {
    return false;
  }

  const match = opener.exec(content);
  if (!match) {
    throw new Error(
      `Could not find ${String(opener)} in "${filePath}".`,
    );
  }

  const openIndex = match.index + match[0].length - 1;
  const closeIndex = matchingBracketEnd(content, openIndex);
  const inner = content.slice(openIndex + 1, closeIndex).replace(/\s*,?\s*$/, '');
  const prefix = inner.trim() === '' ? '' : `${inner},`;

  tree.write(
    filePath,
    `${content.slice(0, openIndex + 1)}${prefix}\n  ${entry},\n${content.slice(closeIndex)}`,
  );
  return true;
}
