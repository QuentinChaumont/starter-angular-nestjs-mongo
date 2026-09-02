import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  updateJson,
} from '@nx/devkit';
import { FrontendFeatureGeneratorSchema } from './schema';
import { ensureArrayEntry } from '../_shared/ensure-array-entry';
import { ensureNamedImport } from '../_shared/ensure-named-import';
import { ensureProjectReference } from '../_shared/ensure-project-reference';

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
const APP_ROUTES_PATH = 'apps/frontend/src/app/app.routes.ts';
const NAV_PATH = 'apps/frontend/src/app/dashboard-nav.ts';

function parseRoles(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);
}

/**
 * Scaffolds a **lazy-loaded** business feature under the dashboard shell:
 * `libs/frontend/features/<name>/` (signals store, typed HTTP service,
 * list + detail pages, lazy-exported routes) plus the wiring — a
 * `loadChildren` child route on `/app`, a `DASHBOARD_NAV` entry, and the
 * `tsconfig.base.json` path. Nothing static is added to `app.config.ts` /
 * `app.ts`, so the feature lands in its own bundle chunk. Idempotent.
 *
 * `libs/frontend/features/<x>` = lazy business feature;
 * `libs/frontend/<x>` = eager infra brick.
 */
export default async function frontendFeatureGenerator(
  tree: Tree,
  options: FrontendFeatureGeneratorSchema,
): Promise<void> {
  if (!NAME_PATTERN.test(options.name ?? '')) {
    throw new Error(
      `Invalid feature name "${options.name}". Use lowercase letters, digits and dashes, starting with a letter (e.g. "reports", "sales-orders").`,
    );
  }
  if (!tree.exists('libs/frontend/design/project.json')) {
    throw new Error(
      'frontend-feature needs the design brick. Run `nx g @org/starter-plugin:frontend-design` first.',
    );
  }
  if (!tree.exists('libs/frontend/dashboard/project.json')) {
    throw new Error(
      'frontend-feature needs the dashboard brick (the feature mounts under its /app shell). Run `nx g @org/starter-plugin:frontend-dashboard` first.',
    );
  }

  const v = names(options.name);
  const projectRoot = joinPathFragments('libs/frontend/features', v.fileName);
  const projectName = `frontend-features-${v.fileName}`;
  const importPath = `@org/${projectName}`;
  const crud = options.crud ?? false;
  const roles = parseRoles(options.roles);
  const icon = options.icon || 'chevron_right';
  const hasContract = tree.exists(
    `libs/shared/contracts/src/lib/${v.fileName}.ts`,
  );

  const substitutions = {
    ...v,
    projectName,
    importPath,
    crud,
    hasContract,
    icon,
    label: v.className,
    tmpl: '',
  };

  // Scaffold once. A re-run only re-applies the (idempotent) wiring, so it
  // never clobbers hand-edits to the generated files.
  if (!tree.exists(projectRoot)) {
    generateFiles(
      tree,
      joinPathFragments(__dirname, 'files'),
      projectRoot,
      substitutions,
    );
    if (crud) {
      generateFiles(
        tree,
        joinPathFragments(__dirname, 'files-crud'),
        projectRoot,
        substitutions,
      );
    }
  }

  const tsconfigPath = tree.exists('tsconfig.base.json')
    ? 'tsconfig.base.json'
    : 'tsconfig.json';
  updateJson(tree, tsconfigPath, (json) => {
    json.compilerOptions ??= {};
    json.compilerOptions.paths ??= {};
    json.compilerOptions.paths[importPath] ??= [
      `./libs/frontend/features/${v.fileName}/src/index.ts`,
    ];
    return json;
  });

  const guard = roles.length
    ? `canActivate: [roleGuard(${roles.map((r) => `'${r}'`).join(', ')})], `
    : '';
  const lazyRoute = `{ path: '${v.fileName}', ${guard}loadChildren: () => import('${importPath}').then((m) => m.${v.constantName}_ROUTES) }`;
  if (roles.length) {
    ensureNamedImport(tree, APP_ROUTES_PATH, 'roleGuard', '@org/frontend-auth');
  }
  ensureArrayEntry(
    tree,
    APP_ROUTES_PATH,
    /children:\s*\[/,
    lazyRoute,
    importPath,
  );

  // The lazy `import()` lives in `app.routes.ts`, which the frontend app's
  // `tsconfig.spec.json` also compiles — and `nx sync` only wires the
  // `tsconfig.app.json` reference. Add the spec one so `tsc` sees a project,
  // not loose files under the wrong rootDir.
  const featureRef = `../../libs/frontend/features/${v.fileName}/tsconfig.lib.json`;
  ensureProjectReference(
    tree,
    'apps/frontend/tsconfig.spec.json',
    featureRef,
  );
  ensureProjectReference(
    tree,
    'apps/frontend/tsconfig.app.json',
    featureRef,
  );

  const navRoles = roles.length
    ? `, roles: [${roles.map((r) => `'${r}'`).join(', ')}]`
    : '';
  ensureArrayEntry(
    tree,
    NAV_PATH,
    /DASHBOARD_NAV[^=]*=\s*\[/,
    `{ label: '${v.className}', icon: '${icon}', route: '${v.fileName}'${navRoles} }`,
    `route: '${v.fileName}'`,
  );

  await formatFiles(tree);
}
