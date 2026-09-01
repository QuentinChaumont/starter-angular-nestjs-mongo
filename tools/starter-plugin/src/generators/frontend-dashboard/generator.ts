import { Tree, formatFiles, updateJson } from '@nx/devkit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ensureArrayItem } from '../_shared/ensure-array-item';
import { ensureLibCopied } from '../_shared/ensure-lib-copied';
import { ensureNamedImport } from '../_shared/ensure-named-import';
import { ensureRoute } from '../_shared/ensure-route';

const WORKSPACE_ROOT = join(__dirname, '../../../../../');
const LIB_ROOT = 'libs/frontend/dashboard';
const SOURCE_LIB_ROOT = join(WORKSPACE_ROOT, LIB_ROOT);

const APP_CONFIG_PATH = 'apps/frontend/src/app/app.config.ts';
const APP_ROUTES_PATH = 'apps/frontend/src/app/app.routes.ts';
const NAV_PATH = 'apps/frontend/src/app/dashboard-nav.ts';
const SOURCE_NAV_FILE = join(WORKSPACE_ROOT, NAV_PATH);

const SHELL_ROUTE =
  "{ path: 'app', canActivate: [authGuard], loadComponent: () => import('@org/frontend-dashboard').then((m) => m.DashboardShell), children: [" +
  "{ path: '', loadComponent: () => import('@org/frontend-dashboard').then((m) => m.DashboardHome) }, " +
  "{ path: 'admin', canActivate: [roleGuard('admin')], loadComponent: () => import('@org/frontend-dashboard').then((m) => m.DashboardHome) }] }";
const REDIRECT_ROUTE = "{ path: '', pathMatch: 'full', redirectTo: 'app' }";

/**
 * Adds the dashboard shell brick: `MatSidenav` layout, config-driven menu,
 * and the `/app/**` route group behind `authGuard` (with `'' -> /app`).
 * `/login` and `/auth/callback` stay outside the shell. Requires
 * `frontend-auth`. Idempotent.
 */
export default async function frontendDashboardGenerator(
  tree: Tree,
): Promise<void> {
  if (!tree.exists('libs/frontend/auth/project.json')) {
    throw new Error(
      'frontend-dashboard needs the auth brick. Run `nx g @org/starter-plugin:frontend-auth` first.',
    );
  }

  ensureLibCopied(tree, LIB_ROOT, SOURCE_LIB_ROOT, 'project.json');

  const tsconfigPath = tree.exists('tsconfig.base.json')
    ? 'tsconfig.base.json'
    : 'tsconfig.json';
  updateJson(tree, tsconfigPath, (json) => {
    json.compilerOptions ??= {};
    json.compilerOptions.paths ??= {};
    json.compilerOptions.paths['@org/frontend-dashboard'] ??= [
      './libs/frontend/dashboard/src/index.ts',
    ];
    return json;
  });

  if (!tree.exists(NAV_PATH)) {
    tree.write(NAV_PATH, readFileSync(SOURCE_NAV_FILE, 'utf-8'));
  }

  ensureNamedImport(
    tree,
    APP_CONFIG_PATH,
    'provideDashboard',
    '@org/frontend-dashboard',
  );
  ensureNamedImport(tree, APP_CONFIG_PATH, 'DASHBOARD_NAV', './dashboard-nav');
  ensureArrayItem(
    tree,
    APP_CONFIG_PATH,
    'providers',
    'provideDashboard(DASHBOARD_NAV)',
  );

  ensureNamedImport(tree, APP_ROUTES_PATH, 'authGuard', '@org/frontend-auth');
  ensureNamedImport(tree, APP_ROUTES_PATH, 'roleGuard', '@org/frontend-auth');
  ensureRoute(tree, APP_ROUTES_PATH, SHELL_ROUTE, 'm.DashboardShell');
  ensureRoute(tree, APP_ROUTES_PATH, REDIRECT_ROUTE, "redirectTo: 'app'");

  await formatFiles(tree);
}
