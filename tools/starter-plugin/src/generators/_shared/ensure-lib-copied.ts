import { Tree } from '@nx/devkit';
import { copySourceDirectory } from './copy-source-directory';

/**
 * Copies `sourceLibRoot` into `libRoot` in the tree if a lib isn't already
 * there (detected via its package.json). No-op if already present.
 */
export function ensureLibCopied(
  tree: Tree,
  libRoot: string,
  sourceLibRoot: string,
): void {
  if (tree.exists(`${libRoot}/package.json`)) {
    return;
  }
  copySourceDirectory(tree, sourceLibRoot, libRoot);
}
