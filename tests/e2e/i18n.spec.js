import { expect, test } from '@playwright/test';

// T-46 v1: /about is the only screen migrated to next-intl so far. This
// walks it in both locales to prove the scaffolding (routing, middleware,
// Clerk localization, locale switcher) actually works end to end.
const shot = (page, name) =>
  page.screenshot({ path: `test-results/${name}.png`, fullPage: true });

test.describe('i18n en /about', () => {
  test('espanol (default, sin prefijo)', async ({ page }) => {
    await page.goto('/about');

    await expect(page).toHaveURL(/\/about$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByText('Conecta, compra y vende dentro de tu universidad')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Únete ahora' })).toBeVisible();

    await shot(page, '06-about-es');
  });

  test('ingles via /en/about', async ({ page }) => {
    await page.goto('/en/about');

    await expect(page).toHaveURL(/\/en\/about$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText('Connect, buy, and sell within your university')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join now' })).toBeVisible();

    await shot(page, '07-about-en');
  });

  test('el switcher de idioma navega entre /about y /en/about', async ({ page }) => {
    await page.goto('/about');

    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en\/about$/);
    await expect(page.getByText('Connect, buy, and sell within your university')).toBeVisible();

    await page.getByRole('link', { name: 'Español' }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByText('Conecta, compra y vende dentro de tu universidad')).toBeVisible();
  });

  test('las rutas no migradas siguen en espanol sin prefijo de locale', async ({ page }) => {
    await page.goto('/antojos');

    await expect(page).toHaveURL(/\/antojos$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });
});
