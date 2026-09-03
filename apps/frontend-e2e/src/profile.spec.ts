import { expect, test } from '@playwright/test';
import { acceptConsent, login } from './support/actions';
import { apiRegister } from './support/seed';

test.describe('profile — unsaved changes guard', () => {
  test('prompts before leaving with an unsaved edit, not after saving', async ({
    page,
  }) => {
    const user = {
      email: `unsaved.${Date.now()}@example.com`,
      password: 'Passw0rd!e2e',
      firstName: 'Uma',
      lastName: 'Saved',
    };
    await apiRegister(user);
    await login(page, user);
    await acceptConsent(page);

    await page.goto('/app/profile');
    await page.getByLabel('First name').fill('Umatollah');

    // leaving now is guarded
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(
      page.getByRole('heading', { name: 'Leave without saving?' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Stay' }).click();
    await expect(page).toHaveURL(/\/app\/profile$/);

    // save, then the same navigation is clean
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('mat-snack-bar-container')).toContainText(
      /updated/i,
    );
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/\/app$/);
  });
});
