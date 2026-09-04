import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import frontendAuthGenerator from './generator';

const APP_CONFIG = 'apps/frontend/src/app/app.config.ts';
const APP_ROUTES = 'apps/frontend/src/app/app.routes.ts';

function seed(tree: Tree): void {
  tree.write('libs/frontend/design/project.json', '{}');
  tree.write('libs/frontend/i18n/project.json', '{}');
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
  tree.write(
    'tsconfig.base.json',
    JSON.stringify({ compilerOptions: { paths: {} } }),
  );
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

  it('refuses without the i18n brick', async () => {
    tree.delete('libs/frontend/i18n/project.json');
    await expect(frontendAuthGenerator(tree)).rejects.toThrow(/i18n brick/);
  });

  it('copies the lib and wires providers + routes', async () => {
    await frontendAuthGenerator(tree);

    expect(tree.exists('libs/frontend/auth/project.json')).toBe(true);
    expect(tree.exists('libs/frontend/auth/src/lib/auth.interceptor.ts')).toBe(
      true,
    );
    expect(tree.exists('libs/frontend/core/src/lib/api-base-url.ts')).toBe(
      true,
    );
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
    expect(routes).toContain(
      "import { AUTH_ROUTES } from '@org/frontend-auth'",
    );
    expect(routes).toContain('...AUTH_ROUTES');

    expect(
      readJson(tree, 'tsconfig.base.json').compilerOptions.paths[
        '@org/frontend-auth'
      ],
    ).toEqual(['./libs/frontend/auth/src/index.ts']);
  });

  describe('--profile', () => {
    const USER_MENU = 'libs/frontend/dashboard/src/lib/shell/user-menu.ts';

    function seedProfilePrereqs(): void {
      tree.write('libs/frontend/dashboard/project.json', '{}');
      tree.write('libs/frontend/feedback/project.json', '{}');
      tree.write(
        APP_ROUTES,
        `import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: 'app', children: [{ path: '', component: Home }] },
];
`,
      );
      tree.write(
        USER_MENU,
        `import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'lib-user-menu',
  imports: [MatMenuModule],
  template: \`
    <mat-menu>
      <div class="user-menu__header">{{ roleLabel() }}</div>
      <button mat-menu-item (click)="openTheme()">Appearance</button>
    </mat-menu>
  \`,
})
export class UserMenu {
  private readonly router = inject(Router);
  protected roleLabel(): string { return ''; }
  protected openTheme(): void {}
}
`,
      );
    }

    it('refuses without the dashboard / feedback bricks', async () => {
      await expect(
        frontendAuthGenerator(tree, { profile: true }),
      ).rejects.toThrow(/dashboard brick/);

      tree.write('libs/frontend/dashboard/project.json', '{}');
      await expect(
        frontendAuthGenerator(tree, { profile: true }),
      ).rejects.toThrow(/feedback brick/);
    });

    it('wires the profile lib, lazy route, ME_ENDPOINT and menu entry', async () => {
      seedProfilePrereqs();
      await frontendAuthGenerator(tree, { profile: true });

      expect(tree.exists('libs/frontend/features/profile/project.json')).toBe(
        true,
      );

      const routes = tree.read(APP_ROUTES, 'utf-8') as string;
      expect(routes).toContain("import('@org/frontend-features-profile')");
      expect(routes).toContain('m.PROFILE_ROUTES');
      expect(routes).not.toMatch(/^import .*frontend-features-profile/m);

      const appConfig = tree.read(APP_CONFIG, 'utf-8') as string;
      expect(appConfig).toContain('ME_ENDPOINT');
      expect(appConfig).toContain("useValue: '/users/me'");

      const menu = tree.read(USER_MENU, 'utf-8') as string;
      expect(menu).toContain('goProfile()');
      expect(menu).toContain("this.router.navigate(['/app/profile'])");

      expect(
        readJson(tree, 'tsconfig.base.json').compilerOptions.paths[
          '@org/frontend-features-profile'
        ],
      ).toEqual(['./libs/frontend/features/profile/src/index.ts']);
    });

    it('is idempotent', async () => {
      seedProfilePrereqs();
      await frontendAuthGenerator(tree, { profile: true });
      const before = {
        routes: tree.read(APP_ROUTES, 'utf-8'),
        config: tree.read(APP_CONFIG, 'utf-8'),
        menu: tree.read(USER_MENU, 'utf-8'),
      };
      await frontendAuthGenerator(tree, { profile: true });
      expect(tree.read(APP_ROUTES, 'utf-8')).toBe(before.routes);
      expect(tree.read(APP_CONFIG, 'utf-8')).toBe(before.config);
      expect(tree.read(USER_MENU, 'utf-8')).toBe(before.menu);
    });
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
    expect((routes.match(/\.\.\.AUTH_ROUTES/g) ?? []).length).toBe(1);
    expect((routes.match(/from '@org\/frontend-auth'/g) ?? []).length).toBe(1);
  });
});
