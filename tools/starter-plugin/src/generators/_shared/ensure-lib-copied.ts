import { Tree } from '@nx/devkit';
import { copySourceDirectory } from './copy-source-directory';

/**
 * Copies `sourceLibRoot` into `libRoot` in the tree if a lib isn't already
 * there. Presence is detected via `markerFile` — `package.json` for the
 * npm-workspace backend libs, `project.json` for the frontend libs (which
 * aren't npm packages). No-op if already present.
 */
export function ensureLibCopied(
  tree: Tree,
  libRoot: string,
  sourceLibRoot: string,
  markerFile = 'package.json',
): void {
  if (tree.exists(`${libRoot}/${markerFile}`)) {
    return;
  }
  copySourceDirectory(tree, sourceLibRoot, libRoot);
}
