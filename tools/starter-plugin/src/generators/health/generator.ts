import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
} from '@nx/devkit';
import { join } from 'path';
import { copySourceDirectory } from '../_shared/copy-source-directory';
import { ensureArrayItem } from '../_shared/ensure-array-item';
import { ensureExportLine } from '../_shared/ensure-export-line';
import { ensureNamedImport } from '../_shared/ensure-named-import';
import { pickPackageDependencies } from '../_shared/read-package-dependencies';

const CORE_LIB_ROOT = 'libs/backend/core';
const SOURCE_CORE_ROOT = join(__dirname, '../../../../../', CORE_LIB_ROOT);
const HEALTH_SUBPATH = 'src/lib/health';
const CORE_INDEX_PATH = `${CORE_LIB_ROOT}/src/index.ts`;
const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';

/**
 * Adds the liveness healthcheck (GET /health/live). Lives inside
 * `backend-core` (see V1.md step 16), so this copies just the `health/`
 * subfolder into the already-present core lib. Readiness (GET /health/ready)
 * is a separate, Mongo-specific route contributed by the `mongo` brick, not
 * this one — see MongoReadinessController. Idempotent.
 */
export default async function healthGenerator(
  tree: Tree,
): Promise<GeneratorCallback> {
  const targetHealthPath = `${CORE_LIB_ROOT}/${HEALTH_SUBPATH}`;
  const alreadyPresent = tree.exists(`${targetHealthPath}/health.module.ts`);
  if (!alreadyPresent) {
    copySourceDirectory(
      tree,
      join(SOURCE_CORE_ROOT, HEALTH_SUBPATH),
      targetHealthPath,
    );
  }

  const installTask = addDependenciesToPackageJson(
    tree,
    pickPackageDependencies(SOURCE_CORE_ROOT, ['@nestjs/terminus']),
    {},
  );

  ensureExportLine(tree, CORE_INDEX_PATH, `./${HEALTH_SUBPATH.replace('src/', '')}`);

  ensureNamedImport(tree, APP_MODULE_PATH, 'HealthModule', '@org/backend-core');
  ensureArrayItem(tree, APP_MODULE_PATH, 'imports', 'HealthModule');

  await formatFiles(tree);

  return installTask;
}
