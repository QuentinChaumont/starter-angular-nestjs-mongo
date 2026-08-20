import { Tree } from '@nx/devkit';

/**
 * Idempotently inserts a `statement` (no leading/trailing whitespace, e.g.
 * `"setupSecurity(app);"`) right after the first line containing `anchor`
 * in the file at `filePath`, matching that line's indentation. No-op
 * (returns false) if a line trimming down to `statement` already exists
 * anywhere in the file — trimmed comparison so this stays correct even
 * after `formatFiles` reformats indentation between generator runs.
 */
export function ensureLineAfterAnchor(
  tree: Tree,
  filePath: string,
  anchor: string,
  statement: string,
): boolean {
  const content = tree.read(filePath, 'utf-8');
  if (content === null) {
    throw new Error(`Cannot ensure line in missing file "${filePath}".`);
  }

  const lines = content.split('\n');
  if (lines.some((l) => l.trim() === statement)) {
    return false;
  }

  const anchorIndex = lines.findIndex((l) => l.includes(anchor));
  if (anchorIndex === -1) {
    throw new Error(`Could not find anchor "${anchor}" in "${filePath}".`);
  }

  const anchorIndent = lines[anchorIndex].match(/^\s*/)?.[0] ?? '';
  lines.splice(anchorIndex + 1, 0, `${anchorIndent}${statement}`);
  tree.write(filePath, lines.join('\n'));
  return true;
}
