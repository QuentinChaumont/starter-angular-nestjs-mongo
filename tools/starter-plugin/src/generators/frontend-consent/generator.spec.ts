import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import frontendConsentGenerator from './generator';

const APP_CONFIG = 'apps/frontend/src/app/app.config.ts';
const APP_COMPONENT = 'apps/frontend/src/app/app.ts';
const APP_TEMPLATE = 'apps/frontend/src/app/app.html';
const APP_ROUTES = 'apps/frontend/src/app/app.routes.ts';

function seed(tree: Tree): void {
  tree.write('libs/frontend/design/project.json', '{}');
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
  tree.write('tsconfig.base.json', JSON.stringify({ compilerOptions: { paths: {} } }));
}

describe('frontend-consent generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seed(tree);
  });

  it('refuses without the design brick', async () => {
    tree.delete('libs/frontend/design/project.json');
    await expect(frontendConsentGenerator(tree)).rejects.toThrow(/design brick/);
  });

  it('copies the lib and wires banner + provider + legal routes', async () => {
    await frontendConsentGenerator(tree);

    expect(
      tree.exists('libs/frontend/consent/src/lib/consent.service.ts'),
    ).toBe(true);
    expect(
      tree.exists('libs/frontend/consent/src/lib/legal/cookie-policy.page.ts'),
    ).toBe(true);

    const config = tree.read(APP_CONFIG, 'utf-8') as string;
    expect(config).toContain(
      "import { provideConsent } from '@org/frontend-consent';",
    );
    expect(config).toMatch(/providers:\s*\[[^\]]*provideConsent\(\)/);

    const component = tree.read(APP_COMPONENT, 'utf-8') as string;
    expect(component).toContain(
      "import { ConsentBanner } from '@org/frontend-consent';",
    );
    expect(component).toMatch(/imports:\s*\[[^\]]*ConsentBanner/);

    const template = tree.read(APP_TEMPLATE, 'utf-8') as string;
    expect(template.indexOf('lib-consent-banner')).toBeLessThan(
      template.indexOf('router-outlet'),
    );

    const routes = tree.read(APP_ROUTES, 'utf-8') as string;
    expect(routes).toContain('component: CookiePolicy');
    expect(routes).toContain('component: PrivacyPolicy');
    expect(routes).toContain("path: 'legal/cookies'");

    expect(
      readJson(tree, 'tsconfig.base.json').compilerOptions.paths[
        '@org/frontend-consent'
      ],
    ).toEqual(['./libs/frontend/consent/src/index.ts']);
  });

  it('is idempotent', async () => {
    await frontendConsentGenerator(tree);
    await frontendConsentGenerator(tree);

    const component = tree.read(APP_COMPONENT, 'utf-8') as string;
    expect(component.split("from '@org/frontend-consent'").length - 1).toBe(1);
    expect((component.match(/ConsentBanner/g) ?? []).length).toBe(2); // import + imports array

    const template = tree.read(APP_TEMPLATE, 'utf-8') as string;
    expect((template.match(/lib-consent-banner/g) ?? []).length).toBe(2); // open + close tag

    const routes = tree.read(APP_ROUTES, 'utf-8') as string;
    expect((routes.match(/path: 'legal\/cookies'/g) ?? []).length).toBe(1);
  });
});
