import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import frontendDashboardGenerator from './generator';

const APP_CONFIG = 'apps/frontend/src/app/app.config.ts';
const APP_ROUTES = 'apps/frontend/src/app/app.routes.ts';

function seed(tree: Tree): void {
  tree.write('libs/frontend/auth/project.json', '{}');
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

export const appRoutes: Route[] = [
  { path: 'login', component: LoginPage },
];
`,
  );
  tree.write(
    'tsconfig.base.json',
    JSON.stringify({ compilerOptions: { paths: {} } }),
  );
}

describe('frontend-dashboard generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seed(tree);
  });

  it('refuses without the auth brick', async () => {
    tree.delete('libs/frontend/auth/project.json');
    await expect(frontendDashboardGenerator(tree)).rejects.toThrow(
      /auth brick/,
    );
  });

  it('copies the lib and wires the shell routes + provider', async () => {
    await frontendDashboardGenerator(tree);

    expect(
      tree.exists('libs/frontend/dashboard/src/lib/shell/dashboard-shell.ts'),
    ).toBe(true);
    expect(tree.exists('apps/frontend/src/app/dashboard-nav.ts')).toBe(true);

    const config = tree.read(APP_CONFIG, 'utf-8') as string;
    expect(config).toContain(
      "import { provideDashboard } from '@org/frontend-dashboard';",
    );
    expect(config).toContain("import { DASHBOARD_NAV } from './dashboard-nav';");
    expect(config).toMatch(
      /providers:\s*\[[^\]]*provideDashboard\(DASHBOARD_NAV\)/,
    );

    const routes = tree.read(APP_ROUTES, 'utf-8') as string;
    expect(routes).toContain("import { authGuard, roleGuard } from '@org/frontend-auth';");
    expect(routes).toContain(
      "import('@org/frontend-dashboard/shell').then((m) => m.DashboardShell)",
    );
    expect(routes).toContain('canActivate: [authGuard]');
    expect(routes).toContain("redirectTo: 'app'");
    // the pre-existing login route is untouched
    expect(routes).toContain("path: 'login'");

    const paths = readJson(tree, 'tsconfig.base.json').compilerOptions.paths;
    expect(paths['@org/frontend-dashboard']).toEqual([
      './libs/frontend/dashboard/src/index.ts',
    ]);
    expect(paths['@org/frontend-dashboard/shell']).toEqual([
      './libs/frontend/dashboard/src/lib/shell/dashboard-shell.ts',
    ]);
    expect(paths['@org/frontend-dashboard/admin-tabs']).toBeDefined();
  });

  it('is idempotent', async () => {
    await frontendDashboardGenerator(tree);
    await frontendDashboardGenerator(tree);

    const routes = tree.read(APP_ROUTES, 'utf-8') as string;
    expect((routes.match(/m\.DashboardShell/g) ?? []).length).toBe(1);
    expect((routes.match(/redirectTo: 'app'/g) ?? []).length).toBe(1);

    const config = tree.read(APP_CONFIG, 'utf-8') as string;
    expect(
      (config.match(/provideDashboard\(DASHBOARD_NAV\)/g) ?? []).length,
    ).toBe(1);
    expect(config.split("from '@org/frontend-dashboard'").length - 1).toBe(1);
  });
});
