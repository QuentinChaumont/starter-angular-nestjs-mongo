import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import mongoGenerator from './generator';

const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';

function seedAppModule(tree: Tree): void {
  tree.write(
    APP_MODULE_PATH,
    `import { Module } from '@nestjs/common';
import { AppConfigModule, LoggerModule } from '@org/backend-core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AppConfigModule, LoggerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
`,
  );
}

describe('mongo generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seedAppModule(tree);
  });

  it('copies the Mongo lib into the workspace when missing', async () => {
    await mongoGenerator(tree);

    expect(tree.exists('libs/backend/database/mongo/package.json')).toBe(true);
    expect(
      tree.exists('libs/backend/database/mongo/src/lib/mongo.module.ts'),
    ).toBe(true);
    expect(
      tree.exists(
        'libs/backend/database/mongo/src/lib/health/mongo-readiness.controller.ts',
      ),
    ).toBe(true);
  });

  it('adds MongoModule to the app module imports', async () => {
    await mongoGenerator(tree);

    const content = tree.read(APP_MODULE_PATH, 'utf-8');
    expect(content).toContain(
      "import { MongoModule } from '@org/backend-database-mongo';",
    );
    expect(content).toMatch(/imports:\s*\[[^\]]*MongoModule/);
  });

  it('adds the Mongo lib real dependencies to package.json, excluding internal @org/* libs', async () => {
    await mongoGenerator(tree);

    const packageJson = JSON.parse(
      tree.read('package.json', 'utf-8') as string,
    );
    expect(packageJson.dependencies['@nestjs/mongoose']).toBeDefined();
    expect(packageJson.dependencies['mongoose']).toBeDefined();
    expect(packageJson.dependencies['@nestjs/terminus']).toBeDefined();
    expect(packageJson.dependencies['@org/backend-core']).toBeUndefined();
  });

  it('is idempotent: running twice does not duplicate the import or array entry', async () => {
    await mongoGenerator(tree);
    await mongoGenerator(tree);

    const content = tree.read(APP_MODULE_PATH, 'utf-8') as string;
    const importLineOccurrences = content
      .split("from '@org/backend-database-mongo'")
      .length -1;
    expect(importLineOccurrences).toBe(1);

    const arrayMatch = content.match(/imports:\s*\[([^\]]*)\]/);
    const mongoModuleCountInArray = (
      arrayMatch?.[1].match(/\bMongoModule\b/g) ?? []
    ).length;
    expect(mongoModuleCountInArray).toBe(1);
  });

  it('does not overwrite an already-installed lib', async () => {
    tree.write(
      'libs/backend/database/mongo/package.json',
      JSON.stringify({ custom: true }),
    );

    await mongoGenerator(tree);

    const content = JSON.parse(
      tree.read('libs/backend/database/mongo/package.json', 'utf-8') as string,
    );
    expect(content.custom).toBe(true);
  });
});
