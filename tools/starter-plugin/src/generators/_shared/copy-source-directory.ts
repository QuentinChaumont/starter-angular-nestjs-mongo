import { Tree } from '@nx/devkit';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const EXCLUDED_ENTRIES = new Set([
  'node_modules',
  'dist',
  'out-tsc',
  '.nx',
  'test-output',
]);

/**
 * Copies a real, already-built lib directory from disk into the generator's
 * virtual `Tree`, verbatim. These bricks (Mongo, Auth, ...) aren't
 * name-parameterized templates like `feature`/`entity` — there's exactly one
 * instance of each in the starter — so the actual committed source *is* the
 * template. This keeps the generator and the lib permanently in sync with
 * zero duplication.
 */
export function copySourceDirectory(
  tree: Tree,
  sourceDir: string,
  targetDir: string,
): void {
  for (const entry of readdirSync(sourceDir)) {
    if (EXCLUDED_ENTRIES.has(entry)) {
      continue;
    }

    const sourcePath = join(sourceDir, entry);
    const targetPath = join(targetDir, entry);

    if (statSync(sourcePath).isDirectory()) {
      copySourceDirectory(tree, sourcePath, targetPath);
    } else {
      tree.write(targetPath, readFileSync(sourcePath));
    }
  }
}
