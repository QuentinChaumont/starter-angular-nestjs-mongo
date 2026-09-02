import { Tree, updateJson } from '@nx/devkit';

/**
 * Idempotently adds `{ "path": <refPath> }` to a tsconfig's `references`.
 * `nx sync` maintains most project references from the import graph, but it
 * misses a lib that is only reached through a lazy `import()` in a file
 * that `tsconfig.spec.json` also compiles — add that one by hand.
 */
export function ensureProjectReference(
  tree: Tree,
  tsconfigPath: string,
  refPath: string,
): void {
  if (!tree.exists(tsconfigPath)) {
    return;
  }
  updateJson(tree, tsconfigPath, (json) => {
    const references: { path: string }[] = json.references ?? [];
    if (!references.some((ref) => ref.path === refPath)) {
      references.push({ path: refPath });
    }
    json.references = references;
    return json;
  });
}
