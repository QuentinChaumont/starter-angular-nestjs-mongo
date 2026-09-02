import { expect, test } from '@playwright/test';
import { acceptConsent, login } from './support/actions';
import { SEEDED_USER } from './support/seed';

test.describe('dashboard shell', () => {
  test('shows the signed-in home and the account menu', async ({ page }) => {
    await login(page, SEEDED_USER);
    await acceptConsent(page);

    await expect(
      page.getByRole('button', { name: 'Account menu' }),
    ).toBeVisible();
    // A role-less account shows no "Roles:" line at all.
    await expect(page.getByText(/^Roles:/)).toHaveCount(0);
  });

  test('the sidenav "Home" link returns to /app from a child route', async ({
    page,
  }) => {
    await login(page, SEEDED_USER);
    await acceptConsent(page);

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Profile' }).click();
    await expect(page).toHaveURL(/\/app\/profile$/);

    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByTestId('dashboard-home')).toBeVisible();
  });

  test('"Manage cookies" in the account menu reopens the preferences dialog', async ({
    page,
  }) => {
    await login(page, SEEDED_USER);
    await acceptConsent(page);

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Manage cookies' }).click();
    await expect(
      page.getByRole('heading', { name: 'Cookie preferences' }),
    ).toBeVisible();
  });
});
