import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import entityGenerator from './generator';

describe('entity generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('generates a minimal entity library without a controller', async () => {
    await entityGenerator(tree, { name: 'user' });

    const root = 'libs/backend/features/user';
    expect(tree.exists(`${root}/src/index.ts`)).toBe(true);
    expect(tree.exists(`${root}/src/lib/user.module.ts`)).toBe(true);
    expect(tree.exists(`${root}/src/lib/user.service.ts`)).toBe(true);
    expect(tree.exists(`${root}/src/lib/user.repository.ts`)).toBe(true);
    expect(tree.exists(`${root}/src/lib/user.schema.ts`)).toBe(true);
    expect(tree.exists(`${root}/src/lib/models/user.model.ts`)).toBe(true);
    expect(tree.exists(`${root}/package.json`)).toBe(true);
    expect(tree.exists(`${root}/tsconfig.json`)).toBe(true);
    expect(tree.exists(`${root}/jest.config.cts`)).toBe(true);

    expect(tree.exists(`${root}/src/lib/user.controller.ts`)).toBe(false);
    expect(tree.exists(`${root}/src/lib/dto/create-user.dto.ts`)).toBe(false);
    expect(tree.exists(`${root}/src/lib/dto/update-user.dto.ts`)).toBe(false);

    const moduleContent = tree.read(`${root}/src/lib/user.module.ts`, 'utf-8');
    expect(moduleContent).toContain('export class UserModule');
    expect(moduleContent).toContain('controllers: []');
    expect(moduleContent).not.toContain('UserController');

    const serviceContent = tree.read(
      `${root}/src/lib/user.service.ts`,
      'utf-8',
    );
    expect(serviceContent).toContain('export class UserService');
    expect(serviceContent).toContain("'USER_NOT_FOUND'");

    const repositoryContent = tree.read(
      `${root}/src/lib/user.repository.ts`,
      'utf-8',
    );
    expect(repositoryContent).toContain('export class UserRepository');
    expect(repositoryContent).toContain('extends BaseRepository<User>');

    const indexContent = tree.read(`${root}/src/index.ts`, 'utf-8');
    expect(indexContent).toContain("./lib/user.module");
    expect(indexContent).not.toContain('controller');

    const packageJson = JSON.parse(
      tree.read(`${root}/package.json`, 'utf-8') as string,
    );
    expect(packageJson.name).toBe('@org/backend-features-user');
    expect(packageJson.nx.tags).toEqual(['scope:backend', 'type:feature']);
    expect(packageJson.dependencies['@nestjs/swagger']).toBeUndefined();
  });

  it('also generates a REST controller and DTOs with --crud', async () => {
    await entityGenerator(tree, { name: 'user', crud: true });

    const root = 'libs/backend/features/user';
    expect(tree.exists(`${root}/src/lib/user.controller.ts`)).toBe(true);
    expect(tree.exists(`${root}/src/lib/dto/create-user.dto.ts`)).toBe(true);
    expect(tree.exists(`${root}/src/lib/dto/update-user.dto.ts`)).toBe(true);

    const moduleContent = tree.read(`${root}/src/lib/user.module.ts`, 'utf-8');
    expect(moduleContent).toContain('controllers: [UserController]');

    const controllerContent = tree.read(
      `${root}/src/lib/user.controller.ts`,
      'utf-8',
    );
    expect(controllerContent).toContain("@Controller('users')");
    expect(controllerContent).toContain('export class UserController');

    const indexContent = tree.read(`${root}/src/index.ts`, 'utf-8');
    expect(indexContent).toContain('./lib/user.controller');

    const packageJson = JSON.parse(
      tree.read(`${root}/package.json`, 'utf-8') as string,
    );
    expect(packageJson.dependencies['@nestjs/swagger']).toBeDefined();
  });

  it('supports multi-word, dash-cased names', async () => {
    await entityGenerator(tree, { name: 'user-profile', crud: true });

    const root = 'libs/backend/features/user-profile';
    const moduleContent = tree.read(
      `${root}/src/lib/user-profile.module.ts`,
      'utf-8',
    );
    expect(moduleContent).toContain('export class UserProfileModule');

    const controllerContent = tree.read(
      `${root}/src/lib/user-profile.controller.ts`,
      'utf-8',
    );
    expect(controllerContent).toContain("@Controller('user-profiles')");
  });

  it.each(['Not Valid!', '123abc', 'UPPERCASE', ''])(
    'rejects the invalid name "%s"',
    async (name) => {
      await expect(entityGenerator(tree, { name })).rejects.toThrow(
        /Invalid entity name/,
      );
    },
  );

  it('refuses to overwrite an existing entity', async () => {
    await entityGenerator(tree, { name: 'user' });

    await expect(entityGenerator(tree, { name: 'user' })).rejects.toThrow(
      /already exists/,
    );
  });
});
