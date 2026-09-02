import {
  GeneratorCallback,
  Tree,
  addDependenciesToPackageJson,
  formatFiles,
  updateJson,
} from '@nx/devkit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ensureArrayItem } from '../_shared/ensure-array-item';
import { ensureLibCopied } from '../_shared/ensure-lib-copied';
import { ensureLineAfterAnchor } from '../_shared/ensure-line-after-anchor';
import { ensureNamedImport } from '../_shared/ensure-named-import';
import { readPackageDependencies } from '../_shared/read-package-dependencies';

const WORKSPACE_ROOT = join(__dirname, '../../../../../');
const LIB_ROOT = 'libs/backend/auth';
const SOURCE_LIB_ROOT = join(WORKSPACE_ROOT, LIB_ROOT);
const TESTING_LIB_ROOT = 'libs/backend/testing';
const SOURCE_TESTING_LIB_ROOT = join(WORKSPACE_ROOT, TESTING_LIB_ROOT);
const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';
const WEBPACK_CONFIG_PATH = 'apps/backend/webpack.config.js';
const BACKEND_PACKAGE_JSON = 'apps/backend/package.json';
const SEED_ADMIN_PATH = 'apps/backend/src/seed-admin.ts';
const SOURCE_SEED_ADMIN = join(WORKSPACE_ROOT, SEED_ADMIN_PATH);
const SEED_ENTRY_LINE =
  "additionalEntryPoints: [{ entryName: 'seed-admin', entryPath: './src/seed-admin.ts' }],";

/**
 * Adds the JWT auth brick. `AuthModule` logs users in against the `user`
 * feature entity (see V1.md step 13), so this brick only makes sense once
 * both Mongo and a `user` entity exist — this checks for both up front and
 * fails with an actionable message rather than generating code that can't
 * compile. Also brings along `backend-testing`, since Auth's own spec files
 * depend on it (`startTestMongo`, etc.) — see V1.md step 18. Idempotent —
 * safe to run again once installed.
 */
export default async function authGenerator(
  tree: Tree,
): Promise<GeneratorCallback> {
  if (!tree.exists('libs/backend/database/mongo/package.json')) {
    throw new Error(
      'Auth requires the Mongo brick (AuthModule logs users in against Mongo-backed data). Run `nx g @org/starter-plugin:mongo` first.',
    );
  }
  if (!tree.exists('libs/backend/features/user/src/lib/user.module.ts')) {
    throw new Error(
      'Auth requires a "user" feature entity with CRUD (AuthModule logs users in against it). Run `nx g @org/starter-plugin:entity user --crud` first.',
    );
  }

  ensureLibCopied(tree, LIB_ROOT, SOURCE_LIB_ROOT);
  ensureLibCopied(tree, TESTING_LIB_ROOT, SOURCE_TESTING_LIB_ROOT);

  const installTask = addDependenciesToPackageJson(
    tree,
    {
      ...readPackageDependencies(SOURCE_LIB_ROOT),
      ...readPackageDependencies(SOURCE_TESTING_LIB_ROOT),
    },
    {},
  );

  ensureNamedImport(tree, APP_MODULE_PATH, 'AuthModule', '@org/backend-auth');
  ensureArrayItem(tree, APP_MODULE_PATH, 'imports', 'AuthModule');

  wireSeedAdmin(tree);

  await formatFiles(tree);

  return installTask;
}

/**
 * Bootstrap-admin helper: a second webpack entry (`dist/seed-admin.js`), an
 * `nx run @org/backend:seed-admin` target, and a `pnpm seed:admin` script.
 * Idempotent. Only meaningful with the auth brick (it needs the `admin`
 * role), hence wired here rather than in the socle.
 */
function wireSeedAdmin(tree: Tree): void {
  if (!tree.exists(SEED_ADMIN_PATH)) {
    tree.write(SEED_ADMIN_PATH, readFileSync(SOURCE_SEED_ADMIN));
  }

  if (tree.exists(WEBPACK_CONFIG_PATH)) {
    ensureLineAfterAnchor(
      tree,
      WEBPACK_CONFIG_PATH,
      "main: './src/main.ts',",
      SEED_ENTRY_LINE,
    );
  }

  if (tree.exists(BACKEND_PACKAGE_JSON)) {
    updateJson(tree, BACKEND_PACKAGE_JSON, (json) => {
      json.nx ??= {};
      json.nx.targets ??= {};
      json.nx.targets['seed-admin'] ??= {
        executor: 'nx:run-commands',
        dependsOn: ['build'],
        options: { command: 'node apps/backend/dist/seed-admin.js' },
      };
      return json;
    });
  }

  updateJson(tree, 'package.json', (json) => {
    json.scripts ??= {};
    json.scripts['seed:admin'] ??= 'nx run @org/backend:seed-admin';
    return json;
  });
}
