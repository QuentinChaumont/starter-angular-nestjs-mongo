import { Tree } from '@nx/devkit';

/**
 * Idempotently ensures `item` appears inside the array literal that follows
 * `arrayName:` (e.g. `imports: [...]` in a `@Module({...})` decorator) in
 * the file at `filePath`. No-op (returns false) if already present.
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

  const arrayRegex = new RegExp(`${arrayName}:\\s*\\[([^\\]]*)\\]`);
  const match = content.match(arrayRegex);
  if (!match) {
    throw new Error(`Could not find "${arrayName}: [...]" in "${filePath}".`);
  }

  const existingItems = match[1]
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (existingItems.includes(item)) {
    return false;
  }

  existingItems.push(item);
  const newArray = `${arrayName}: [${existingItems.join(', ')}]`;
  tree.write(filePath, content.replace(match[0], newArray));
  return true;
}
