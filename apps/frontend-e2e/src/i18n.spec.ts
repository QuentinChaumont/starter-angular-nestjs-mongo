import { expect, test } from '@playwright/test';
import { acceptConsent, login } from './support/actions';
import { apiRegister } from './support/seed';

test.describe('i18n', () => {
  test('switches the shell to French and the choice survives a reload', async ({
    page,
  }) => {
    // A fresh account so the persisted `locale` doesn't leak into other specs.
    const user = {
      email: `i18n.${Date.now()}@example.com`,
      password: 'Passw0rd!e2e',
      firstName: 'Ivy',
      lastName: 'Eighteen',
    };
    await apiRegister(user);
    await login(page, user);
    await acceptConsent(page);

    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();

    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('menuitem', { name: 'Français' }).click();

    await expect(page.getByRole('link', { name: 'Accueil' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Home' })).toHaveCount(0);
    // <html lang> follows the active language
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

    // Remembered in localStorage and persisted to the account (PATCH /users/me).
    await page.reload();
    await expect(page.getByRole('link', { name: 'Accueil' })).toBeVisible();

    // ...and a guest page picks the remembered language up too.
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('button', { name: 'Se connecter' }),
    ).toBeVisible();
  });
});
