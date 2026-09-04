import { GeneratorCallback, Tree, formatFiles, updateJson } from '@nx/devkit';
import { join } from 'path';
import { ensureArrayEntry } from '../_shared/ensure-array-entry';
import { ensureArrayItem } from '../_shared/ensure-array-item';
import { ensureLibCopied } from '../_shared/ensure-lib-copied';
import { ensureNamedImport } from '../_shared/ensure-named-import';
import { ensureProjectReference } from '../_shared/ensure-project-reference';

const WORKSPACE_ROOT = join(__dirname, '../../../../../');
const LIB_ROOT = 'libs/frontend/features/admin-users';
const IMPORT_PATH = '@org/frontend-features-admin-users';

const APP_ROUTES_PATH = 'apps/frontend/src/app/app.routes.ts';
const APP_CONFIG_PATH = 'apps/frontend/src/app/app.config.ts';
const NAV_PATH = 'apps/frontend/src/app/dashboard-nav.ts';

/**
 * Turns the dashboard's placeholder `/app/admin` route into the tabbed
 * admin console (V2.3 step 49): `AdminTabsShell` over a routed outlet, with
 * the user console (paginated list, role toggles, enable/disable) as the
 * index tab. Lazy — loaded only for a user who passes the route's
 * `roleGuard('admin')`. Needs the dashboard shell (it owns the `/app/admin`
 * route + nav entry) and the feedback brick (confirm dialogs). Idempotent.
 */
export default async function frontendAdminUsersGenerator(
  tree: Tree,
): Promise<GeneratorCallback | void> {
  if (!tree.exists('libs/frontend/dashboard/project.json')) {
    throw new Error(
      'frontend-admin-users needs the dashboard brick (it owns the /app/admin route). Run `nx g @org/starter-plugin:frontend-dashboard` first.',
    );
  }
  if (!tree.exists('libs/frontend/feedback/project.json')) {
    throw new Error(
      'frontend-admin-users needs the feedback brick (confirm dialogs). Run `nx g @org/starter-plugin:frontend-feedback` first.',
    );
  }

  ensureLibCopied(
    tree,
    LIB_ROOT,
    join(WORKSPACE_ROOT, LIB_ROOT),
    'project.json',
  );

  const tsconfigPath = tree.exists('tsconfig.base.json')
    ? 'tsconfig.base.json'
    : 'tsconfig.json';
  updateJson(tree, tsconfigPath, (json) => {
    json.compilerOptions ??= {};
    json.compilerOptions.paths ??= {};
    json.compilerOptions.paths[IMPORT_PATH] ??= [`./${LIB_ROOT}/src/index.ts`];
    return json;
  });

  // Swap the `DashboardHome` placeholder on the `/app/admin` route for the
  // lazily-loaded `AdminTabsShell` + a child outlet, with this console as
  // the index tab. The route's `roleGuard('admin')` stays and now covers
  // every tab. Sibling admin bricks (role, audit) add their own child + tab.
  const routes = tree.read(APP_ROUTES_PATH, 'utf-8');
  if (routes === null) {
    throw new Error(`Missing "${APP_ROUTES_PATH}".`);
  }
  if (!routes.includes(IMPORT_PATH)) {
    const swapped = routes.replace(
      /(path: 'admin'[^}]*?)loadComponent: \(\) => import\('@org\/frontend-dashboard\/home'\)\.then\(\(m\) => m\.DashboardHome\)/,
      `$1loadComponent: () => import('@org/frontend-dashboard/admin-tabs').then((m) => m.AdminTabsShell), children: [{ path: '', loadChildren: () => import('${IMPORT_PATH}').then((m) => m.ADMIN_USERS_ROUTES) }]`,
    );
    if (swapped === routes) {
      throw new Error(
        'Could not find the `/app/admin` route in app.routes.ts — is the dashboard brick installed?',
      );
    }
    tree.write(APP_ROUTES_PATH, swapped);
  }

  // Register the "Users" tab (V2.3 step 49) — each admin brick provides its
  // own via `provideAdminTab`, so no brick patches a shared list.
  if (tree.exists(APP_CONFIG_PATH)) {
    ensureNamedImport(
      tree,
      APP_CONFIG_PATH,
      'provideAdminTab',
      '@org/frontend-dashboard',
    );
    ensureArrayItem(
      tree,
      APP_CONFIG_PATH,
      'providers',
      "provideAdminTab({ label: 'Users', labelKey: 'dashboard.adminTabs.users', path: '', order: 0 })",
    );
  }

  // The nav entry is normally already there (dashboard brick) — keep it safe.
  if (tree.exists(NAV_PATH)) {
    ensureArrayEntry(
      tree,
      NAV_PATH,
      /DASHBOARD_NAV[^=]*=\s*\[/,
      "{ label: 'Admin', icon: 'shield', route: 'admin', roles: ['admin'] }",
      "route: 'admin'",
    );
  }

  const featureRef = `../../${LIB_ROOT}/tsconfig.lib.json`;
  ensureProjectReference(tree, 'apps/frontend/tsconfig.spec.json', featureRef);
  ensureProjectReference(tree, 'apps/frontend/tsconfig.app.json', featureRef);

  await formatFiles(tree);
}
