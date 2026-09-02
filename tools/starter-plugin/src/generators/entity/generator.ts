import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  updateJson,
} from '@nx/devkit';
import { EntityGeneratorSchema } from './schema';
import frontendFeatureGenerator from '../frontend-feature/generator';
import { ensureExportLine } from '../_shared/ensure-export-line';

const CONTRACTS_ROOT = 'libs/shared/contracts/src';

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
const FEATURES_WORKSPACE_GLOB = 'libs/backend/features/*';

function validateName(name: string): void {
  if (!name || !NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid entity name "${name}". Use lowercase letters, digits and dashes, starting with a letter (e.g. "user", "user-profile").`,
    );
  }
}

/**
 * Package.json-based projects only get npm-linked (and correctly picked up
 * by Nx's inferred plugins, e.g. for the jest "test" target) once their
 * directory is covered by an npm workspaces glob.
 */
function ensureWorkspaceGlob(tree: Tree): void {
  updateJson(tree, 'package.json', (packageJson) => {
    const workspaces: string[] = packageJson.workspaces ?? [];
    if (!workspaces.includes(FEATURES_WORKSPACE_GLOB)) {
      workspaces.push(FEATURES_WORKSPACE_GLOB);
    }
    packageJson.workspaces = workspaces;
    return packageJson;
  });
}

export default async function entityGenerator(
  tree: Tree,
  options: EntityGeneratorSchema,
): Promise<void> {
  validateName(options.name);

  const crud = options.crud ?? false;
  const projectRoot = joinPathFragments('libs/backend/features', options.name);

  if (tree.exists(projectRoot)) {
    throw new Error(
      `"${projectRoot}" already exists. Refusing to overwrite an existing entity.`,
    );
  }

  const nameVariants = names(options.name);
  const projectName = `backend-features-${nameVariants.fileName}`;
  const substitutions = {
    ...nameVariants,
    projectName,
    crud,
    tmpl: '',
  };

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

  ensureWorkspaceGlob(tree);

  if (options.frontend) {
    writeSharedContract(tree, nameVariants);
    await frontendFeatureGenerator(tree, { name: options.name, crud });
  }

  await formatFiles(tree);
}

/**
 * Drops a shared front/back contract so the generated frontend feature and
 * this entity agree on one type. Placeholder fields — edit to match the
 * schema. Idempotent (never overwrites an existing contract).
 */
function writeSharedContract(
  tree: Tree,
  nameVariants: ReturnType<typeof names>,
): void {
  const contractPath = `${CONTRACTS_ROOT}/lib/${nameVariants.fileName}.ts`;
  if (!tree.exists(contractPath)) {
    tree.write(
      contractPath,
      `/**
 * Shared ${nameVariants.className} contract (frontend + backend). Generated
 * by \`entity ${nameVariants.fileName} --frontend\` — replace these
 * placeholder fields with the real ones.
 */
export interface ${nameVariants.className} {
  id: string;
  name: string;
  createdAt: string;
}
`,
    );
  }
  ensureExportLine(
    tree,
    `${CONTRACTS_ROOT}/index.ts`,
    `./lib/${nameVariants.fileName}.js`,
  );
}
