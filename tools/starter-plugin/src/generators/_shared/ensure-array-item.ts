import { Tree } from '@nx/devkit';

/** Index just past the `]` that closes the `[` at `openIndex`. */
function matchingBracketEnd(source: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === '[') {
      depth++;
    } else if (ch === ']') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  throw new Error('Unbalanced "[" — could not find the closing bracket.');
}

/**
 * Idempotently appends `item` to the array literal that follows
 * `arrayName:` (e.g. `imports: [...]` in a `@Module({...})` decorator, or
 * `providers: [...]` in an `ApplicationConfig`). Bracket-aware, so it
 * handles entries that themselves contain arrays
 * (`provideHttpClient(withInterceptors([...]))`). No-op (returns false) if
 * a top-level entry already equals `item`.
 */
export function ensureArrayItem(
  tree: Tree,
  filePath: string,
  arrayName: string,
  item: string,
): boolean {
  const content = tree.read(filePath, 'utf-8');
  if (content === null) {
    throw new Error(`Cannot ensure array item in missing file "${filePath}".`);
  }

  const opener = new RegExp(`${arrayName}\\s*:\\s*\\[`).exec(content);
  if (!opener) {
    throw new Error(`Could not find "${arrayName}: [...]" in "${filePath}".`);
  }

  const openIndex = opener.index + opener[0].length - 1;
  const closeIndex = matchingBracketEnd(content, openIndex);
  const inner = content.slice(openIndex + 1, closeIndex);

  // Split on top-level commas only.
  const items: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of inner) {
    if (ch === '[' || ch === '(') depth++;
    else if (ch === ']' || ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      items.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    items.push(current.trim());
  }

  if (items.includes(item)) {
    return false;
  }
  items.push(item);

  tree.write(
    filePath,
    `${content.slice(0, openIndex + 1)}${items.join(', ')}${content.slice(closeIndex)}`,
  );
  return true;
}
