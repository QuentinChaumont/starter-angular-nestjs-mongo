import { expect, test } from '@playwright/test';

test.describe('cookie consent', () => {
  test('the banner shows on the first visit, "Accept all" dismisses it for good', async ({
    page,
  }) => {
    await page.goto('/login');
    const banner = page.getByTestId('consent-banner');
    await expect(banner).toBeVisible();

    await page.getByRole('button', { name: 'Accept all' }).click();
    await expect(banner).toBeHidden();

    // the decision is stored — a reload must not bring it back
    await page.reload();
    await expect(banner).toBeHidden();
  });

  test('"Customise" reopens the preferences dialog', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Customise' }).click();
    await expect(
      page.getByRole('heading', { name: 'Cookie preferences' }),
    ).toBeVisible();
  });

  test('the cookie policy opens in a new tab and Back leaves it', async ({
    page,
  }) => {
    await page.goto('/login');

    const [policy] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('link', { name: 'cookie policy' }).click(),
    ]);
    await expect(policy).toHaveURL(/\/legal\/cookies$/);
    await expect(
      policy.getByRole('heading', { name: /cookie policy/i }),
    ).toBeVisible();

    await policy.getByRole('button', { name: /back/i }).click();
    await expect(policy).not.toHaveURL(/\/legal\/cookies$/);
  });

  test('the legal footer links to the legal notice from any page', async ({
    page,
  }) => {
    await page.goto('/login');

    const footer = page.locator('footer.legal-links');
    await expect(footer).toBeVisible();
    await footer.getByRole('link', { name: 'Legal notice' }).click();

    await expect(page).toHaveURL(/\/legal\/notice$/);
    await expect(
      page.getByRole('heading', { name: 'Legal Notice' }),
    ).toBeVisible();
    await expect(
      page.locator('.legal').getByText(/crafted with .* by/i),
    ).toBeVisible();
  });
});
