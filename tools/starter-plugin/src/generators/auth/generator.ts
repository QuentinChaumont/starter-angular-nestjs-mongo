import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
} from '@nx/devkit';
import { join } from 'path';
import { copySourceDirectory } from '../_shared/copy-source-directory';
import { ensureArrayItem } from '../_shared/ensure-array-item';
import { ensureNamedImport } from '../_shared/ensure-named-import';
import { readPackageDependencies } from '../_shared/read-package-dependencies';

const LIB_ROOT = 'libs/backend/auth';
const SOURCE_LIB_ROOT = join(__dirname, '../../../../../', LIB_ROOT);
const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';

/**
 * Adds the JWT auth brick. `AuthModule` logs users in against the `user`
 * feature entity (see V1.md step 13), so this brick only makes sense once
 * both Mongo and a `user` entity exist — this checks for both up front and
 * fails with an actionable message rather than generating code that can't
 * compile. Idempotent — safe to run again once installed.
 */
export default async function authGenerator(
  tree: Tree,
): Promise<GeneratorCallback> {
  if (!tree.exists('libs/backend/database/mongo/package.json')) {
    throw new Error(
      'Auth requires the Mongo brick (AuthModule logs users in against Mongo-backed data). Run `nx g @org/starter-plugin:mongo` first.',
    );
  }
  if (!tree.exists('libs/backend/features/user/src/lib/user.module.ts')) {
    throw new Error(
      'Auth requires a "user" feature entity with CRUD (AuthModule logs users in against it). Run `nx g @org/starter-plugin:entity user --crud` first.',
    );
  }

  const alreadyPresent = tree.exists(`${LIB_ROOT}/package.json`);
  if (!alreadyPresent) {
    copySourceDirectory(tree, SOURCE_LIB_ROOT, LIB_ROOT);
  }

  const installTask = addDependenciesToPackageJson(
    tree,
    readPackageDependencies(SOURCE_LIB_ROOT),
    {},
  );

  ensureNamedImport(tree, APP_MODULE_PATH, 'AuthModule', '@org/backend-auth');
  ensureArrayItem(tree, APP_MODULE_PATH, 'imports', 'AuthModule');

  await formatFiles(tree);

  return installTask;
}
