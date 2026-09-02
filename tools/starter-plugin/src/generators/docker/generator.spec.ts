import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import dockerGenerator from './generator';

const FILES = [
  'apps/backend/Dockerfile',
  'apps/frontend/Dockerfile',
  'apps/frontend/nginx.conf',
  'docker-compose.yml',
  '.dockerignore',
];

describe('docker generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('drops the packaging files', async () => {
    await dockerGenerator(tree);

    for (const file of FILES) {
      expect(tree.exists(file)).toBe(true);
    }
    expect(tree.read('apps/backend/Dockerfile', 'utf-8')).toContain(
      'nx run @org/backend:prune',
    );
    expect(tree.read('apps/frontend/nginx.conf', 'utf-8')).toContain(
      'proxy_pass http://backend:3000',
    );
    expect(tree.read('docker-compose.yml', 'utf-8')).toContain('mongo:7');
  });

  it('never overwrites an existing file', async () => {
    tree.write('docker-compose.yml', '# hand-edited\n');
    await dockerGenerator(tree);

    expect(tree.read('docker-compose.yml', 'utf-8')).toBe('# hand-edited\n');
    // the others are still created
    expect(tree.exists('apps/backend/Dockerfile')).toBe(true);
  });
});
