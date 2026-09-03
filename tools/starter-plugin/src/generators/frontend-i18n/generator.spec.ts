import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import frontendI18nGenerator from './generator';

const APP_CONFIG = 'apps/frontend/src/app/app.config.ts';

function seed(tree: Tree): void {
  tree.write('libs/frontend/design/project.json', '{}');
  tree.write('libs/frontend/core/src/index.ts', '');
  tree.write(
    APP_CONFIG,
    `import { ApplicationConfig } from '@angular/core';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(appRoutes)],
};
`,
  );
  tree.write(
    'package.json',
    JSON.stringify({
      name: '@org/source',
      dependencies: { '@jsverse/transloco': '^8.4.0' },
      devDependencies: {},
    }),
  );
  tree.write(
    'tsconfig.base.json',
    JSON.stringify({ compilerOptions: { paths: {} } }),
  );
}

describe('frontend-i18n generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seed(tree);
  });

  it('refuses without the design brick', async () => {
    tree.delete('libs/frontend/design/project.json');
    await expect(frontendI18nGenerator(tree)).rejects.toThrow(/design brick/);
  });

  it('copies the lib and wires provideI18n() + the tsconfig path', async () => {
    await frontendI18nGenerator(tree);

    expect(tree.exists('libs/frontend/i18n/src/lib/provide-i18n.ts')).toBe(true);
    expect(tree.exists('libs/frontend/i18n/src/lib/lang-switcher.ts')).toBe(true);
    expect(tree.exists('libs/frontend/i18n/src/lib/i18n/fr.ts')).toBe(true);

    const config = tree.read(APP_CONFIG, 'utf-8') as string;
    expect(config).toContain(
      "import { provideI18n } from '@org/frontend-i18n';",
    );
    expect(config).toMatch(/providers:\s*\[[^\]]*provideI18n\(\)/);

    expect(
      readJson(tree, 'tsconfig.base.json').compilerOptions.paths[
        '@org/frontend-i18n'
      ],
    ).toEqual(['./libs/frontend/i18n/src/index.ts']);

    expect(readJson(tree, 'package.json').dependencies['@jsverse/transloco']).toBe(
      '^8.4.0',
    );
  });

  it('is idempotent', async () => {
    await frontendI18nGenerator(tree);
    await frontendI18nGenerator(tree);

    const config = tree.read(APP_CONFIG, 'utf-8') as string;
    expect(config.split("from '@org/frontend-i18n'").length - 1).toBe(1);
    expect((config.match(/provideI18n\(\)/g) ?? []).length).toBe(1);
  });
});
