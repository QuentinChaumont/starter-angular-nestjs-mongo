import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  updateJson,
} from '@nx/devkit';
import { FeatureGeneratorSchema } from './schema';

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
const FEATURES_WORKSPACE_GLOB = 'libs/backend/features/*';

function validateName(name: string): void {
  if (!name || !NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid feature name "${name}". Use lowercase letters, digits and dashes, starting with a letter (e.g. "orders", "user-profile").`,
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

export default async function featureGenerator(
  tree: Tree,
  options: FeatureGeneratorSchema,
): Promise<void> {
  validateName(options.name);

  const projectRoot = joinPathFragments(
    'libs/backend/features',
    options.name,
  );

  if (tree.exists(projectRoot)) {
    throw new Error(
      `"${projectRoot}" already exists. Refusing to overwrite an existing feature.`,
    );
  }

  const nameVariants = names(options.name);
  const projectName = `backend-features-${nameVariants.fileName}`;

  generateFiles(tree, joinPathFragments(__dirname, 'files'), projectRoot, {
    ...nameVariants,
    projectName,
    tmpl: '',
  });

  ensureWorkspaceGlob(tree);

  await formatFiles(tree);
}
