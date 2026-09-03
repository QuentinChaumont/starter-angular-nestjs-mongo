import { expect, test } from '@playwright/test';
import { acceptConsent, login } from './support/actions';
import { SEEDED_ADMIN, apiRegister } from './support/seed';

test.describe('role management', () => {
  test('create a role, assign it to a user, then delete it', async ({
    page,
  }) => {
    const roleName = `qa-${Date.now()}`;
    const email = `role.target.${Date.now()}@example.com`;
    await apiRegister({
      email,
      password: 'Passw0rd!e2e',
      firstName: 'Ravi',
      lastName: 'Ole',
    });

    await login(page, SEEDED_ADMIN);
    await acceptConsent(page);

    // ---- create ----
    await page.getByRole('link', { name: 'Roles' }).click();
    await expect(page).toHaveURL(/\/app\/admin\/roles$/);
    await page.getByRole('button', { name: 'New role' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill(roleName);
    await page.getByRole('button', { name: 'Create' }).click();
    const roleRow = page.locator('tbody tr', { hasText: roleName });
    await expect(roleRow).toBeVisible();

    // ---- assign it to a user ----
    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/admin$/);
    const userRow = page.locator('tbody tr', { hasText: email });
    await userRow.getByRole('button', { name: 'Roles' }).click();
    await page.getByRole('checkbox', { name: roleName }).check();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(userRow).toContainText(roleName);

    // ---- deleting it while still assigned is refused ----
    await page.getByRole('link', { name: 'Roles' }).click();
    await roleRow.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete role' }).click();
    await expect(
      page.getByText(/still assigned to 1 user/i).first(),
    ).toBeVisible();
    await expect(roleRow).toBeVisible();

    // ---- remove it from the user, then delete succeeds ----
    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    await userRow.getByRole('button', { name: 'Roles' }).click();
    await page.getByRole('checkbox', { name: roleName }).uncheck();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(userRow).not.toContainText(roleName);

    await page.getByRole('link', { name: 'Roles' }).click();
    await roleRow.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete role' }).click();
    await expect(roleRow).toHaveCount(0);
  });
});
