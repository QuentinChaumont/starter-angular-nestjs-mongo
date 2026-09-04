import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import frontendAdminUsersGenerator from './generator';

const APP_ROUTES = 'apps/frontend/src/app/app.routes.ts';
const APP_CONFIG = 'apps/frontend/src/app/app.config.ts';
const NAV = 'apps/frontend/src/app/dashboard-nav.ts';

function seed(tree: Tree): void {
  tree.write('libs/frontend/dashboard/project.json', '{}');
  tree.write('libs/frontend/feedback/project.json', '{}');
  tree.write(
    'tsconfig.base.json',
    JSON.stringify({ compilerOptions: { paths: {} } }),
  );
  tree.write(
    APP_ROUTES,
    `import { Route } from '@angular/router';
import { roleGuard } from '@org/frontend-auth';

export const appRoutes: Route[] = [
  {
    path: 'app',
    loadComponent: () => import('@org/frontend-dashboard/shell').then((m) => m.DashboardShell),
    children: [
      { path: '', loadComponent: () => import('@org/frontend-dashboard/home').then((m) => m.DashboardHome), title: 'Home' },
      { path: 'admin', canActivate: [roleGuard('admin')], loadComponent: () => import('@org/frontend-dashboard/home').then((m) => m.DashboardHome) },
    ],
  },
];
`,
  );
  tree.write(
    APP_CONFIG,
    `import { ApplicationConfig } from '@angular/core';
import { provideDashboard } from '@org/frontend-dashboard';
import { DASHBOARD_NAV } from './dashboard-nav';

export const appConfig: ApplicationConfig = {
  providers: [provideDashboard(DASHBOARD_NAV)],
};
`,
  );
  tree.write(
    NAV,
    `import { NavItem } from '@org/frontend-dashboard';

export const DASHBOARD_NAV: NavItem[] = [
  { label: 'Admin', icon: 'shield', route: 'admin', roles: ['admin'] },
];
`,
  );
}

describe('frontend-admin-users generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seed(tree);
  });

  it('refuses without the dashboard / feedback bricks', async () => {
    const bare = createTreeWithEmptyWorkspace();
    await expect(frontendAdminUsersGenerator(bare)).rejects.toThrow(
      /dashboard brick/,
    );
    bare.write('libs/frontend/dashboard/project.json', '{}');
    await expect(frontendAdminUsersGenerator(bare)).rejects.toThrow(
      /feedback brick/,
    );
  });

  it('wires the tabbed admin console on the existing /app/admin route', async () => {
    await frontendAdminUsersGenerator(tree);

    expect(tree.exists('libs/frontend/features/admin-users/project.json')).toBe(
      true,
    );

    const routes = tree.read(APP_ROUTES, 'utf-8') as string;
    expect(routes).toContain("import('@org/frontend-features-admin-users')");
    expect(routes).toContain('m.ADMIN_USERS_ROUTES');
    // the guard is kept, the placeholder is replaced by the lazy tabs
    // shell, and the console is now the index child of /app/admin
    expect(routes).toMatch(
      /path: 'admin'[\s\S]*?canActivate: \[roleGuard\('admin'\)\][\s\S]*?import\('@org\/frontend-dashboard\/admin-tabs'\)[\s\S]*?m\.AdminTabsShell\),\s*children: \[\{ path: '',[\s\S]*?ADMIN_USERS_ROUTES/,
    );
    // no /app/admin still pointing at the DashboardHome placeholder
    expect(routes).not.toMatch(/path: 'admin'[\s\S]*?m\.DashboardHome/);
    expect(routes).not.toMatch(/^import .*frontend-features-admin-users/m);

    // registers the "Users" tab
    const config = tree.read(APP_CONFIG, 'utf-8') as string;
    expect(config).toMatch(
      /import \{[^}]*\bprovideAdminTab\b[^}]*\} from '@org\/frontend-dashboard'/,
    );
    expect(config).toMatch(
      /provideAdminTab\(\{ label: 'Users',[^}]*path: '', order: 0 \}\)/,
    );

    expect(
      readJson(tree, 'tsconfig.base.json').compilerOptions.paths[
        '@org/frontend-features-admin-users'
      ],
    ).toEqual(['./libs/frontend/features/admin-users/src/index.ts']);
  });

  it('is idempotent', async () => {
    await frontendAdminUsersGenerator(tree);
    const routes = tree.read(APP_ROUTES, 'utf-8');
    const config = tree.read(APP_CONFIG, 'utf-8');
    await frontendAdminUsersGenerator(tree);
    expect(tree.read(APP_ROUTES, 'utf-8')).toBe(routes);
    expect(tree.read(APP_CONFIG, 'utf-8')).toBe(config);
  });
});
