import { Tree, formatFiles, updateJson } from '@nx/devkit';
import { join } from 'path';
import { ensureArrayItem } from '../_shared/ensure-array-item';
import { ensureHttpClientInterceptors } from '../_shared/ensure-http-client-interceptors';
import { ensureLibCopied } from '../_shared/ensure-lib-copied';
import { ensureNamedImport } from '../_shared/ensure-named-import';

const WORKSPACE_ROOT = join(__dirname, '../../../../../');
const LIB_ROOT = 'libs/frontend/feedback';
const SOURCE_LIB_ROOT = join(WORKSPACE_ROOT, LIB_ROOT);
const APP_CONFIG_PATH = 'apps/frontend/src/app/app.config.ts';

/**
 * Adds the feedback brick: `DialogService`, `NotificationService` and the
 * `ApiError` → toast interceptor. Registers `httpErrorInterceptor` after
 * whatever interceptors are already wired (so it stays after
 * `authInterceptor`) and adds `provideFeedback()`. Requires the design
 * brick. Idempotent.
 */
export default async function frontendFeedbackGenerator(
  tree: Tree,
): Promise<void> {
  if (!tree.exists('libs/frontend/design/project.json')) {
    throw new Error(
      'frontend-feedback needs the design brick. Run `nx g @org/starter-plugin:frontend-design` first.',
    );
  }

  ensureLibCopied(tree, LIB_ROOT, SOURCE_LIB_ROOT, 'project.json');

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
    'httpErrorInterceptor',
    '@org/frontend-feedback',
  );
  ensureNamedImport(
    tree,
    APP_CONFIG_PATH,
    'provideFeedback',
    '@org/frontend-feedback',
  );

  ensureHttpClientInterceptors(tree, APP_CONFIG_PATH, ['httpErrorInterceptor']);
  ensureArrayItem(tree, APP_CONFIG_PATH, 'providers', 'provideFeedback()');

  const tsconfigPath = tree.exists('tsconfig.base.json')
    ? 'tsconfig.base.json'
    : 'tsconfig.json';
  updateJson(tree, tsconfigPath, (json) => {
    json.compilerOptions ??= {};
    json.compilerOptions.paths ??= {};
    json.compilerOptions.paths['@org/frontend-feedback'] ??= [
      './libs/frontend/feedback/src/index.ts',
    ];
    return json;
  });

  await formatFiles(tree);
}
