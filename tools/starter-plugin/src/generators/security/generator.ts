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
import { ensureLineAfterAnchor } from '../_shared/ensure-line-after-anchor';
import { ensureNamedImport } from '../_shared/ensure-named-import';
import { pickPackageDependencies } from '../_shared/read-package-dependencies';

const CORE_LIB_ROOT = 'libs/backend/core';
const SOURCE_CORE_ROOT = join(__dirname, '../../../../../', CORE_LIB_ROOT);
const SECURITY_SUBPATH = 'src/lib/security';
const CORE_INDEX_PATH = `${CORE_LIB_ROOT}/src/index.ts`;
const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';
const MAIN_TS_PATH = 'apps/backend/src/main.ts';

/**
 * Adds the HTTP security brick (Helmet, CORS, rate limiting). Lives inside
 * `backend-core` (see V1.md step 15), so this copies just the `security/`
 * subfolder into the already-present core lib, rather than a whole new lib.
 * Idempotent — safe to run again once installed.
 */
export default async function securityGenerator(
  tree: Tree,
): Promise<GeneratorCallback> {
  const targetSecurityPath = `${CORE_LIB_ROOT}/${SECURITY_SUBPATH}`;
  const alreadyPresent = tree.exists(`${targetSecurityPath}/setup-security.ts`);
  if (!alreadyPresent) {
    copySourceDirectory(
      tree,
      join(SOURCE_CORE_ROOT, SECURITY_SUBPATH),
      targetSecurityPath,
    );
  }

  const installTask = addDependenciesToPackageJson(
    tree,
    pickPackageDependencies(SOURCE_CORE_ROOT, ['helmet', '@nestjs/throttler']),
    {},
  );

  ensureExportLine(tree, CORE_INDEX_PATH, `./${SECURITY_SUBPATH.replace('src/', '')}`);

  ensureNamedImport(
    tree,
    APP_MODULE_PATH,
    'AppSecurityModule',
    '@org/backend-core',
  );
  ensureArrayItem(tree, APP_MODULE_PATH, 'imports', 'AppSecurityModule');

  ensureNamedImport(tree, MAIN_TS_PATH, 'setupSecurity', '@org/backend-core');
  ensureNamedImport(tree, MAIN_TS_PATH, 'ThrottlerGuard', '@nestjs/throttler');
  ensureLineAfterAnchor(
    tree,
    MAIN_TS_PATH,
    'app.useLogger(logger);',
    'setupSecurity(app);',
  );
  ensureLineAfterAnchor(
    tree,
    MAIN_TS_PATH,
    'setupSecurity(app);',
    'app.useGlobalGuards(app.get(ThrottlerGuard));',
  );

  await formatFiles(tree);

  return installTask;
}
