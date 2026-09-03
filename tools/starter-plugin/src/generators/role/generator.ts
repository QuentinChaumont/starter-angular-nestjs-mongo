import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
  updateJson,
} from '@nx/devkit';
import { join } from 'path';
import { ensureArrayEntry } from '../_shared/ensure-array-entry';
import { ensureArrayItem } from '../_shared/ensure-array-item';
import { ensureLibCopied } from '../_shared/ensure-lib-copied';
import { ensureNamedImport } from '../_shared/ensure-named-import';
import { ensureProjectReference } from '../_shared/ensure-project-reference';
import { readPackageDependencies } from '../_shared/read-package-dependencies';

const WORKSPACE_ROOT = join(__dirname, '../../../../../');

const LIB_ROOT = 'libs/backend/features/role';
const SOURCE_LIB_ROOT = join(WORKSPACE_ROOT, LIB_ROOT);
const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';
const BACKEND_PACKAGE_JSON = 'apps/backend/package.json';

const FRONTEND_LIB = 'libs/frontend/features/admin-roles';
const FRONTEND_IMPORT = '@org/frontend-features-admin-roles';
const APP_ROUTES_PATH = 'apps/frontend/src/app/app.routes.ts';
const APP_CONFIG_PATH = 'apps/frontend/src/app/app.config.ts';
const FEATURES_WORKSPACE_GLOB = 'libs/backend/features/*';

/**
 * Installs the role-management brick (V2.2 step 44): a `Role` catalogue
 * with an admin-only CRUD, wired so `user` role assignment is validated
 * against it. Needs the `auth` brick (the CRUD is `@Roles('admin')`, and
 * without a role guard there is nothing to manage). Adds the
 * `/app/admin/roles` console when the frontend admin-users brick is
 * present. Idempotent.
 */
export default async function roleGenerator(
  tree: Tree,
): Promise<GeneratorCallback> {
  if (!tree.exists('libs/backend/auth/package.json')) {
    throw new Error(
      'The role brick needs the auth brick (its CRUD is admin-only). Run `nx g @org/starter-plugin:auth` first.',
    );
  }
  if (!tree.exists('libs/backend/features/user/src/lib/user.module.ts')) {
    throw new Error(
      'The role brick needs the "user" feature entity. Run `nx g @org/starter-plugin:entity user --crud` first.',
    );
  }

  ensureLibCopied(tree, LIB_ROOT, SOURCE_LIB_ROOT);
  ensureWorkspaceGlob(tree);

  const installTask = addDependenciesToPackageJson(
    tree,
    readPackageDependencies(SOURCE_LIB_ROOT),
    {},
  );

  ensureNamedImport(
    tree,
    APP_MODULE_PATH,
    'RoleModule',
    '@org/backend-features-role',
  );
  ensureArrayItem(tree, APP_MODULE_PATH, 'imports', 'RoleModule');

  if (tree.exists(BACKEND_PACKAGE_JSON)) {
    updateJson(tree, BACKEND_PACKAGE_JSON, (json) => {
      json.dependencies ??= {};
      json.dependencies['@org/backend-features-role'] ??= '0.0.1';
      return json;
    });
  }

  wireFrontend(tree);

  await formatFiles(tree);

  return installTask;
}

function ensureWorkspaceGlob(tree: Tree): void {
  updateJson(tree, 'package.json', (json) => {
    const workspaces: string[] = json.workspaces ?? [];
    if (!workspaces.includes(FEATURES_WORKSPACE_GLOB)) {
      workspaces.push(FEATURES_WORKSPACE_GLOB);
    }
    json.workspaces = workspaces;
    return json;
  });
}

/**
 * The `/app/admin/roles` console — a tab under `AdminTabsShell` (V2.3 step
 * 49). Only runs with the frontend admin-users brick installed (it owns the
 * `/app/admin` route + `AdminTabsShell`) — the backend CRUD works on its
 * own regardless. The admin-users console picks up the role catalogue
 * automatically (its role dialog calls `GET /api/roles`).
 */
function wireFrontend(tree: Tree): void {
  if (!tree.exists('libs/frontend/features/admin-users/project.json')) {
    return;
  }

  ensureLibCopied(
    tree,
    FRONTEND_LIB,
    join(WORKSPACE_ROOT, FRONTEND_LIB),
    'project.json',
  );

  const tsconfigPath = tree.exists('tsconfig.base.json')
    ? 'tsconfig.base.json'
    : 'tsconfig.json';
  updateJson(tree, tsconfigPath, (json) => {
    json.compilerOptions ??= {};
    json.compilerOptions.paths ??= {};
    json.compilerOptions.paths[FRONTEND_IMPORT] ??= [
      `./${FRONTEND_LIB}/src/index.ts`,
    ];
    return json;
  });

  // A child route of `/app/admin` — the parent's `roleGuard('admin')` covers it.
  ensureArrayEntry(
    tree,
    APP_ROUTES_PATH,
    /AdminTabsShell,\s*children:\s*\[/,
    `{ path: 'roles', loadChildren: () => import('${FRONTEND_IMPORT}').then((m) => m.ADMIN_ROLES_ROUTES) }`,
    FRONTEND_IMPORT,
  );

  const featureRef = `../../${FRONTEND_LIB}/tsconfig.lib.json`;
  ensureProjectReference(tree, 'apps/frontend/tsconfig.spec.json', featureRef);
  ensureProjectReference(tree, 'apps/frontend/tsconfig.app.json', featureRef);

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
      "provideAdminTab({ label: 'Roles', labelKey: 'dashboard.adminTabs.roles', path: 'roles', order: 10 })",
    );
  }
}
