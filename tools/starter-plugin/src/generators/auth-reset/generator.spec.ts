import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import authResetGenerator from './generator';

const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';
const APP_ROUTES_PATH = 'apps/frontend/src/app/app.routes.ts';
const APP_COMPONENT_PATH = 'apps/frontend/src/app/app.ts';
const APP_TEMPLATE_PATH = 'apps/frontend/src/app/app.html';
const LOGIN_PAGE_PATH = 'libs/frontend/auth/src/lib/login/login-page.ts';
const FRONTEND_AUTH_INDEX = 'libs/frontend/auth/src/index.ts';

function seedBackend(tree: Tree): void {
  tree.write('libs/backend/auth/package.json', '{}');
  tree.write('libs/backend/mailer/package.json', '{}');
  tree.write(
    APP_MODULE_PATH,
    `import { Module } from '@nestjs/common';
import { AuthModule } from '@org/backend-auth';

@Module({ imports: [AuthModule] })
export class AppModule {}
`,
  );
}

function seedFrontend(tree: Tree): void {
  tree.write('libs/frontend/auth/project.json', '{}');
  tree.write(FRONTEND_AUTH_INDEX, `export { AUTH_ROUTES } from './lib/auth.routes';\n`);
  tree.write(
    APP_ROUTES_PATH,
    `import { Route } from '@angular/router';
import { AUTH_ROUTES } from '@org/frontend-auth';

export const appRoutes: Route[] = [...AUTH_ROUTES];
`,
  );
  tree.write(
    APP_COMPONENT_PATH,
    `import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({ imports: [RouterModule], selector: 'app-root', templateUrl: './app.html' })
export class App {}
`,
  );
  tree.write(APP_TEMPLATE_PATH, '<router-outlet></router-outlet>\n');
  tree.write(
    LOGIN_PAGE_PATH,
    `import { Component } from '@angular/core';
@Component({ selector: 'lib-login-page', template: \`<form></form>\` })
export class LoginPage {}
`,
  );
}

describe('auth-reset generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('refuses without the auth brick', async () => {
    await expect(authResetGenerator(tree)).rejects.toThrow(/auth brick/);
  });

  it('refuses without the mailer brick', async () => {
    tree.write('libs/backend/auth/package.json', '{}');
    await expect(authResetGenerator(tree)).rejects.toThrow(/mailer brick/);
  });

  it('copies the lib and wires AuthResetModule into the app module', async () => {
    seedBackend(tree);
    await authResetGenerator(tree);

    expect(tree.exists('libs/backend/auth-reset/package.json')).toBe(true);
    const appModule = tree.read(APP_MODULE_PATH, 'utf-8') as string;
    expect(appModule).toContain(
      "import { AuthResetModule } from '@org/backend-auth-reset';",
    );
    expect(appModule).toMatch(/imports:\s*\[[^\]]*AuthResetModule/);
  });

  it('wires the frontend routes, banner and login link when frontend-auth is present', async () => {
    seedBackend(tree);
    seedFrontend(tree);
    await authResetGenerator(tree);

    const routes = tree.read(APP_ROUTES_PATH, 'utf-8') as string;
    expect(routes).toMatch(
      /import \{[^}]*\bRESET_ROUTES\b[^}]*\} from '@org\/frontend-auth'/,
    );
    expect(routes).toContain('...RESET_ROUTES');

    const component = tree.read(APP_COMPONENT_PATH, 'utf-8') as string;
    expect(component).toContain('VerifyEmailBanner');
    expect(tree.read(APP_TEMPLATE_PATH, 'utf-8')).toContain(
      'lib-verify-email-banner',
    );
    expect(tree.read(LOGIN_PAGE_PATH, 'utf-8')).toContain('/forgot-password');
    expect(tree.read(FRONTEND_AUTH_INDEX, 'utf-8')).toContain(
      "export * from './lib/reset/reset.service';",
    );
  });

  it('skips the frontend wiring when frontend-auth is absent', async () => {
    seedBackend(tree);
    await authResetGenerator(tree);
    expect(tree.exists(APP_ROUTES_PATH)).toBe(false);
  });

  it('is idempotent', async () => {
    seedBackend(tree);
    seedFrontend(tree);
    await authResetGenerator(tree);
    const before = {
      appModule: tree.read(APP_MODULE_PATH, 'utf-8'),
      routes: tree.read(APP_ROUTES_PATH, 'utf-8'),
      component: tree.read(APP_COMPONENT_PATH, 'utf-8'),
      template: tree.read(APP_TEMPLATE_PATH, 'utf-8'),
      login: tree.read(LOGIN_PAGE_PATH, 'utf-8'),
      index: tree.read(FRONTEND_AUTH_INDEX, 'utf-8'),
    };

    await authResetGenerator(tree);

    expect(tree.read(APP_MODULE_PATH, 'utf-8')).toBe(before.appModule);
    expect(tree.read(APP_ROUTES_PATH, 'utf-8')).toBe(before.routes);
    expect(tree.read(APP_COMPONENT_PATH, 'utf-8')).toBe(before.component);
    expect(tree.read(APP_TEMPLATE_PATH, 'utf-8')).toBe(before.template);
    expect(tree.read(LOGIN_PAGE_PATH, 'utf-8')).toBe(before.login);
    expect(tree.read(FRONTEND_AUTH_INDEX, 'utf-8')).toBe(before.index);
  });
});
