import { expect, test } from '@playwright/test';
import { login, submitLogin } from './support/actions';
import { apiRegister } from './support/seed';
import { totp } from './support/totp';

test.describe('two-factor authentication', () => {
  test('enable 2FA from the profile, then log in with a code', async ({
    page,
  }) => {
    const user = {
      email: `tfa.${Date.now()}@example.com`,
      password: 'Passw0rd!e2e',
      firstName: 'Tia',
      lastName: 'Factor',
    };
    await apiRegister(user);
    await login(page, user);

    // ---- enroll ----
    await page.goto('/app/profile');
    const panel = page.locator('section.panel').filter({
      has: page.getByRole('heading', { name: 'Two-factor authentication' }),
    });
    await panel.getByRole('button', { name: 'Enable two-factor' }).click();

    await expect(panel.locator('img.tfa__qr')).toBeVisible();
    const secret = (await panel.locator('.tfa__secret').innerText()).trim();

    await panel.getByLabel('6-digit code').fill(totp(secret));
    await panel.getByRole('button', { name: 'Confirm' }).click();

    // backup codes shown once
    await expect(panel.locator('.tfa__codes li')).toHaveCount(10);
    await panel
      .getByRole('button', { name: "I've saved my backup codes" })
      .click();
    await expect(panel.getByText('On', { exact: true })).toBeVisible();

    // ---- sign out and back in, now challenged for a code ----
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await submitLogin(page, user);
    await expect(
      page.getByRole('heading', { name: 'Two-factor authentication' }),
    ).toBeVisible();
    await expect(page.getByTestId('dashboard-home')).toBeHidden();

    await page.getByLabel('Authentication code').fill(totp(secret));
    await page.getByRole('button', { name: 'Verify' }).click();

    await expect(page.getByTestId('dashboard-home')).toBeVisible();
  });
});
