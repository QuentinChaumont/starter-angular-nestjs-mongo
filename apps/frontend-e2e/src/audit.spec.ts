import { expect, test } from '@playwright/test';
import { acceptConsent, login } from './support/actions';
import { SEEDED_ADMIN, apiRegister } from './support/seed';

test.describe('audit log', () => {
  test('an admin action shows up in the audit console', async ({ page }) => {
    const email = `audited.${Date.now()}@example.com`;
    await apiRegister({
      email,
      password: 'Passw0rd!e2e',
      firstName: 'Aud',
      lastName: 'It',
    });

    await login(page, SEEDED_ADMIN);
    await acceptConsent(page);

    // ---- perform an admin action: disable the account ----
    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    const row = page.locator('tbody tr', { hasText: email });
    await row.getByRole('button', { name: 'Disable' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(row).toContainText('Disabled');

    // ---- it is now in the audit log ----
    await page.getByRole('link', { name: 'Audit' }).click();
    await expect(page).toHaveURL(/\/app\/admin\/audit$/);

    // filter the Action column down to status changes
    await page.getByRole('button', { name: 'Filter Action' }).click();
    await page.locator('.data-table__filter').fill('admin.status-changed');

    const auditRow = page.locator('tbody tr').first();
    await expect(auditRow).toContainText('admin.status-changed');
    // the actor interceptor recorded the caller's IP
    await expect(auditRow).toContainText('127.0.0.1');
  });
});
