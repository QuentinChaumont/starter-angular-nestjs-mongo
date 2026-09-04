import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import frontendAuthGenerator from './frontend-auth/generator';
import frontendConsentGenerator from './frontend-consent/generator';
import frontendDashboardGenerator from './frontend-dashboard/generator';
import frontendDesignGenerator from './frontend-design/generator';
import frontendFeatureGenerator from './frontend-feature/generator';
import frontendFeedbackGenerator from './frontend-feedback/generator';
import frontendI18nGenerator from './frontend-i18n/generator';

const APP_CONFIG = 'apps/frontend/src/app/app.config.ts';
const APP_COMPONENT = 'apps/frontend/src/app/app.ts';
const APP_TEMPLATE = 'apps/frontend/src/app/app.html';
const APP_ROUTES = 'apps/frontend/src/app/app.routes.ts';
const STYLES = 'apps/frontend/src/styles.scss';

/** A fresh Angular-app-ish workspace, plus the backend-auth marker the
 * `frontend-auth` generator checks for. */
function seedWorkspace(tree: Tree): void {
  tree.write('libs/backend/auth/package.json', '{}');
  tree.write('libs/frontend/core/src/index.ts', '');

  tree.write(
    APP_CONFIG,
    `import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(appRoutes)],
};
`,
  );
  tree.write(
    APP_COMPONENT,
    `import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {}
`,
  );
  tree.write(APP_TEMPLATE, '<router-outlet></router-outlet>\n');
  tree.write(
    APP_ROUTES,
    `import { Route } from '@angular/router';\n\nexport const appRoutes: Route[] = [];\n`,
  );
  tree.write(STYLES, '/* global styles */\n');
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

async function runFrontendSequence(tree: Tree): Promise<void> {
  await frontendDesignGenerator(tree);
  await frontendI18nGenerator(tree);
  await frontendAuthGenerator(tree);
  await frontendDashboardGenerator(tree);
  await frontendFeedbackGenerator(tree);
  await frontendConsentGenerator(tree);
}

describe('frontend brick sequence', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seedWorkspace(tree);
  });

  it('installs every frontend brick and wires the app end to end', async () => {
    await runFrontendSequence(tree);

    for (const name of [
      'design',
      'i18n',
      'auth',
      'dashboard',
      'feedback',
      'consent',
    ]) {
      expect(tree.exists(`libs/frontend/${name}/project.json`)).toBe(true);
    }

    const paths = readJson(tree, 'tsconfig.base.json').compilerOptions.paths;
    for (const key of [
      '@org/frontend-auth',
      '@org/frontend-consent',
      '@org/frontend-dashboard',
      '@org/frontend-dashboard/shell',
      '@org/frontend-design',
      '@org/frontend-feedback',
      '@org/frontend-i18n',
    ]) {
      expect(paths).toHaveProperty(key);
    }

    const config = tree.read(APP_CONFIG, 'utf-8') as string;
    for (const provider of [
      '...materialProviders',
      'provideTheme()',
      'provideI18n()',
      'provideAuth()',
      'provideFeedback()',
      'provideConsent()',
      'provideDashboard(DASHBOARD_NAV)',
    ]) {
      expect(config).toContain(provider);
    }
    expect(config).toMatch(
      /withInterceptors\(\s*\[\s*csrfInterceptor\s*,\s*authInterceptor\s*,\s*httpErrorInterceptor\s*\]/,
    );

    const routes = tree.read(APP_ROUTES, 'utf-8') as string;
    for (const marker of [
      '...AUTH_ROUTES',
      "import('@org/frontend-dashboard/shell').then((m) => m.DashboardShell)",
      "redirectTo: 'app'",
      'children: LEGAL_ROUTES',
    ]) {
      expect(routes).toContain(marker);
    }
    expect(routes).toMatch(
      /import \{[^}]*\bAUTH_ROUTES\b[^}]*\} from '@org\/frontend-auth'/,
    );
    expect(routes).toMatch(
      /import \{[^}]*\bLEGAL_ROUTES\b[^}]*\} from '@org\/frontend-consent'/,
    );
    // public routes stay first (install order)
    expect(routes.indexOf('...AUTH_ROUTES')).toBeLessThan(
      routes.indexOf('m.DashboardShell'),
    );

    const component = tree.read(APP_COMPONENT, 'utf-8') as string;
    expect(component).toContain('ConsentBanner');

    const template = tree.read(APP_TEMPLATE, 'utf-8') as string;
    expect(template.indexOf('lib-consent-banner')).toBeLessThan(
      template.indexOf('router-outlet'),
    );
    expect(template.indexOf('lib-legal-links')).toBeGreaterThan(
      template.indexOf('router-outlet'),
    );

    expect(tree.read(STYLES, 'utf-8')).toContain(
      '/lib/theme/theme',
    );
    expect(tree.exists('DESIGN.md')).toBe(true);
    expect(tree.read('libs/frontend/core/src/index.ts', 'utf-8')).toContain(
      'api-base-url',
    );
  });

  it('is a no-op when the whole sequence is run again', async () => {
    await runFrontendSequence(tree);
    const before = {
      config: tree.read(APP_CONFIG, 'utf-8'),
      routes: tree.read(APP_ROUTES, 'utf-8'),
      component: tree.read(APP_COMPONENT, 'utf-8'),
      template: tree.read(APP_TEMPLATE, 'utf-8'),
      styles: tree.read(STYLES, 'utf-8'),
    };

    await runFrontendSequence(tree);

    expect(tree.read(APP_CONFIG, 'utf-8')).toBe(before.config);
    expect(tree.read(APP_ROUTES, 'utf-8')).toBe(before.routes);
    expect(tree.read(APP_COMPONENT, 'utf-8')).toBe(before.component);
    expect(tree.read(APP_TEMPLATE, 'utf-8')).toBe(before.template);
    expect(tree.read(STYLES, 'utf-8')).toBe(before.styles);
  });

  it('scaffolds a lazy frontend-feature on top of the full sequence', async () => {
    await runFrontendSequence(tree);
    await frontendFeatureGenerator(tree, { name: 'reports', crud: true });

    const root = 'libs/frontend/features/reports';
    expect(tree.exists(`${root}/project.json`)).toBe(true);
    expect(tree.exists(`${root}/src/lib/reports.routes.ts`)).toBe(true);
    expect(tree.exists(`${root}/src/lib/reports-form.page.ts`)).toBe(true);

    // wired as a lazy child of /app, no static import of the feature
    const routes = tree.read(APP_ROUTES, 'utf-8') as string;
    expect(routes).toContain("import('@org/frontend-features-reports')");
    expect(routes).toContain('m.REPORTS_ROUTES');
    expect(routes).not.toMatch(/^import .*frontend-features-reports/m);

    // nav entry + tsconfig path
    expect(
      tree.read('apps/frontend/src/app/dashboard-nav.ts', 'utf-8'),
    ).toContain("route: 'reports'");
    const paths = readJson(tree, 'tsconfig.base.json').compilerOptions.paths;
    expect(paths['@org/frontend-features-reports']).toEqual([
      './libs/frontend/features/reports/src/index.ts',
    ]);

    // re-run is a no-op
    const before = tree.read(APP_ROUTES, 'utf-8');
    await frontendFeatureGenerator(tree, { name: 'reports', crud: true });
    expect(tree.read(APP_ROUTES, 'utf-8')).toBe(before);
  });

  it('each frontend generator refuses when its prerequisite is missing', async () => {
    await expect(frontendAuthGenerator(tree)).rejects.toThrow(/design brick/);

    await frontendDesignGenerator(tree);
    await expect(frontendAuthGenerator(tree)).rejects.toThrow(/i18n brick/);

    await expect(frontendI18nGenerator(tree)).resolves.toBeDefined();
    await expect(frontendDashboardGenerator(tree)).rejects.toThrow(
      /auth brick/,
    );
  });
});
