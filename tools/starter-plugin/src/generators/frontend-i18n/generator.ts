import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
  readJson,
  updateJson,
} from '@nx/devkit';
import { join } from 'path';
import { ensureArrayItem } from '../_shared/ensure-array-item';
import { ensureLibCopied } from '../_shared/ensure-lib-copied';
import { ensureNamedImport } from '../_shared/ensure-named-import';
import { ensureProjectReference } from '../_shared/ensure-project-reference';

const WORKSPACE_ROOT = join(__dirname, '../../../../../');
const LIB_ROOT = 'libs/frontend/i18n';
const SOURCE_LIB_ROOT = join(WORKSPACE_ROOT, LIB_ROOT);

const APP_CONFIG_PATH = 'apps/frontend/src/app/app.config.ts';

/** Fallback if the source package.json can't be read for the exact range. */
const TRANSLOCO_FALLBACK = '^8.4.0';

/**
 * Adds the frontend i18n brick (V2.3 step 47): Transloco with `en` / `fr`
 * bundled (no HTTP loader), `provideI18n()` wired into `app.config.ts`, and
 * the `<lib-lang-switcher>` — which the dashboard shell already renders in
 * its toolbar. The other frontend bricks ship their `| transloco` keys and
 * an English fallback, so the app keeps rendering English text without the
 * translations loaded. Requires `frontend-design`. Idempotent.
 */
export default async function frontendI18nGenerator(
  tree: Tree,
): Promise<GeneratorCallback> {
  if (!tree.exists('libs/frontend/design/project.json')) {
    throw new Error(
      'frontend-i18n needs the design brick. Run `nx g @org/starter-plugin:frontend-design` first.',
    );
  }

  ensureLibCopied(tree, LIB_ROOT, SOURCE_LIB_ROOT, 'project.json');

  const tsconfigPath = tree.exists('tsconfig.base.json')
    ? 'tsconfig.base.json'
    : 'tsconfig.json';
  updateJson(tree, tsconfigPath, (json) => {
    json.compilerOptions ??= {};
    json.compilerOptions.paths ??= {};
    json.compilerOptions.paths['@org/frontend-i18n'] ??= [
      './libs/frontend/i18n/src/index.ts',
    ];
    return json;
  });

  ensureNamedImport(tree, APP_CONFIG_PATH, 'provideI18n', '@org/frontend-i18n');
  ensureArrayItem(tree, APP_CONFIG_PATH, 'providers', 'provideI18n()');

  // The lib is reached through spec-only imports (`provideTranslocoTesting`)
  // that `nx sync` doesn't see — add the spec-tsconfig references by hand.
  const specRef = '../../libs/frontend/i18n/tsconfig.lib.json';
  ensureProjectReference(tree, 'apps/frontend/tsconfig.spec.json', specRef);

  const installTask = addDependenciesToPackageJson(
    tree,
    { '@jsverse/transloco': translocoRange(tree) },
    {},
  );

  await formatFiles(tree);

  return installTask;
}

function translocoRange(tree: Tree): string {
  try {
    const sourcePackageJson = readJson(tree, 'package.json');
    return (
      sourcePackageJson.dependencies?.['@jsverse/transloco'] ??
      TRANSLOCO_FALLBACK
    );
  } catch {
    return TRANSLOCO_FALLBACK;
  }
}
