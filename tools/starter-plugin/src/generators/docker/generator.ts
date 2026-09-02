import { GeneratorCallback, Tree } from '@nx/devkit';
import { readFileSync } from 'fs';
import { join } from 'path';

const WORKSPACE_ROOT = join(__dirname, '../../../../../');

/** Committed files copied verbatim into a fresh workspace. */
const FILES = [
  'apps/backend/Dockerfile',
  'apps/frontend/Dockerfile',
  'apps/frontend/nginx.conf',
  'docker-compose.yml',
  '.dockerignore',
];

/**
 * Adds Docker packaging: a multi-stage build for the NestJS API
 * (`node:22-alpine`, prod deps only, `/api/health/live` HEALTHCHECK), an
 * nginx image for the Angular SPA (SPA fallback + `/api` proxy), and a
 * `docker-compose.yml` wiring both to `mongo:7`. Opt-in — nothing here runs
 * at dev time. Idempotent (never overwrites an existing file).
 */
export default async function dockerGenerator(
  tree: Tree,
): Promise<GeneratorCallback | void> {
  for (const relativePath of FILES) {
    if (tree.exists(relativePath)) {
      continue;
    }
    tree.write(
      relativePath,
      readFileSync(join(WORKSPACE_ROOT, relativePath), 'utf-8'),
    );
  }
}
