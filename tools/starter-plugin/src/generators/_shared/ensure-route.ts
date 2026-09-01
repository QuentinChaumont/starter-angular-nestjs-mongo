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
 * Idempotently appends a route object literal to the `appRoutes` array
 * (`export const appRoutes: Route[] = [ ... ]`), keeping declaration order.
 * No-op (returns false) if `marker` — a substring unique to this route,
 * e.g. `m.LoginPage` — is already present (substring, not exact match, so
 * re-runs stay no-ops after `formatFiles` reflows the literal).
 */
export function ensureRoute(
  tree: Tree,
  filePath: string,
  routeLiteral: string,
  marker: string,
): boolean {
  const content = tree.read(filePath, 'utf-8');
  if (content === null) {
    throw new Error(`Cannot add a route to missing file "${filePath}".`);
  }
  if (content.includes(marker)) {
    return false;
  }

  const opener = /export const appRoutes\s*:[^=]*=\s*\[/.exec(content);
  if (!opener) {
    throw new Error(`Could not find the "appRoutes" array in "${filePath}".`);
  }

  const openIndex = opener.index + opener[0].length - 1;
  const closeIndex = matchingBracketEnd(content, openIndex);
  const inner = content
    .slice(openIndex + 1, closeIndex)
    .replace(/\s*,?\s*$/, '');
  const prefix = inner.trim() === '' ? '' : `${inner},`;

  tree.write(
    filePath,
    `${content.slice(0, openIndex + 1)}${prefix}\n  ${routeLiteral},\n${content.slice(closeIndex)}`,
  );
  return true;
}
