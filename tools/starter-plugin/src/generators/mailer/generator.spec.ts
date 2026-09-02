import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import mailerGenerator from './generator';

const APP_MODULE_PATH = 'apps/backend/src/app/app.module.ts';

function seedWorkspace(tree: Tree): void {
  tree.write(
    APP_MODULE_PATH,
    `import { Module } from '@nestjs/common';
import { AppConfigModule, LoggerModule } from '@org/backend-core';

@Module({
  imports: [AppConfigModule, LoggerModule],
})
export class AppModule {}
`,
  );
}

describe('mailer generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seedWorkspace(tree);
  });

  it('copies the mailer lib into the workspace when missing', async () => {
    await mailerGenerator(tree);

    expect(tree.exists('libs/backend/mailer/package.json')).toBe(true);
    expect(tree.exists('libs/backend/mailer/src/lib/mailer.service.ts')).toBe(
      true,
    );
    expect(tree.exists('libs/backend/mailer/src/lib/console.transport.ts')).toBe(
      true,
    );
  });

  it('wires MailerModule into the app module', async () => {
    await mailerGenerator(tree);

    const content = tree.read(APP_MODULE_PATH, 'utf-8') as string;
    expect(content).toContain(
      "import { MailerModule } from '@org/backend-mailer';",
    );
    expect(content).toMatch(/imports:\s*\[[^\]]*MailerModule/);
  });

  it('does not pull nodemailer (the optional dependency) into package.json', async () => {
    await mailerGenerator(tree);

    const packageJson = JSON.parse(tree.read('package.json', 'utf-8') as string);
    expect(packageJson.dependencies['nodemailer']).toBeUndefined();
  });

  it('is idempotent: running twice does not duplicate wiring', async () => {
    await mailerGenerator(tree);
    const before = tree.read(APP_MODULE_PATH, 'utf-8');

    await mailerGenerator(tree);

    expect(tree.read(APP_MODULE_PATH, 'utf-8')).toBe(before);
    const appModuleContent = tree.read(APP_MODULE_PATH, 'utf-8') as string;
    const arrayMatch = appModuleContent.match(/imports:\s*\[([^\]]*)\]/);
    expect((arrayMatch?.[1].match(/\bMailerModule\b/g) ?? []).length).toBe(1);
  });
});
