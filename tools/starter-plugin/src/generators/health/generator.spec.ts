import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import healthGenerator from './generator';

const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';
const CORE_INDEX_PATH = 'libs/backend/core/src/index.ts';

function seedWorkspace(tree: Tree): void {
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

  tree.write(
    CORE_INDEX_PATH,
    `export * from './lib/config';
export * from './lib/http';
`,
  );
}

describe('health generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seedWorkspace(tree);
  });

  it('copies the health subfolder into backend-core when missing', async () => {
    await healthGenerator(tree);

    expect(
      tree.exists('libs/backend/core/src/lib/health/health.module.ts'),
    ).toBe(true);
    expect(
      tree.exists('libs/backend/core/src/lib/health/liveness.controller.ts'),
    ).toBe(true);
  });

  it('exports the health subfolder from the core barrel', async () => {
    await healthGenerator(tree);

    const content = tree.read(CORE_INDEX_PATH, 'utf-8');
    expect(content).toContain("export * from './lib/health';");
  });

  it('wires HealthModule into the app module', async () => {
    await healthGenerator(tree);

    const content = tree.read(APP_MODULE_PATH, 'utf-8');
    expect(content).toContain(
      "import { AppConfigModule, LoggerModule, HealthModule } from '@org/backend-core';",
    );
    expect(content).toMatch(/imports:\s*\[[^\]]*HealthModule/);
  });

  it('adds only @nestjs/terminus to package.json', async () => {
    await healthGenerator(tree);

    const packageJson = JSON.parse(
      tree.read('package.json', 'utf-8') as string,
    );
    expect(packageJson.dependencies['@nestjs/terminus']).toBeDefined();
    expect(packageJson.dependencies['helmet']).toBeUndefined();
  });

  it('is idempotent: running twice does not duplicate wiring', async () => {
    await healthGenerator(tree);
    await healthGenerator(tree);

    const appModuleContent = tree.read(APP_MODULE_PATH, 'utf-8') as string;
    const arrayMatch = appModuleContent.match(/imports:\s*\[([^\]]*)\]/);
    expect((arrayMatch?.[1].match(/\bHealthModule\b/g) ?? []).length).toBe(1);

    const coreIndexContent = tree.read(CORE_INDEX_PATH, 'utf-8') as string;
    expect(
      (coreIndexContent.match(/export \* from '\.\/lib\/health';/g) ?? [])
        .length,
    ).toBe(1);
  });
});
