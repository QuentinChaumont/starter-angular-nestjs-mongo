import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import roleGenerator from './generator';

const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';
const APP_ROUTES_PATH = 'apps/frontend/src/app/app.routes.ts';
const APP_CONFIG_PATH = 'apps/frontend/src/app/app.config.ts';
const NAV_PATH = 'apps/frontend/src/app/dashboard-nav.ts';

function seedBackend(tree: Tree): void {
  tree.write('libs/backend/auth/package.json', '{}');
  tree.write('libs/backend/features/user/src/lib/user.module.ts', '');
  tree.write(
    APP_MODULE_PATH,
    `import { Module } from '@nestjs/common';
import { UserModule } from '@org/backend-features-user';

@Module({ imports: [UserModule] })
export class AppModule {}
`,
  );
  tree.write(
    'apps/backend/package.json',
    JSON.stringify({ name: '@org/backend', dependencies: {} }),
  );
  tree.write('package.json', JSON.stringify({ name: 'root', workspaces: [] }));
  tree.write('tsconfig.base.json', JSON.stringify({ compilerOptions: {} }));
}

function seedFrontend(tree: Tree): void {
  tree.write('libs/frontend/features/admin-users/project.json', '{}');
  // The shape left by `frontend-admin-users` (V2.3 step 49): the tabbed
  // admin shell with the user console as the index child.
  tree.write(
    APP_ROUTES_PATH,
    `import { Route } from '@angular/router';
import { roleGuard } from '@org/frontend-auth';
import { AdminTabsShell } from '@org/frontend-dashboard';

export const appRoutes: Route[] = [
  {
    path: 'app',
    children: [
      { path: '', component: Home },
      {
        path: 'admin',
        canActivate: [roleGuard('admin')],
        component: AdminTabsShell,
        children: [
          { path: '', loadChildren: () => import('@org/frontend-features-admin-users').then((m) => m.ADMIN_USERS_ROUTES) },
        ],
      },
    ],
  },
];
`,
  );
  tree.write(
    APP_CONFIG_PATH,
    `import { ApplicationConfig } from '@angular/core';
import { provideAdminTab, provideDashboard } from '@org/frontend-dashboard';
import { DASHBOARD_NAV } from './dashboard-nav';

export const appConfig: ApplicationConfig = {
  providers: [
    provideDashboard(DASHBOARD_NAV),
    provideAdminTab({ label: 'Users', labelKey: 'dashboard.adminTabs.users', path: '', order: 0 }),
  ],
};
`,
  );
  tree.write(
    NAV_PATH,
    `export const DASHBOARD_NAV = [{ label: 'Home', icon: 'home', route: '' }];\n`,
  );
  tree.write('apps/frontend/tsconfig.app.json', JSON.stringify({ references: [] }));
  tree.write(
    'apps/frontend/tsconfig.spec.json',
    JSON.stringify({ references: [] }),
  );
}

describe('role generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('refuses without the auth brick', async () => {
    await expect(roleGenerator(tree)).rejects.toThrow(/auth brick/);
  });

  it('refuses without the user entity', async () => {
    tree.write('libs/backend/auth/package.json', '{}');
    await expect(roleGenerator(tree)).rejects.toThrow(/"user" feature entity/);
  });

  it('copies the lib and wires RoleModule into the app module', async () => {
    seedBackend(tree);
    await roleGenerator(tree);

    expect(tree.exists('libs/backend/features/role/package.json')).toBe(true);
    const appModule = tree.read(APP_MODULE_PATH, 'utf-8') as string;
    expect(appModule).toContain(
      "import { RoleModule } from '@org/backend-features-role';",
    );
    expect(appModule).toMatch(/imports:\s*\[[^\]]*RoleModule/);
    expect(
      readJson(tree, 'apps/backend/package.json').dependencies[
        '@org/backend-features-role'
      ],
    ).toBe('0.0.1');
  });

  it('adds the roles tab + child route when admin-users is present', async () => {
    seedBackend(tree);
    seedFrontend(tree);
    await roleGenerator(tree);

    expect(tree.exists('libs/frontend/features/admin-roles/project.json')).toBe(
      true,
    );
    const routes = tree.read(APP_ROUTES_PATH, 'utf-8') as string;
    expect(routes).toContain('@org/frontend-features-admin-roles');
    expect(routes).toContain("path: 'roles'");
    // added as a child of the admin tabs shell, not a top-level /app child
    expect(routes).toMatch(
      /AdminTabsShell,\s*children: \[[\s\S]*path: 'roles'[\s\S]*ADMIN_ROLES_ROUTES/,
    );

    const config = tree.read(APP_CONFIG_PATH, 'utf-8') as string;
    expect(config).toMatch(
      /provideAdminTab\(\{ label: 'Roles',[^}]*path: 'roles', order: 10 \}\)/,
    );
    expect(
      readJson(tree, 'tsconfig.base.json').compilerOptions.paths[
        '@org/frontend-features-admin-roles'
      ],
    ).toEqual(['./libs/frontend/features/admin-roles/src/index.ts']);
  });

  it('skips the frontend wiring when admin-users is absent', async () => {
    seedBackend(tree);
    await roleGenerator(tree);
    expect(tree.exists('libs/frontend/features/admin-roles/project.json')).toBe(
      false,
    );
  });

  it('is idempotent', async () => {
    seedBackend(tree);
    seedFrontend(tree);
    await roleGenerator(tree);
    const before = {
      appModule: tree.read(APP_MODULE_PATH, 'utf-8'),
      routes: tree.read(APP_ROUTES_PATH, 'utf-8'),
      config: tree.read(APP_CONFIG_PATH, 'utf-8'),
    };

    await roleGenerator(tree);

    expect(tree.read(APP_MODULE_PATH, 'utf-8')).toBe(before.appModule);
    expect(tree.read(APP_ROUTES_PATH, 'utf-8')).toBe(before.routes);
    expect(tree.read(APP_CONFIG_PATH, 'utf-8')).toBe(before.config);
  });
});
