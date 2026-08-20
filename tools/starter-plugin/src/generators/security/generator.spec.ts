import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import securityGenerator from './generator';

const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';
const MAIN_TS_PATH = 'apps/backend/src/main.ts';
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
    MAIN_TS_PATH,
    `import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppConfigService, AppLogger } from '@org/backend-core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(AppLogger);
  logger.setContext('Bootstrap');
  app.useLogger(logger);

  const config = app.get(AppConfigService);
  await app.listen(config.app.port);
}

bootstrap();
`,
  );

  tree.write(
    CORE_INDEX_PATH,
    `export * from './lib/config';
export * from './lib/http';
`,
  );
}

describe('security generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seedWorkspace(tree);
  });

  it('copies the security subfolder into backend-core when missing', async () => {
    await securityGenerator(tree);

    expect(
      tree.exists('libs/backend/core/src/lib/security/setup-security.ts'),
    ).toBe(true);
    expect(
      tree.exists('libs/backend/core/src/lib/security/app-security.module.ts'),
    ).toBe(true);
  });

  it('exports the security subfolder from the core barrel', async () => {
    await securityGenerator(tree);

    const content = tree.read(CORE_INDEX_PATH, 'utf-8');
    expect(content).toContain("export * from './lib/security';");
  });

  it('wires AppSecurityModule into the app module', async () => {
    await securityGenerator(tree);

    const content = tree.read(APP_MODULE_PATH, 'utf-8');
    expect(content).toContain(
      "import { AppConfigModule, LoggerModule, AppSecurityModule } from '@org/backend-core';",
    );
    expect(content).toMatch(/imports:\s*\[[^\]]*AppSecurityModule/);
  });

  it('wires setupSecurity() and the ThrottlerGuard into main.ts', async () => {
    await securityGenerator(tree);

    const content = tree.read(MAIN_TS_PATH, 'utf-8') as string;
    expect(content).toContain(
      "import { ThrottlerGuard } from '@nestjs/throttler';",
    );
    expect(content).toContain('setupSecurity(app);');
    expect(content).toContain('app.useGlobalGuards(app.get(ThrottlerGuard));');

    const loggerLine = content.indexOf('app.useLogger(logger);');
    const setupLine = content.indexOf('setupSecurity(app);');
    const guardLine = content.indexOf('app.useGlobalGuards(app.get(ThrottlerGuard));');
    expect(loggerLine).toBeLessThan(setupLine);
    expect(setupLine).toBeLessThan(guardLine);
  });

  it('adds only helmet and @nestjs/throttler to package.json, not every backend-core dependency', async () => {
    await securityGenerator(tree);

    const packageJson = JSON.parse(
      tree.read('package.json', 'utf-8') as string,
    );
    expect(packageJson.dependencies['helmet']).toBeDefined();
    expect(packageJson.dependencies['@nestjs/throttler']).toBeDefined();
    expect(packageJson.dependencies['@nestjs/swagger']).toBeUndefined();
  });

  it('is idempotent: running twice does not duplicate wiring', async () => {
    await securityGenerator(tree);
    await securityGenerator(tree);

    const appModuleContent = tree.read(APP_MODULE_PATH, 'utf-8') as string;
    const arrayMatch = appModuleContent.match(/imports:\s*\[([^\]]*)\]/);
    expect(
      (arrayMatch?.[1].match(/\bAppSecurityModule\b/g) ?? []).length,
    ).toBe(1);

    const mainContent = tree.read(MAIN_TS_PATH, 'utf-8') as string;
    expect(
      (mainContent.match(/setupSecurity\(app\);/g) ?? []).length,
    ).toBe(1);
    expect(
      (mainContent.match(/app\.useGlobalGuards\(app\.get\(ThrottlerGuard\)\);/g) ?? [])
        .length,
    ).toBe(1);

    const coreIndexContent = tree.read(CORE_INDEX_PATH, 'utf-8') as string;
    expect(
      (coreIndexContent.match(/export \* from '\.\/lib\/security';/g) ?? [])
        .length,
    ).toBe(1);
  });
});
