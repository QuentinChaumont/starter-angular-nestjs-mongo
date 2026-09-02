import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import authGenerator from './generator';

const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';

function seedAppModule(tree: Tree): void {
  tree.write(
    APP_MODULE_PATH,
    `import { Module } from '@nestjs/common';
import { AppConfigModule, LoggerModule } from '@org/backend-core';
import { MongoModule } from '@org/backend-database-mongo';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AppConfigModule, LoggerModule, MongoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`,
  );
}

function seedMongoAndUserEntity(tree: Tree): void {
  tree.write('libs/backend/database/mongo/package.json', '{}');
  tree.write('libs/backend/features/user/src/lib/user.module.ts', 'export class UserModule {}');
  tree.write(
    'apps/backend/webpack.config.js',
    `module.exports = {
  plugins: [
    new NxAppWebpackPlugin({
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
    }),
  ],
};
`,
  );
  tree.write(
    'apps/backend/package.json',
    JSON.stringify({ name: '@org/backend', nx: { targets: {} } }, null, 2),
  );
}

describe('auth generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seedAppModule(tree);
  });

  it('refuses to install without the Mongo brick', async () => {
    await expect(authGenerator(tree)).rejects.toThrow(/requires the Mongo brick/);
  });

  it('refuses to install without a "user" feature entity', async () => {
    tree.write('libs/backend/database/mongo/package.json', '{}');

    await expect(authGenerator(tree)).rejects.toThrow(/requires a "user" feature entity/);
  });

  it('copies the auth lib and wires AuthModule once prerequisites are met', async () => {
    seedMongoAndUserEntity(tree);

    await authGenerator(tree);

    expect(tree.exists('libs/backend/auth/package.json')).toBe(true);
    expect(tree.exists('libs/backend/auth/src/lib/auth.module.ts')).toBe(true);
    expect(
      tree.exists('libs/backend/auth/src/lib/guards/auth-throttler.guard.ts'),
    ).toBe(true);

    const content = tree.read(APP_MODULE_PATH, 'utf-8');
    expect(content).toContain(
      "import { AuthModule } from '@org/backend-auth';",
    );
    expect(content).toMatch(/imports:\s*\[[^\]]*AuthModule/);
  });

  it('adds the auth lib real dependencies to package.json, excluding internal @org/* libs', async () => {
    seedMongoAndUserEntity(tree);

    await authGenerator(tree);

    const packageJson = JSON.parse(
      tree.read('package.json', 'utf-8') as string,
    );
    expect(packageJson.dependencies['passport']).toBeDefined();
    expect(packageJson.dependencies['passport-jwt']).toBeDefined();
    expect(packageJson.dependencies['@nestjs/jwt']).toBeDefined();
    expect(packageJson.dependencies['@org/backend-core']).toBeUndefined();
  });

  it('also brings along backend-testing, since Auth specs depend on it', async () => {
    seedMongoAndUserEntity(tree);

    await authGenerator(tree);

    expect(tree.exists('libs/backend/testing/package.json')).toBe(true);
    expect(tree.exists('libs/backend/testing/src/lib/sign-test-jwt.ts')).toBe(
      true,
    );
  });

  it('wires the seed-admin entry point, target and script', async () => {
    seedMongoAndUserEntity(tree);

    await authGenerator(tree);

    expect(tree.exists('apps/backend/src/seed-admin.ts')).toBe(true);
    expect(tree.read('apps/backend/webpack.config.js', 'utf-8')).toContain(
      "entryName: 'seed-admin'",
    );
    const backendPkg = JSON.parse(
      tree.read('apps/backend/package.json', 'utf-8') as string,
    );
    expect(backendPkg.nx.targets['seed-admin'].options.command).toBe(
      'node apps/backend/dist/seed-admin.js',
    );
    const rootPkg = JSON.parse(tree.read('package.json', 'utf-8') as string);
    expect(rootPkg.scripts['seed:admin']).toBe('nx run @org/backend:seed-admin');
  });

  it('is idempotent: running twice does not duplicate wiring', async () => {
    seedMongoAndUserEntity(tree);

    await authGenerator(tree);
    await authGenerator(tree);

    const content = tree.read(APP_MODULE_PATH, 'utf-8') as string;
    const importLineOccurrences =
      content.split("from '@org/backend-auth'").length - 1;
    expect(importLineOccurrences).toBe(1);

    const arrayMatch = content.match(/imports:\s*\[([^\]]*)\]/);
    const authModuleCountInArray = (
      arrayMatch?.[1].match(/\bAuthModule\b/g) ?? []
    ).length;
    expect(authModuleCountInArray).toBe(1);

    const webpack = tree.read('apps/backend/webpack.config.js', 'utf-8') as string;
    expect((webpack.match(/entryName: 'seed-admin'/g) ?? []).length).toBe(1);
  });
});
