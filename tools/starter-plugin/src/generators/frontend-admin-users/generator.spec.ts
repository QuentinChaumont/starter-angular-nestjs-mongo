import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import frontendAdminUsersGenerator from './generator';

const APP_ROUTES = 'apps/frontend/src/app/app.routes.ts';
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
import { DashboardHome, DashboardShell } from '@org/frontend-dashboard';

export const appRoutes: Route[] = [
  {
    path: 'app',
    component: DashboardShell,
    children: [
      { path: '', component: DashboardHome },
      { path: 'admin', canActivate: [roleGuard('admin')], component: DashboardHome },
    ],
  },
];
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

  it('lazy-loads the admin console on the existing /app/admin route', async () => {
    await frontendAdminUsersGenerator(tree);

    expect(tree.exists('libs/frontend/features/admin-users/project.json')).toBe(
      true,
    );

    const routes = tree.read(APP_ROUTES, 'utf-8') as string;
    expect(routes).toContain("import('@org/frontend-features-admin-users')");
    expect(routes).toContain('m.ADMIN_USERS_ROUTES');
    // the guard is kept, the placeholder component is gone from that route
    expect(routes).toMatch(
      /path: 'admin'[\s\S]*?canActivate: \[roleGuard\('admin'\)\][\s\S]*?ADMIN_USERS_ROUTES/,
    );
    expect(routes).not.toMatch(/^import .*frontend-features-admin-users/m);

    expect(
      readJson(tree, 'tsconfig.base.json').compilerOptions.paths[
        '@org/frontend-features-admin-users'
      ],
    ).toEqual(['./libs/frontend/features/admin-users/src/index.ts']);
  });

  it('is idempotent', async () => {
    await frontendAdminUsersGenerator(tree);
    const before = tree.read(APP_ROUTES, 'utf-8');
    await frontendAdminUsersGenerator(tree);
    expect(tree.read(APP_ROUTES, 'utf-8')).toBe(before);
  });
});
