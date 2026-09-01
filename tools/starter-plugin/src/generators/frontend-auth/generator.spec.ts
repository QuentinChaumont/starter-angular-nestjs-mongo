import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import frontendAuthGenerator from './generator';

const APP_CONFIG = 'apps/frontend/src/app/app.config.ts';
const APP_ROUTES = 'apps/frontend/src/app/app.routes.ts';

function seed(tree: Tree): void {
  tree.write('libs/frontend/design/project.json', '{}');
  tree.write('libs/backend/auth/package.json', '{}');
  tree.write('libs/frontend/core/src/index.ts', '');
  tree.write(
    APP_CONFIG,
    `import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(appRoutes)],
};
`,
  );
  tree.write(
    APP_ROUTES,
    `import { Route } from '@angular/router';

export const appRoutes: Route[] = [];
`,
  );
  tree.write('tsconfig.base.json', JSON.stringify({ compilerOptions: { paths: {} } }));
}

describe('frontend-auth generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seed(tree);
  });

  it('refuses without the design brick', async () => {
    tree.delete('libs/frontend/design/project.json');
    await expect(frontendAuthGenerator(tree)).rejects.toThrow(/design brick/);
  });

  it('refuses without the backend auth brick', async () => {
    tree.delete('libs/backend/auth/package.json');
    await expect(frontendAuthGenerator(tree)).rejects.toThrow(
      /backend auth brick/,
    );
  });

  it('copies the lib and wires providers + routes', async () => {
    await frontendAuthGenerator(tree);

    expect(tree.exists('libs/frontend/auth/project.json')).toBe(true);
    expect(tree.exists('libs/frontend/auth/src/lib/auth.interceptor.ts')).toBe(
      true,
    );
    expect(tree.exists('libs/frontend/core/src/lib/api-base-url.ts')).toBe(true);
    expect(tree.read('libs/frontend/core/src/index.ts', 'utf-8')).toContain(
      'api-base-url',
    );

    const appConfig = tree.read(APP_CONFIG, 'utf-8') as string;
    expect(appConfig).toContain("from '@org/frontend-auth'");
    expect(appConfig).toContain('provideAuth()');
    expect(appConfig).toMatch(
      /withInterceptors\(\s*\[\s*csrfInterceptor\s*,\s*authInterceptor\s*[\],]/,
    );
    expect(appConfig).toContain("from '@angular/common/http'");

    const routes = tree.read(APP_ROUTES, 'utf-8') as string;
    expect(routes).toContain('m.LoginPage');
    expect(routes).toContain('m.OidcCallback');
    expect(routes).toContain("path: 'login'");
    expect(routes).toContain("path: 'auth/callback'");

    expect(
      readJson(tree, 'tsconfig.base.json').compilerOptions.paths[
        '@org/frontend-auth'
      ],
    ).toEqual(['./libs/frontend/auth/src/index.ts']);
  });

  it('is idempotent', async () => {
    await frontendAuthGenerator(tree);
    await frontendAuthGenerator(tree);

    const appConfig = tree.read(APP_CONFIG, 'utf-8') as string;
    expect(appConfig.split("from '@org/frontend-auth'").length - 1).toBe(1);
    expect((appConfig.match(/provideAuth\(\)/g) ?? []).length).toBe(1);
    expect((appConfig.match(/csrfInterceptor/g) ?? []).length).toBe(2); // import + array
    expect((appConfig.match(/provideHttpClient/g) ?? []).length).toBe(2); // import + call

    const routes = tree.read(APP_ROUTES, 'utf-8') as string;
    expect((routes.match(/m\.LoginPage/g) ?? []).length).toBe(1);
    expect((routes.match(/m\.OidcCallback/g) ?? []).length).toBe(1);
  });
});
