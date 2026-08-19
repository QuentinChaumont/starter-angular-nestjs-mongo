import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import featureGenerator from './generator';

describe('feature generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('generates a minimal backend feature library', async () => {
    await featureGenerator(tree, { name: 'orders' });

    expect(tree.exists('libs/backend/features/orders/src/index.ts')).toBe(
      true,
    );
    expect(
      tree.exists('libs/backend/features/orders/src/lib/orders.module.ts'),
    ).toBe(true);
    expect(tree.exists('libs/backend/features/orders/package.json')).toBe(
      true,
    );
    expect(tree.exists('libs/backend/features/orders/tsconfig.json')).toBe(
      true,
    );
    expect(tree.exists('libs/backend/features/orders/jest.config.cts')).toBe(
      true,
    );

    const moduleContent = tree.read(
      'libs/backend/features/orders/src/lib/orders.module.ts',
      'utf-8',
    );
    expect(moduleContent).toContain('export class OrdersModule');

    const indexContent = tree.read(
      'libs/backend/features/orders/src/index.ts',
      'utf-8',
    );
    expect(indexContent).toContain("./lib/orders.module");

    const packageJson = JSON.parse(
      tree.read(
        'libs/backend/features/orders/package.json',
        'utf-8',
      ) as string,
    );
    expect(packageJson.name).toBe('@org/backend-features-orders');
    expect(packageJson.nx.tags).toEqual(['scope:backend', 'type:feature']);
  });

  it('supports multi-word, dash-cased names', async () => {
    await featureGenerator(tree, { name: 'user-profile' });

    const moduleContent = tree.read(
      'libs/backend/features/user-profile/src/lib/user-profile.module.ts',
      'utf-8',
    );
    expect(moduleContent).toContain('export class UserProfileModule');
  });

  it.each(['Not Valid!', '123abc', 'UPPERCASE', ''])(
    'rejects the invalid name "%s"',
    async (name) => {
      await expect(featureGenerator(tree, { name })).rejects.toThrow(
        /Invalid feature name/,
      );
    },
  );

  it('refuses to overwrite an existing feature', async () => {
    await featureGenerator(tree, { name: 'orders' });

    await expect(featureGenerator(tree, { name: 'orders' })).rejects.toThrow(
      /already exists/,
    );
  });
});
