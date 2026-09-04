import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
  readJson,
  updateJson,
} from '@nx/devkit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ensureArrayItem } from '../_shared/ensure-array-item';
import { ensureLibCopied } from '../_shared/ensure-lib-copied';
import { ensureLineAtTop } from '../_shared/ensure-line-at-top';
import { ensureNamedImport } from '../_shared/ensure-named-import';

const WORKSPACE_ROOT = join(__dirname, '../../../../../');
const LIB_ROOT = 'libs/frontend/design';
const SOURCE_LIB_ROOT = join(WORKSPACE_ROOT, LIB_ROOT);
const SOURCE_DESIGN_MD = join(WORKSPACE_ROOT, 'DESIGN.md');

const APP_CONFIG_PATH = 'apps/frontend/src/app/app.config.ts';
const STYLES_PATH = 'apps/frontend/src/styles.scss';
const DESIGN_MD_PATH = 'DESIGN.md';
const THEME_USE = "@use '../../../libs/frontend/design/src/lib/theme/theme';";

const ANGULAR_MATERIAL_PACKAGES = [
  '@angular/animations',
  '@angular/cdk',
  '@angular/material',
];

/**
 * Adds the frontend design brick: Angular Material + CDK, the M3 theme and
 * the brand charter. Wires `materialProviders` into `app.config.ts` and the
 * theme `@use` into `styles.scss`, registers the `@org/frontend-design`
 * path, and drops a `DESIGN.md` template at the repo root (never
 * overwritten). Idempotent.
 */
export default async function frontendDesignGenerator(
  tree: Tree,
): Promise<GeneratorCallback> {
  ensureLibCopied(tree, LIB_ROOT, SOURCE_LIB_ROOT, 'project.json');

  // Keep Material/CDK/animations in lockstep with the installed Angular.
  const rootPackageJson = readJson(tree, 'package.json');
  const angularVersion: string =
    rootPackageJson.dependencies?.['@angular/core'] ?? '~22.0.0';
  const materialDeps: Record<string, string> = {};
  for (const name of ANGULAR_MATERIAL_PACKAGES) {
    materialDeps[name] = angularVersion;
  }
  const installTask = addDependenciesToPackageJson(tree, materialDeps, {});

  ensureNamedImport(
    tree,
    APP_CONFIG_PATH,
    'materialProviders',
    '@org/frontend-design',
  );
  ensureNamedImport(
    tree,
    APP_CONFIG_PATH,
    'provideTheme',
    '@org/frontend-design',
  );
  ensureArrayItem(tree, APP_CONFIG_PATH, 'providers', '...materialProviders');
  ensureArrayItem(tree, APP_CONFIG_PATH, 'providers', 'provideTheme()');

  ensureLineAtTop(tree, STYLES_PATH, THEME_USE);

  const tsconfigPath = tree.exists('tsconfig.base.json')
    ? 'tsconfig.base.json'
    : 'tsconfig.json';
  updateJson(tree, tsconfigPath, (json) => {
    json.compilerOptions ??= {};
    json.compilerOptions.paths ??= {};
    json.compilerOptions.paths['@org/frontend-design'] ??= [
      './libs/frontend/design/src/index.ts',
    ];
    // Lazy entry point for the theme dialog (kept out of the eager barrel).
    json.compilerOptions.paths['@org/frontend-design/theme-panel'] ??= [
      './libs/frontend/design/src/lib/theme/theme-settings-panel/theme-settings-panel.ts',
    ];
    return json;
  });

  if (!tree.exists(DESIGN_MD_PATH)) {
    tree.write(DESIGN_MD_PATH, readFileSync(SOURCE_DESIGN_MD, 'utf-8'));
  }

  await formatFiles(tree);

  return installTask;
}
