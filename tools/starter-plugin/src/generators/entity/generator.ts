import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  updateJson,
} from '@nx/devkit';
import { EntityGeneratorSchema } from './schema';

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

  await formatFiles(tree);
}
