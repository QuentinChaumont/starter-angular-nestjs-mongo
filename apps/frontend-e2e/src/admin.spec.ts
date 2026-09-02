import { expect, test } from '@playwright/test';
import { acceptConsent, login } from './support/actions';
import { SEEDED_ADMIN, SEEDED_USER, apiRegister } from './support/seed';

test.describe('admin console', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, SEEDED_ADMIN);
    await acceptConsent(page);
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/\/app\/admin$/);
    await expect(page.getByTestId('data-table')).toBeVisible();
  });

  test('lists users; the per-column filter narrows the rows', async ({
    page,
  }) => {
    await expect(page.getByText(SEEDED_USER.email)).toBeVisible();
    await expect(page.getByText(SEEDED_ADMIN.email)).toBeVisible();

    // the filter field is hidden until its search icon is clicked
    await expect(page.locator('.data-table__filter')).toHaveCount(0);
    await page.getByRole('button', { name: 'Filter Email' }).click();
    await page.locator('.data-table__filter').fill('e2e.admin');

    await expect(page.getByText(SEEDED_ADMIN.email)).toBeVisible();
    await expect(page.getByText(SEEDED_USER.email)).toHaveCount(0);
  });

  test('grants a role through the confirm dialog', async ({ page }) => {
    const email = `grantee.${Date.now()}@example.com`;
    await apiRegister({
      email,
      password: 'Passw0rd!e2e',
      firstName: 'Gil',
      lastName: 'Grant',
    });
    await page.reload();

    const row = page.locator('tbody tr', { hasText: email });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Grant admin' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(row).toContainText('admin');
    await expect(
      row.getByRole('button', { name: 'Revoke admin' }),
    ).toBeVisible();
  });
});
