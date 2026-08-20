import { Tree } from '@nx/devkit';

/**
 * Idempotently ensures `export * from '${exportPath}';` exists in the
 * barrel file at `filePath`. No-op (returns false) if already present.
 */
export function ensureExportLine(
  tree: Tree,
  filePath: string,
  exportPath: string,
): boolean {
  const content = tree.read(filePath, 'utf-8');
  if (content === null) {
    throw new Error(`Cannot ensure export line in missing file "${filePath}".`);
  }

  const line = `export * from '${exportPath}';`;
  if (content.includes(line)) {
    return false;
  }

  const withTrailingNewline = content.endsWith('\n') ? content : `${content}\n`;
  tree.write(filePath, `${withTrailingNewline}${line}\n`);
  return true;
}
