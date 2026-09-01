import { Tree, formatFiles, updateJson } from '@nx/devkit';
import { join } from 'path';
import { ensureArrayItem } from '../_shared/ensure-array-item';
import { ensureLibCopied } from '../_shared/ensure-lib-copied';
import { ensureLineAtTop } from '../_shared/ensure-line-at-top';
import { ensureNamedImport } from '../_shared/ensure-named-import';
import { ensureRoute } from '../_shared/ensure-route';

const WORKSPACE_ROOT = join(__dirname, '../../../../../');
const LIB_ROOT = 'libs/frontend/consent';
const SOURCE_LIB_ROOT = join(WORKSPACE_ROOT, LIB_ROOT);

const APP_CONFIG_PATH = 'apps/frontend/src/app/app.config.ts';
const APP_COMPONENT_PATH = 'apps/frontend/src/app/app.ts';
const APP_TEMPLATE_PATH = 'apps/frontend/src/app/app.html';
const APP_ROUTES_PATH = 'apps/frontend/src/app/app.routes.ts';

const BANNER_TAG = '<lib-consent-banner></lib-consent-banner>';
const COOKIE_ROUTE =
  "{ path: 'legal/cookies', component: CookiePolicy }";
const PRIVACY_ROUTE =
  "{ path: 'legal/privacy', component: PrivacyPolicy }";

/**
 * Adds the consent brick: the first-visit cookie banner, preferences
 * dialog, the `/legal/cookies` + `/legal/privacy` routes and legal-page
 * templates. Mounts `<lib-consent-banner>` in `app.ts` (outside the router
 * outlet). "Manage cookies" appears in the dashboard menu automatically
 * via the `CONSENT_MANAGER` hook. Requires `frontend-design`. Idempotent.
 */
export default async function frontendConsentGenerator(
  tree: Tree,
): Promise<void> {
  if (!tree.exists('libs/frontend/design/project.json')) {
    throw new Error(
      'frontend-consent needs the design brick. Run `nx g @org/starter-plugin:frontend-design` first.',
    );
  }

  ensureLibCopied(tree, LIB_ROOT, SOURCE_LIB_ROOT, 'project.json');

  const tsconfigPath = tree.exists('tsconfig.base.json')
    ? 'tsconfig.base.json'
    : 'tsconfig.json';
  updateJson(tree, tsconfigPath, (json) => {
    json.compilerOptions ??= {};
    json.compilerOptions.paths ??= {};
    json.compilerOptions.paths['@org/frontend-consent'] ??= [
      './libs/frontend/consent/src/index.ts',
    ];
    return json;
  });

  ensureNamedImport(
    tree,
    APP_CONFIG_PATH,
    'provideConsent',
    '@org/frontend-consent',
  );
  ensureArrayItem(tree, APP_CONFIG_PATH, 'providers', 'provideConsent()');

  // Import must be registered before the imports-array entry, otherwise
  // ensureNamedImport would see "ConsentBanner" already in the file.
  ensureNamedImport(
    tree,
    APP_COMPONENT_PATH,
    'ConsentBanner',
    '@org/frontend-consent',
  );
  ensureArrayItem(tree, APP_COMPONENT_PATH, 'imports', 'ConsentBanner');

  const template = tree.read(APP_TEMPLATE_PATH, 'utf-8');
  if (template !== null && !template.includes('lib-consent-banner')) {
    ensureLineAtTop(tree, APP_TEMPLATE_PATH, BANNER_TAG);
  }

  ensureNamedImport(
    tree,
    APP_ROUTES_PATH,
    'CookiePolicy',
    '@org/frontend-consent',
  );
  ensureNamedImport(
    tree,
    APP_ROUTES_PATH,
    'PrivacyPolicy',
    '@org/frontend-consent',
  );
  ensureRoute(tree, APP_ROUTES_PATH, COOKIE_ROUTE, "path: 'legal/cookies'");
  ensureRoute(tree, APP_ROUTES_PATH, PRIVACY_ROUTE, "path: 'legal/privacy'");

  await formatFiles(tree);
}
