import { expect, test } from '@playwright/test';
import { login } from './support/actions';

test.describe('sessions / devices', () => {
  test('see my devices and sign another one out', async ({ browser }) => {
    const user = {
      email: `devices.${Date.now()}@example.com`,
      password: 'Passw0rd!e2e',
    };

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    // register through the UI so pageA *is* the first session (no orphan)
    await pageA.goto('/register');
    await pageA.getByLabel('First name').fill('Dee');
    await pageA.getByLabel('Last name').fill('Vice');
    await pageA.getByLabel('Email').fill(user.email);
    await pageA.getByLabel('Password', { exact: true }).fill(user.password);
    await pageA.getByRole('button', { name: 'Create account' }).click();
    await expect(pageA.getByTestId('dashboard-home')).toBeVisible();

    await login(pageB, user);

    // A now sees two devices, one flagged "This device"
    await pageA.goto('/app/profile');
    const panel = pageA
      .locator('section.panel')
      .filter({ has: pageA.getByRole('heading', { name: 'Devices' }) });
    await expect(panel.getByText('This device')).toBeVisible();

    const signOut = panel.getByRole('button', { name: 'Sign out', exact: true });
    await expect(signOut).toHaveCount(1);
    await signOut.click();
    await expect(signOut).toHaveCount(0);

    // B's session is dead: a reload can't silently refresh -> back to /login
    await pageB.reload();
    await expect(pageB).toHaveURL(/\/login/);

    await ctxA.close();
    await ctxB.close();
  });
});
