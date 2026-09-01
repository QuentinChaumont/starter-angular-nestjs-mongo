import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import frontendDesignGenerator from './generator';

const APP_CONFIG_PATH = 'apps/frontend/src/app/app.config.ts';
const STYLES_PATH = 'apps/frontend/src/styles.scss';

function seedWorkspace(tree: Tree): void {
  tree.write(
    APP_CONFIG_PATH,
    `import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(appRoutes)],
};
`,
  );
  tree.write(STYLES_PATH, '/* Global styles */\n');

  tree.write(
    'package.json',
    JSON.stringify({
      name: '@org/source',
      dependencies: { '@angular/core': '~22.0.4' },
      devDependencies: {},
    }),
  );
  tree.write(
    'tsconfig.base.json',
    JSON.stringify({ compilerOptions: { paths: {} } }),
  );
}

describe('frontend-design generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seedWorkspace(tree);
  });

  it('copies the lib and wires it into the app', async () => {
    await frontendDesignGenerator(tree);

    expect(tree.exists('libs/frontend/design/project.json')).toBe(true);
    expect(
      tree.exists('libs/frontend/design/src/lib/theme/design.config.ts'),
    ).toBe(true);
    expect(
      tree.exists('libs/frontend/design/src/lib/theme/_theme.scss'),
    ).toBe(true);

    const appConfig = tree.read(APP_CONFIG_PATH, 'utf-8') as string;
    expect(appConfig).toContain("from '@org/frontend-design'");
    expect(appConfig).toContain('materialProviders');
    expect(appConfig).toContain('provideTheme');
    expect(appConfig).toMatch(/providers:\s*\[[^\]]*\.\.\.materialProviders/);
    expect(appConfig).toMatch(/providers:\s*\[[^\]]*provideTheme\(\)/);

    const styles = tree.read(STYLES_PATH, 'utf-8') as string;
    expect(styles).toContain(
      "@use '../../../libs/frontend/design/src/lib/theme/theme';",
    );

    const tsconfig = readJson(tree, 'tsconfig.base.json');
    expect(tsconfig.compilerOptions.paths['@org/frontend-design']).toEqual([
      './libs/frontend/design/src/index.ts',
    ]);
  });

  it('adds Material / CDK / animations at the installed Angular version', async () => {
    await frontendDesignGenerator(tree);

    const packageJson = readJson(tree, 'package.json');
    expect(packageJson.dependencies['@angular/material']).toBe('~22.0.4');
    expect(packageJson.dependencies['@angular/cdk']).toBe('~22.0.4');
    expect(packageJson.dependencies['@angular/animations']).toBe('~22.0.4');
  });

  it('creates DESIGN.md when absent and never overwrites an existing one', async () => {
    await frontendDesignGenerator(tree);
    expect(tree.read('DESIGN.md', 'utf-8')).toContain('DESIGN');

    tree.write('DESIGN.md', 'CUSTOM PROJECT DESIGN DOC');
    await frontendDesignGenerator(tree);
    expect(tree.read('DESIGN.md', 'utf-8')).toBe('CUSTOM PROJECT DESIGN DOC');
  });

  it('is idempotent: running twice does not duplicate wiring', async () => {
    await frontendDesignGenerator(tree);
    await frontendDesignGenerator(tree);

    const appConfig = tree.read(APP_CONFIG_PATH, 'utf-8') as string;
    expect(appConfig.split("from '@org/frontend-design'").length - 1).toBe(1);
    const providersArray = appConfig.match(/providers:\s*\[([^\]]*)\]/)?.[1] ?? '';
    expect(providersArray.match(/\.\.\.materialProviders/g)?.length).toBe(1);
    expect(providersArray.match(/provideTheme\(\)/g)?.length).toBe(1);

    const styles = tree.read(STYLES_PATH, 'utf-8') as string;
    expect(styles.match(/@use '.*theme';/g)?.length).toBe(1);
  });
});
