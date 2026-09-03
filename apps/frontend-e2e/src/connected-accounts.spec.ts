import { expect, test } from '@playwright/test';
import { login } from './support/actions';
import { apiRegister, linkIdentity } from './support/seed';

test.describe('connected accounts', () => {
  test('shows linked providers and disconnects one', async ({ page }) => {
    const user = {
      email: `linked.${Date.now()}@example.com`,
      password: 'Passw0rd!e2e',
      firstName: 'Liam',
      lastName: 'Ked',
    };
    await apiRegister(user);
    await linkIdentity(user.email, { provider: 'google', subject: 'g-e2e-1' });

    await login(page, user);
    await page.goto('/app/profile');

    const panel = page
      .locator('section.panel')
      .filter({ has: page.getByRole('heading', { name: 'Connected accounts' }) });

    // password-only + the seeded Google link
    await expect(panel.getByText('Password', { exact: true })).toBeVisible();
    await expect(panel.getByText('Set', { exact: true })).toBeVisible();
    const googleRow = panel.locator('li').filter({ hasText: 'Google' });
    await expect(googleRow).toBeVisible();

    await googleRow.getByRole('button', { name: 'Disconnect' }).click();

    await expect(panel.locator('li').filter({ hasText: 'Google' })).toHaveCount(
      0,
    );
  });
});
