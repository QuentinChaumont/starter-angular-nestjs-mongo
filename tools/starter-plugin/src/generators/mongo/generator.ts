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

const LIB_ROOT = 'libs/backend/database/mongo';
const SOURCE_LIB_ROOT = join(__dirname, '../../../../../', LIB_ROOT);
const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';

/**
 * Adds the Mongo brick to the app: the connection module (with its
 * `/health/ready` readiness route, independent of whether `health` is also
 * installed) plus the generic `BaseRepository<T>` features build on.
 * Idempotent — safe to run again once installed.
 */
export default async function mongoGenerator(
  tree: Tree,
): Promise<GeneratorCallback> {
  const alreadyPresent = tree.exists(`${LIB_ROOT}/package.json`);
  if (!alreadyPresent) {
    copySourceDirectory(tree, SOURCE_LIB_ROOT, LIB_ROOT);
  }

  const installTask = addDependenciesToPackageJson(
    tree,
    readPackageDependencies(SOURCE_LIB_ROOT),
    {},
  );

  ensureNamedImport(
    tree,
    APP_MODULE_PATH,
    'MongoModule',
    '@org/backend-database-mongo',
  );
  ensureArrayItem(tree, APP_MODULE_PATH, 'imports', 'MongoModule');

  await formatFiles(tree);

  return installTask;
}
