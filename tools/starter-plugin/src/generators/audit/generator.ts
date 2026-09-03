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

const LIB_ROOT = 'libs/backend/features/audit';
const SOURCE_LIB_ROOT = join(WORKSPACE_ROOT, LIB_ROOT);
const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';
const BACKEND_PACKAGE_JSON = 'apps/backend/package.json';

const FRONTEND_LIB = 'libs/frontend/features/admin-audit';
const FRONTEND_IMPORT = '@org/frontend-features-admin-audit';
const APP_ROUTES_PATH = 'apps/frontend/src/app/app.routes.ts';
const NAV_PATH = 'apps/frontend/src/app/dashboard-nav.ts';
const FEATURES_WORKSPACE_GLOB = 'libs/backend/features/*';

/**
 * Installs the audit-log brick (V2.3 step 45): an append-only
 * `audit_events` collection filled best-effort from the `auth` / `user`
 * bricks' lifecycle events, plus a read-only `GET /api/audit` and the
 * `/app/admin/audit` console. Needs the `auth` brick (the console is
 * `@Roles('admin')` and the events come from it). Idempotent.
 */
export default async function auditGenerator(
  tree: Tree,
): Promise<GeneratorCallback> {
  if (!tree.exists('libs/backend/auth/package.json')) {
    throw new Error(
      'The audit brick needs the auth brick (it logs auth events). Run `nx g @org/starter-plugin:auth` first.',
    );
  }

  ensureLibCopied(tree, LIB_ROOT, SOURCE_LIB_ROOT);
  updateJson(tree, 'package.json', (json) => {
    const workspaces: string[] = json.workspaces ?? [];
    if (!workspaces.includes(FEATURES_WORKSPACE_GLOB)) {
      workspaces.push(FEATURES_WORKSPACE_GLOB);
    }
    json.workspaces = workspaces;
    return json;
  });

  const installTask = addDependenciesToPackageJson(
    tree,
    readPackageDependencies(SOURCE_LIB_ROOT),
    {},
  );

  ensureNamedImport(
    tree,
    APP_MODULE_PATH,
    'AuditModule',
    '@org/backend-features-audit',
  );
  ensureArrayItem(tree, APP_MODULE_PATH, 'imports', 'AuditModule');

  if (tree.exists(BACKEND_PACKAGE_JSON)) {
    updateJson(tree, BACKEND_PACKAGE_JSON, (json) => {
      json.dependencies ??= {};
      json.dependencies['@org/backend-features-audit'] ??= '0.0.1';
      return json;
    });
  }

  wireFrontend(tree);

  await formatFiles(tree);

  return installTask;
}

/**
 * The `/app/admin/audit` console. Runs only with the frontend admin-users
 * brick installed (it owns the `/app/admin` route + nav) — the backend
 * endpoint works on its own regardless.
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

  ensureArrayEntry(
    tree,
    APP_ROUTES_PATH,
    /children:\s*\[/,
    `{ path: 'admin/audit', canActivate: [roleGuard('admin')], loadChildren: () => import('${FRONTEND_IMPORT}').then((m) => m.ADMIN_AUDIT_ROUTES) }`,
    FRONTEND_IMPORT,
  );

  const featureRef = `../../${FRONTEND_LIB}/tsconfig.lib.json`;
  ensureProjectReference(tree, 'apps/frontend/tsconfig.spec.json', featureRef);
  ensureProjectReference(tree, 'apps/frontend/tsconfig.app.json', featureRef);

  if (tree.exists(NAV_PATH)) {
    ensureArrayEntry(
      tree,
      NAV_PATH,
      /DASHBOARD_NAV[^=]*=\s*\[/,
      "{ label: 'Audit', icon: 'receipt_long', route: 'admin/audit', roles: ['admin'] }",
      "route: 'admin/audit'",
    );
  }
}
