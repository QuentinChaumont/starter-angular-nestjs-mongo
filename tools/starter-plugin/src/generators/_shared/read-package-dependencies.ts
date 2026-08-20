import { readFileSync } from 'fs';
import { join } from 'path';

function readPackageJsonSection(
  packageJsonDir: string,
  key: 'dependencies' | 'devDependencies',
): Record<string, string> {
  const packageJson = JSON.parse(
    readFileSync(join(packageJsonDir, 'package.json'), 'utf-8'),
  );
  const section: Record<string, string> = packageJson[key] ?? {};

  return Object.fromEntries(
    Object.entries(section).filter(([name]) => !name.startsWith('@org/')),
  );
}

/**
 * Reads the real (non-`@org/*` workspace-internal) "dependencies" of a
 * lib's own package.json from disk. Deriving the npm packages a brick needs
 * from its actual manifest — rather than hardcoding a duplicate list per
 * generator — keeps the two from drifting apart as the lib's dependencies
 * change. Internal `@org/*` libs are excluded: they're resolved through the
 * npm workspaces glob, not installed from a registry.
 */
export function readPackageDependencies(
  packageJsonDir: string,
): Record<string, string> {
  return readPackageJsonSection(packageJsonDir, 'dependencies');
}

/**
 * Picks a subset of named dependencies out of a package.json's
 * "dependencies", by version, from disk. Used when only part of a lib's
 * manifest belongs to the brick being installed — e.g. `libs/backend/core`
 * hosts several bricks (openapi, security, health, ...) sharing one
 * package.json, so a brick generator picks just its own packages rather
 * than pulling in every other brick's dependencies too.
 */
export function pickPackageDependencies(
  packageJsonDir: string,
  names: string[],
): Record<string, string> {
  const packageJson = JSON.parse(
    readFileSync(join(packageJsonDir, 'package.json'), 'utf-8'),
  );
  const dependencies: Record<string, string> = packageJson.dependencies ?? {};

  const picked: Record<string, string> = {};
  for (const name of names) {
    const version = dependencies[name];
    if (version === undefined) {
      throw new Error(
        `Expected "${name}" to be a dependency in ${packageJsonDir}/package.json.`,
      );
    }
    picked[name] = version;
  }
  return picked;
}
