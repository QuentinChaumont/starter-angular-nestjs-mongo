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
const LIB_ROOT = 'libs/backend/mailer';
const SOURCE_LIB_ROOT = join(WORKSPACE_ROOT, LIB_ROOT);
const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';

/**
 * Adds the transactional-email brick: `MailerService` + a pluggable
 * `MailTransport` (console by default, SMTP when `SMTP_URL` is set). No
 * external dependency and no network until SMTP is configured — see
 * `libs/backend/mailer/README.md`. Idempotent — safe to run again once
 * installed.
 */
export default async function mailerGenerator(
  tree: Tree,
): Promise<GeneratorCallback> {
  ensureLibCopied(tree, LIB_ROOT, SOURCE_LIB_ROOT);

  const installTask = addDependenciesToPackageJson(
    tree,
    readPackageDependencies(SOURCE_LIB_ROOT),
    {},
  );

  ensureNamedImport(tree, APP_MODULE_PATH, 'MailerModule', '@org/backend-mailer');
  ensureArrayItem(tree, APP_MODULE_PATH, 'imports', 'MailerModule');

  await formatFiles(tree);

  return installTask;
}
