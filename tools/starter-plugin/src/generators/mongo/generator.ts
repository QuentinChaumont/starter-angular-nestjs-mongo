import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
} from '@nx/devkit';
import { join } from 'path';
import { ensureArrayItem } from '../_shared/ensure-array-item';
import { ensureLibCopied } from '../_shared/ensure-lib-copied';
import { ensureNamedImport } from '../_shared/ensure-named-import';
import { readPackageDependencies } from '../_shared/read-package-dependencies';

const WORKSPACE_ROOT = join(__dirname, '../../../../../');
const LIB_ROOT = 'libs/backend/database/mongo';
const SOURCE_LIB_ROOT = join(WORKSPACE_ROOT, LIB_ROOT);
const TESTING_LIB_ROOT = 'libs/backend/testing';
const SOURCE_TESTING_LIB_ROOT = join(WORKSPACE_ROOT, TESTING_LIB_ROOT);
const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';

/**
 * Adds the Mongo brick to the app: the connection module (with its
 * `/health/ready` readiness route, independent of whether `health` is also
 * installed) plus the generic `BaseRepository<T>` features build on. Also
 * brings along `backend-testing`, since Mongo's own spec files depend on it
 * (`startTestMongo`, etc.) — see V1.md step 18. Idempotent — safe to run
 * again once installed.
 */
export default async function mongoGenerator(
  tree: Tree,
): Promise<GeneratorCallback> {
  ensureLibCopied(tree, LIB_ROOT, SOURCE_LIB_ROOT);
  ensureLibCopied(tree, TESTING_LIB_ROOT, SOURCE_TESTING_LIB_ROOT);

  const installTask = addDependenciesToPackageJson(
    tree,
    {
      ...readPackageDependencies(SOURCE_LIB_ROOT),
      ...readPackageDependencies(SOURCE_TESTING_LIB_ROOT),
    },
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
