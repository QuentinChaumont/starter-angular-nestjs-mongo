import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import frontendFeedbackGenerator from './generator';

const APP_CONFIG = 'apps/frontend/src/app/app.config.ts';

function seed(tree: Tree, providers: string): void {
  tree.write('libs/frontend/design/project.json', '{}');
  tree.write(
    APP_CONFIG,
    `import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [${providers}],
};
`,
  );
  tree.write('tsconfig.base.json', JSON.stringify({ compilerOptions: { paths: {} } }));
}

describe('frontend-feedback generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('refuses without the design brick', async () => {
    seed(tree, 'provideRouter(appRoutes)');
    tree.delete('libs/frontend/design/project.json');
    await expect(frontendFeedbackGenerator(tree)).rejects.toThrow(/design brick/);
  });

  it('appends httpErrorInterceptor after an existing interceptor list', async () => {
    seed(
      tree,
      'provideHttpClient(withInterceptors([csrfInterceptor, authInterceptor])), provideRouter(appRoutes)',
    );

    await frontendFeedbackGenerator(tree);

    const config = tree.read(APP_CONFIG, 'utf-8') as string;
    expect(config).toMatch(
      /withInterceptors\(\s*\[\s*csrfInterceptor\s*,\s*authInterceptor\s*,\s*httpErrorInterceptor\s*[\],]/,
    );
    expect(config).toContain('provideFeedback()');
    expect(config).toContain("from '@org/frontend-feedback'");
  });

  it('creates provideHttpClient when there is none yet', async () => {
    seed(tree, 'provideRouter(appRoutes)');

    await frontendFeedbackGenerator(tree);

    const config = tree.read(APP_CONFIG, 'utf-8') as string;
    expect(config).toMatch(
      /provideHttpClient\(\s*withInterceptors\(\s*\[\s*httpErrorInterceptor\s*\]/,
    );
    expect(
      readJson(tree, 'tsconfig.base.json').compilerOptions.paths[
        '@org/frontend-feedback'
      ],
    ).toEqual(['./libs/frontend/feedback/src/index.ts']);
  });

  it('is idempotent', async () => {
    seed(
      tree,
      'provideHttpClient(withInterceptors([authInterceptor])), provideRouter(appRoutes)',
    );
    await frontendFeedbackGenerator(tree);
    await frontendFeedbackGenerator(tree);

    const config = tree.read(APP_CONFIG, 'utf-8') as string;
    expect((config.match(/httpErrorInterceptor/g) ?? []).length).toBe(2); // import + array
    expect((config.match(/provideFeedback\(\)/g) ?? []).length).toBe(1);
  });
});
