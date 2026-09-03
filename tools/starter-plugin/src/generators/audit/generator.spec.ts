import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import auditGenerator from './generator';

const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';
const APP_ROUTES_PATH = 'apps/frontend/src/app/app.routes.ts';
const NAV_PATH = 'apps/frontend/src/app/dashboard-nav.ts';

function seedBackend(tree: Tree): void {
  tree.write('libs/backend/auth/package.json', '{}');
  tree.write(
    APP_MODULE_PATH,
    `import { Module } from '@nestjs/common';
import { AuthModule } from '@org/backend-auth';

@Module({ imports: [AuthModule] })
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
  tree.write(
    APP_ROUTES_PATH,
    `import { Route } from '@angular/router';
import { roleGuard } from '@org/frontend-auth';

export const appRoutes: Route[] = [
  { path: 'app', children: [{ path: '', component: Home }] },
];
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

describe('audit generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('refuses without the auth brick', async () => {
    await expect(auditGenerator(tree)).rejects.toThrow(/auth brick/);
  });

  it('copies the lib and wires AuditModule into the app module', async () => {
    seedBackend(tree);
    await auditGenerator(tree);

    expect(tree.exists('libs/backend/features/audit/package.json')).toBe(true);
    const appModule = tree.read(APP_MODULE_PATH, 'utf-8') as string;
    expect(appModule).toContain(
      "import { AuditModule } from '@org/backend-features-audit';",
    );
    expect(appModule).toMatch(/imports:\s*\[[^\]]*AuditModule/);
    expect(
      readJson(tree, 'apps/backend/package.json').dependencies[
        '@org/backend-features-audit'
      ],
    ).toBe('0.0.1');
  });

  it('adds the /app/admin/audit route + nav entry when admin-users is present', async () => {
    seedBackend(tree);
    seedFrontend(tree);
    await auditGenerator(tree);

    expect(tree.exists('libs/frontend/features/admin-audit/project.json')).toBe(
      true,
    );
    const routes = tree.read(APP_ROUTES_PATH, 'utf-8') as string;
    expect(routes).toContain('@org/frontend-features-admin-audit');
    expect(routes).toContain("path: 'admin/audit'");
    expect(tree.read(NAV_PATH, 'utf-8')).toContain("route: 'admin/audit'");
  });

  it('skips the frontend wiring when admin-users is absent', async () => {
    seedBackend(tree);
    await auditGenerator(tree);
    expect(tree.exists('libs/frontend/features/admin-audit/project.json')).toBe(
      false,
    );
  });

  it('is idempotent', async () => {
    seedBackend(tree);
    seedFrontend(tree);
    await auditGenerator(tree);
    const before = {
      appModule: tree.read(APP_MODULE_PATH, 'utf-8'),
      routes: tree.read(APP_ROUTES_PATH, 'utf-8'),
      nav: tree.read(NAV_PATH, 'utf-8'),
    };

    await auditGenerator(tree);

    expect(tree.read(APP_MODULE_PATH, 'utf-8')).toBe(before.appModule);
    expect(tree.read(APP_ROUTES_PATH, 'utf-8')).toBe(before.routes);
    expect(tree.read(NAV_PATH, 'utf-8')).toBe(before.nav);
  });
});
