import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import frontendFeatureGenerator from './generator';

const APP_ROUTES = 'apps/frontend/src/app/app.routes.ts';
const NAV = 'apps/frontend/src/app/dashboard-nav.ts';

function seed(tree: Tree): void {
  tree.write('libs/frontend/design/project.json', '{}');
  tree.write('libs/frontend/dashboard/project.json', '{}');
  tree.write(
    'tsconfig.base.json',
    JSON.stringify({ compilerOptions: { paths: {} } }),
  );
  tree.write(
    APP_ROUTES,
    `import { Route } from '@angular/router';
import { authGuard, roleGuard } from '@org/frontend-auth';
import { DashboardHome, DashboardShell } from '@org/frontend-dashboard';

export const appRoutes: Route[] = [
  { path: 'login', component: DashboardHome },
  {
    path: 'app',
    canActivate: [authGuard],
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
  { label: 'Home', icon: 'home', route: '' },
];
`,
  );
}

describe('frontend-feature generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seed(tree);
  });

  it('refuses invalid names and missing prerequisites', async () => {
    await expect(
      frontendFeatureGenerator(tree, { name: 'Reports!' }),
    ).rejects.toThrow(/Invalid feature name/);

    const bare = createTreeWithEmptyWorkspace();
    await expect(
      frontendFeatureGenerator(bare, { name: 'reports' }),
    ).rejects.toThrow(/design brick/);
  });

  it('scaffolds the lib and wires it lazily', async () => {
    await frontendFeatureGenerator(tree, { name: 'sales-orders' });

    const root = 'libs/frontend/features/sales-orders';
    for (const f of [
      'project.json',
      'src/index.ts',
      'src/lib/sales-orders.routes.ts',
      'src/lib/sales-orders.service.ts',
      'src/lib/sales-orders.store.ts',
      'src/lib/sales-orders-list.page.ts',
      'src/lib/sales-orders-detail.page.ts',
      'src/lib/sales-orders.model.ts',
    ]) {
      expect(tree.exists(`${root}/${f}`)).toBe(true);
    }
    // no form page without --crud
    expect(tree.exists(`${root}/src/lib/sales-orders-form.page.ts`)).toBe(false);

    const project = readJson(tree, `${root}/project.json`);
    expect(project.name).toBe('frontend-features-sales-orders');
    expect(project.tags).toEqual(['scope:frontend', 'type:feature']);

    const routes = tree.read(`${root}/src/lib/sales-orders.routes.ts`, 'utf-8');
    expect(routes).toContain('export const SALES_ORDERS_ROUTES');

    // lazy child route on /app, never a static import
    const appRoutes = tree.read(APP_ROUTES, 'utf-8') as string;
    expect(appRoutes).toContain('loadChildren');
    expect(appRoutes).toContain(
      "import('@org/frontend-features-sales-orders')",
    );
    expect(appRoutes).toContain('m.SALES_ORDERS_ROUTES');
    expect(appRoutes).not.toMatch(
      /^import .*frontend-features-sales-orders/m,
    );

    // nav + tsconfig path
    expect(tree.read(NAV, 'utf-8')).toContain("route: 'sales-orders'");
    const paths = readJson(tree, 'tsconfig.base.json').compilerOptions.paths;
    expect(paths['@org/frontend-features-sales-orders']).toEqual([
      './libs/frontend/features/sales-orders/src/index.ts',
    ]);
  });

  it('--crud adds the form page + new/edit routes', async () => {
    await frontendFeatureGenerator(tree, { name: 'reports', crud: true });

    expect(
      tree.exists('libs/frontend/features/reports/src/lib/reports-form.page.ts'),
    ).toBe(true);
    const routes = tree.read(
      'libs/frontend/features/reports/src/lib/reports.routes.ts',
      'utf-8',
    ) as string;
    expect(routes).toContain("path: 'new'");
    expect(routes).toContain("path: ':id/edit'");
    expect(routes.indexOf("path: ':id/edit'")).toBeLessThan(
      routes.indexOf("path: ':id'"),
    );
  });

  it('--roles guards the route and filters the nav entry', async () => {
    await frontendFeatureGenerator(tree, { name: 'reports', roles: 'admin' });

    const appRoutes = tree.read(APP_ROUTES, 'utf-8') as string;
    expect(appRoutes).toContain("canActivate: [roleGuard('admin')]");
    expect(appRoutes).toContain("import('@org/frontend-features-reports')");
    const nav = tree.read(NAV, 'utf-8') as string;
    expect(nav).toContain("route: 'reports'");
    expect(nav).toContain("roles: ['admin']");
  });

  it('is idempotent', async () => {
    await frontendFeatureGenerator(tree, { name: 'reports', crud: true });
    const before = {
      routes: tree.read(APP_ROUTES, 'utf-8'),
      nav: tree.read(NAV, 'utf-8'),
      base: tree.read('tsconfig.base.json', 'utf-8'),
    };

    await frontendFeatureGenerator(tree, { name: 'reports', crud: true });

    expect(tree.read(APP_ROUTES, 'utf-8')).toBe(before.routes);
    expect(tree.read(NAV, 'utf-8')).toBe(before.nav);
    expect(tree.read('tsconfig.base.json', 'utf-8')).toBe(before.base);
  });
});
