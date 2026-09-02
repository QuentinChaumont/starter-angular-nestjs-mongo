import { expect, test } from '@playwright/test';
import { login, submitLogin } from './support/actions';
import { SEEDED_USER } from './support/seed';

test.describe('authentication', () => {
  test('register, survive a reload, then sign out', async ({ page }) => {
    const email = `newcomer.${Date.now()}@example.com`;

    await page.goto('/register');
    await page.getByLabel('First name').fill('Nora');
    await page.getByLabel('Last name').fill('New');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('Passw0rd!new');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByTestId('dashboard-home')).toBeVisible();

    // the access token lives in memory only — a reload must silently refresh
    await page.reload();
    await expect(page.getByTestId('dashboard-home')).toBeVisible();

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('a wrong password shows an inline error, not a toast', async ({
    page,
  }) => {
    await page.goto('/login');
    await submitLogin(page, { ...SEEDED_USER, password: 'wrong-password' });

    await expect(page.getByRole('alert')).toHaveText(
      /invalid email or password/i,
    );
    await expect(page).toHaveURL(/\/login$/);
    // the error interceptor must NOT also raise a snackbar for this
    await expect(page.locator('mat-snack-bar-container')).toHaveCount(0);
  });

  test('a protected route bounces to /login and comes back after signing in', async ({
    page,
  }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fapp$/);

    await submitLogin(page, SEEDED_USER);
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByTestId('dashboard-home')).toBeVisible();
  });

  test('signing in as a non-admin cannot reach /app/admin', async ({
    page,
  }) => {
    await login(page, SEEDED_USER);

    await page.goto('/app/admin');
    // roleGuard sends a user without the role home
    await expect(page).toHaveURL(/\/app$/);
  });
});
