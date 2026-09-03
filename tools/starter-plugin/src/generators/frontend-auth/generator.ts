import { GeneratorCallback, Tree, formatFiles, updateJson } from '@nx/devkit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ensureArrayEntry } from '../_shared/ensure-array-entry';
import { ensureArrayItem } from '../_shared/ensure-array-item';
import { ensureExportLine } from '../_shared/ensure-export-line';
import { ensureHttpClientInterceptors } from '../_shared/ensure-http-client-interceptors';
import { ensureLibCopied } from '../_shared/ensure-lib-copied';
import { ensureNamedImport } from '../_shared/ensure-named-import';
import { ensureProjectReference } from '../_shared/ensure-project-reference';
import { ensureRoute } from '../_shared/ensure-route';
import { FrontendAuthGeneratorSchema } from './schema';

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
  options: FrontendAuthGeneratorSchema = {},
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
  if (!tree.exists('libs/frontend/i18n/project.json')) {
    throw new Error(
      'frontend-auth needs the i18n brick (its pages use the `| transloco` pipe). Run `nx g @org/starter-plugin:frontend-i18n` first.',
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
  ensureNamedImport(
    tree,
    APP_ROUTES_PATH,
    'RegisterPage',
    '@org/frontend-auth',
  );
  ensureNamedImport(
    tree,
    APP_ROUTES_PATH,
    'OidcCallback',
    '@org/frontend-auth',
  );
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

  if (options.profile) {
    wireProfile(tree, tsconfigPath);
  }

  await formatFiles(tree);
}

const PROFILE_LIB = 'libs/frontend/features/profile';
const PROFILE_IMPORT = '@org/frontend-features-profile';
const USER_MENU_PATH = 'libs/frontend/dashboard/src/lib/shell/user-menu.ts';

/**
 * `--profile`: the `/app/profile` page — a lazy feature that reads & edits
 * the connected account (`GET`/`PATCH /api/users/me`) and changes the
 * password (`POST /api/auth/change-password`). Needs the dashboard shell
 * (it mounts under `/app`) and the feedback brick (success toasts).
 */
function wireProfile(tree: Tree, tsconfigPath: string): void {
  if (!tree.exists('libs/frontend/dashboard/project.json')) {
    throw new Error(
      'frontend-auth --profile needs the dashboard brick. Run `nx g @org/starter-plugin:frontend-dashboard` first.',
    );
  }
  if (!tree.exists('libs/frontend/feedback/project.json')) {
    throw new Error(
      'frontend-auth --profile needs the feedback brick. Run `nx g @org/starter-plugin:frontend-feedback` first.',
    );
  }

  ensureLibCopied(
    tree,
    PROFILE_LIB,
    join(WORKSPACE_ROOT, PROFILE_LIB),
    'project.json',
  );

  updateJson(tree, tsconfigPath, (json) => {
    json.compilerOptions ??= {};
    json.compilerOptions.paths ??= {};
    json.compilerOptions.paths[PROFILE_IMPORT] ??= [
      `./${PROFILE_LIB}/src/index.ts`,
    ];
    return json;
  });

  ensureArrayEntry(
    tree,
    APP_ROUTES_PATH,
    /children:\s*\[/,
    `{ path: 'profile', loadChildren: () => import('${PROFILE_IMPORT}').then((m) => m.PROFILE_ROUTES) }`,
    PROFILE_IMPORT,
  );

  ensureNamedImport(tree, APP_CONFIG_PATH, 'ME_ENDPOINT', '@org/frontend-core');
  ensureArrayEntry(
    tree,
    APP_CONFIG_PATH,
    /providers:\s*\[/,
    "{ provide: ME_ENDPOINT, useValue: '/users/me' }",
    "useValue: '/users/me'",
  );

  const featureRef = `../../${PROFILE_LIB}/tsconfig.lib.json`;
  ensureProjectReference(tree, 'apps/frontend/tsconfig.spec.json', featureRef);
  ensureProjectReference(tree, 'apps/frontend/tsconfig.app.json', featureRef);

  // A "Profile" entry in the dashboard user-menu.
  const menu = tree.read(USER_MENU_PATH, 'utf-8');
  if (menu !== null && !menu.includes('/app/profile')) {
    tree.write(
      USER_MENU_PATH,
      menu
        .replace(
          /(<div class="user-menu__header">\{\{ roleLabel\(\) \}\}<\/div>)/,
          '$1\n      <button mat-menu-item (click)="goProfile()"><mat-icon>person</mat-icon><span>Profile</span></button>',
        )
        .replace(
          /(protected openTheme\(\): void \{)/,
          "protected goProfile(): void { this.router.navigate(['/app/profile']); }\n\n  $1",
        ),
    );
  }
}
