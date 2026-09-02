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
import { ensureLibCopied } from '../_shared/ensure-lib-copied';
import { ensureLineAfterAnchor } from '../_shared/ensure-line-after-anchor';
import { ensureLineAtTop } from '../_shared/ensure-line-at-top';
import { ensureNamedImport } from '../_shared/ensure-named-import';
import { ensureRoute } from '../_shared/ensure-route';
import { readPackageDependencies } from '../_shared/read-package-dependencies';

const WORKSPACE_ROOT = join(__dirname, '../../../../../');
const LIB_ROOT = 'libs/backend/auth-reset';
const SOURCE_LIB_ROOT = join(WORKSPACE_ROOT, LIB_ROOT);

const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';

const FRONTEND_AUTH_LIB = 'libs/frontend/auth';
const FRONTEND_RESET_SUBDIR = 'src/lib/reset';
const SOURCE_FRONTEND_RESET = join(
  WORKSPACE_ROOT,
  FRONTEND_AUTH_LIB,
  FRONTEND_RESET_SUBDIR,
);
const FRONTEND_AUTH_INDEX = `${FRONTEND_AUTH_LIB}/src/index.ts`;
const APP_ROUTES_PATH = 'apps/frontend/src/app/app.routes.ts';
const APP_COMPONENT_PATH = 'apps/frontend/src/app/app.ts';
const APP_TEMPLATE_PATH = 'apps/frontend/src/app/app.html';
const LOGIN_PAGE_PATH = 'libs/frontend/auth/src/lib/login/login-page.ts';

const RESET_EXPORTS = [
  './lib/reset/reset.service',
  './lib/reset/forgot-password-page',
  './lib/reset/reset-password-page',
  './lib/reset/verify-email-page',
  './lib/reset/verify-email-banner',
];

/**
 * Installs the `auth-reset` brick (V2.1 step 33): forgot-password / reset
 * and email verification. Needs the `auth` brick (it emits the
 * `user.registered` event this one listens for) and the `mailer` brick.
 * Wires the frontend pages + banner too, when `frontend-auth` is present.
 * Idempotent.
 */
export default async function authResetGenerator(
  tree: Tree,
): Promise<GeneratorCallback> {
  if (!tree.exists('libs/backend/auth/package.json')) {
    throw new Error(
      'auth-reset needs the auth brick. Run `nx g @org/starter-plugin:auth` first.',
    );
  }
  if (!tree.exists('libs/backend/mailer/package.json')) {
    throw new Error(
      'auth-reset needs the mailer brick (it sends reset + verification emails). Run `nx g @org/starter-plugin:mailer` first.',
    );
  }

  ensureLibCopied(tree, LIB_ROOT, SOURCE_LIB_ROOT);

  const installTask = addDependenciesToPackageJson(
    tree,
    readPackageDependencies(SOURCE_LIB_ROOT),
    {},
  );

  ensureNamedImport(
    tree,
    APP_MODULE_PATH,
    'AuthResetModule',
    '@org/backend-auth-reset',
  );
  ensureArrayItem(tree, APP_MODULE_PATH, 'imports', 'AuthResetModule');

  wireFrontend(tree);

  await formatFiles(tree);

  return installTask;
}

/**
 * The frontend half: the two pages, the verification landing page and the
 * "verify your email" banner. Only runs when the frontend auth brick is
 * installed — the backend endpoints work on their own regardless.
 */
function wireFrontend(tree: Tree): void {
  if (!tree.exists(`${FRONTEND_AUTH_LIB}/project.json`)) {
    return;
  }

  const target = `${FRONTEND_AUTH_LIB}/${FRONTEND_RESET_SUBDIR}`;
  if (!tree.exists(`${target}/reset.service.ts`)) {
    copySourceDirectory(tree, SOURCE_FRONTEND_RESET, target);
  }
  for (const exportPath of RESET_EXPORTS) {
    ensureExportLine(tree, FRONTEND_AUTH_INDEX, exportPath);
  }

  ensureNamedImport(
    tree,
    APP_ROUTES_PATH,
    'ForgotPasswordPage',
    '@org/frontend-auth',
  );
  ensureNamedImport(
    tree,
    APP_ROUTES_PATH,
    'ResetPasswordPage',
    '@org/frontend-auth',
  );
  ensureNamedImport(
    tree,
    APP_ROUTES_PATH,
    'VerifyEmailPage',
    '@org/frontend-auth',
  );
  ensureRoute(
    tree,
    APP_ROUTES_PATH,
    "{ path: 'forgot-password', component: ForgotPasswordPage }",
    "path: 'forgot-password'",
  );
  ensureRoute(
    tree,
    APP_ROUTES_PATH,
    "{ path: 'reset-password', component: ResetPasswordPage }",
    "path: 'reset-password'",
  );
  ensureRoute(
    tree,
    APP_ROUTES_PATH,
    "{ path: 'verify-email', component: VerifyEmailPage }",
    "path: 'verify-email'",
  );

  // The "verify your email" bar, mounted outside the router outlet.
  ensureNamedImport(
    tree,
    APP_COMPONENT_PATH,
    'VerifyEmailBanner',
    '@org/frontend-auth',
  );
  ensureArrayItem(tree, APP_COMPONENT_PATH, 'imports', 'VerifyEmailBanner');
  const template = tree.read(APP_TEMPLATE_PATH, 'utf-8');
  if (template !== null && !template.includes('lib-verify-email-banner')) {
    ensureLineAtTop(
      tree,
      APP_TEMPLATE_PATH,
      '<lib-verify-email-banner></lib-verify-email-banner>',
    );
  }

  // A "Forgot your password?" link on the login form.
  const loginPage = tree.read(LOGIN_PAGE_PATH, 'utf-8');
  if (loginPage !== null && !loginPage.includes('/forgot-password')) {
    ensureLineAfterAnchor(
      tree,
      LOGIN_PAGE_PATH,
      '</form>',
      '<a routerLink="/forgot-password">Forgot your password?</a>',
    );
  }
}
