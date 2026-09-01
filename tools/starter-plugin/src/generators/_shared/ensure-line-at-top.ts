import { Tree } from '@nx/devkit';

/**
 * Idempotently ensures `line` is present at the top of the file at
 * `filePath` (before any other statement) — for things that must come
 * first, like an SCSS `@use`. No-op (returns false) if a line trimming
 * down to `line` already exists anywhere in the file. Leading block/line
 * comments are kept above the inserted line.
 */
export function ensureLineAtTop(
  tree: Tree,
  filePath: string,
  line: string,
): boolean {
  const content = tree.read(filePath, 'utf-8');
  if (content === null) {
    throw new Error(`Cannot ensure line in missing file "${filePath}".`);
  }

  const lines = content.split('\n');
  if (lines.some((l) => l.trim() === line)) {
    return false;
  }

  // Skip a leading comment block / blank lines so the statement lands just
  // after any file header comment.
  let insertAt = 0;
  let inBlockComment = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (inBlockComment) {
      insertAt = i + 1;
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }
    if (trimmed === '' || trimmed.startsWith('//')) {
      insertAt = i + 1;
      continue;
    }
    if (trimmed.startsWith('/*')) {
      insertAt = i + 1;
      if (!trimmed.includes('*/')) inBlockComment = true;
      continue;
    }
    break;
  }

  lines.splice(insertAt, 0, line);
  tree.write(filePath, lines.join('\n'));
  return true;
}
