import { NestFactory } from '@nestjs/core';
import { AppConfigService } from '@org/backend-core';
import { UserService } from '@org/backend-features-user';
import { AppModule } from './app/app.module';

/**
 * Bootstraps the first `admin` account from `SEED_ADMIN_EMAIL` /
 * `SEED_ADMIN_PASSWORD`. Idempotent: an existing user is promoted to
 * `admin` (if needed) rather than recreated.
 *
 *   pnpm seed:admin      # → nx run @org/backend:seed-admin
 */
async function seedAdmin(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    abortOnError: false,
    logger: ['error', 'warn'],
  });

  try {
    const { email, password } = app.get(AppConfigService).seedAdmin;
    if (!email || !password) {
      throw new Error(
        'Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before running seed:admin.',
      );
    }

    const users = app.get(UserService);
    const existing = await users.findByEmail(email);

    if (existing) {
      if (existing.roles.includes('admin')) {
        console.log(`[seed:admin] "${email}" already exists — nothing to do.`);
      } else {
        await users.updateById(existing._id.toString(), {
          roles: [...existing.roles, 'admin'],
        });
        console.log(`[seed:admin] promoted "${email}" to admin.`);
      }
      return;
    }

    await users.create({
      email,
      password,
      firstName: 'Admin',
      lastName: 'User',
      roles: ['admin'],
    });
    console.log(`[seed:admin] created admin "${email}".`);
  } finally {
    await app.close();
  }
}

seedAdmin().catch((error: unknown) => {
  console.error(
    `[seed:admin] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
