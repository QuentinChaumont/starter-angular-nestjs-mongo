import {
  GeneratorCallback,
  Tree,
  formatFiles,
  updateJson,
} from '@nx/devkit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ensureArrayItem } from '../_shared/ensure-array-item';
import { ensureExportLine } from '../_shared/ensure-export-line';
import { ensureHttpClientInterceptors } from '../_shared/ensure-http-client-interceptors';
import { ensureLibCopied } from '../_shared/ensure-lib-copied';
import { ensureNamedImport } from '../_shared/ensure-named-import';
import { ensureRoute } from '../_shared/ensure-route';

const WORKSPACE_ROOT = join(__dirname, '../../../../../');
const LIB_ROOT = 'libs/frontend/auth';
const SOURCE_LIB_ROOT = join(WORKSPACE_ROOT, LIB_ROOT);
const CORE_API_FILE = 'libs/frontend/core/src/lib/api-base-url.ts';
const CORE_INDEX = 'libs/frontend/core/src/index.ts';
const SOURCE_CORE_API_FILE = join(WORKSPACE_ROOT, CORE_API_FILE);

const APP_CONFIG_PATH = 'apps/frontend/src/app/app.config.ts';
const APP_ROUTES_PATH = 'apps/frontend/src/app/app.routes.ts';

const LOGIN_ROUTE = "{ path: 'login', component: LoginPage }";
const REGISTER_ROUTE = "{ path: 'register', component: RegisterPage }";
const CALLBACK_ROUTE = "{ path: 'auth/callback', component: OidcCallback }";

/**
 * Adds the frontend auth brick: session store, HTTP interceptors, guards
 * and the `/login` + `/auth/callback` routes. Wires `provideAuth()` into
 * `app.config.ts`. Requires the design brick and the backend auth brick.
 * Idempotent.
 */
export default async function frontendAuthGenerator(
  tree: Tree,
): Promise<GeneratorCallback | void> {
  if (!tree.exists('libs/frontend/design/project.json')) {
    throw new Error(
      'frontend-auth needs the design brick. Run `nx g @org/starter-plugin:frontend-design` first.',
    );
  }
  if (!tree.exists('libs/backend/auth/package.json')) {
    throw new Error(
      'frontend-auth needs the backend auth brick. Run `nx g @org/starter-plugin:auth` first.',
    );
  }

  ensureLibCopied(tree, LIB_ROOT, SOURCE_LIB_ROOT, 'project.json');

  // The API base-URL token lives in frontend-core; make sure it's there.
  if (!tree.exists(CORE_API_FILE)) {
    tree.write(CORE_API_FILE, readFileSync(SOURCE_CORE_API_FILE, 'utf-8'));
  }
  if (!tree.exists(CORE_INDEX)) {
    tree.write(CORE_INDEX, '');
  }
  ensureExportLine(tree, CORE_INDEX, './lib/api-base-url');

  ensureNamedImport(
    tree,
    APP_CONFIG_PATH,
    'provideHttpClient',
    '@angular/common/http',
  );
  ensureNamedImport(
    tree,
    APP_CONFIG_PATH,
    'withInterceptors',
    '@angular/common/http',
  );
  ensureNamedImport(
    tree,
    APP_CONFIG_PATH,
    'csrfInterceptor',
    '@org/frontend-auth',
  );
  ensureNamedImport(
    tree,
    APP_CONFIG_PATH,
    'authInterceptor',
    '@org/frontend-auth',
  );
  ensureNamedImport(tree, APP_CONFIG_PATH, 'provideAuth', '@org/frontend-auth');

  // App owns provideHttpClient so feedback (step 27) can append its own
  // interceptor after authInterceptor.
  ensureHttpClientInterceptors(tree, APP_CONFIG_PATH, [
    'csrfInterceptor',
    'authInterceptor',
  ]);
  ensureArrayItem(tree, APP_CONFIG_PATH, 'providers', 'provideAuth()');

  ensureNamedImport(tree, APP_ROUTES_PATH, 'LoginPage', '@org/frontend-auth');
  ensureNamedImport(tree, APP_ROUTES_PATH, 'RegisterPage', '@org/frontend-auth');
  ensureNamedImport(tree, APP_ROUTES_PATH, 'OidcCallback', '@org/frontend-auth');
  ensureRoute(tree, APP_ROUTES_PATH, LOGIN_ROUTE, "path: 'login'");
  ensureRoute(tree, APP_ROUTES_PATH, REGISTER_ROUTE, "path: 'register'");
  ensureRoute(tree, APP_ROUTES_PATH, CALLBACK_ROUTE, "path: 'auth/callback'");

  const tsconfigPath = tree.exists('tsconfig.base.json')
    ? 'tsconfig.base.json'
    : 'tsconfig.json';
  updateJson(tree, tsconfigPath, (json) => {
    json.compilerOptions ??= {};
    json.compilerOptions.paths ??= {};
    json.compilerOptions.paths['@org/frontend-auth'] ??= [
      './libs/frontend/auth/src/index.ts',
    ];
    return json;
  });

  await formatFiles(tree);
}
