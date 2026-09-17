import { expect, test } from '@playwright/test';

// T-46 v1: /about is the only screen migrated to next-intl so far. This
// walks it in both locales to prove the scaffolding (routing, middleware,
// Clerk localization, locale switcher) actually works end to end.
const shot = (page, name) =>
  page.screenshot({ path: `test-results/${name}.png`, fullPage: true });

test.describe('i18n on /about', () => {
  test('Spanish (default, no prefix)', async ({ page }) => {
    await page.goto('/about');

    await expect(page).toHaveURL(/\/about$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByText('Conecta, compra y vende dentro de tu universidad')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Únete ahora' })).toBeVisible();

    await shot(page, '06-about-es');
  });

  test('English via /en/about', async ({ page }) => {
    await page.goto('/en/about');

    await expect(page).toHaveURL(/\/en\/about$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText('Connect, buy, and sell within your university')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join now' })).toBeVisible();

    await shot(page, '07-about-en');
  });

  test('the language switcher navigates between /about and /en/about', async ({ page }) => {
    await page.goto('/about');

    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en\/about$/);
    await expect(page.getByText('Connect, buy, and sell within your university')).toBeVisible();

    await page.getByRole('link', { name: 'Español' }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByText('Conecta, compra y vende dentro de tu universidad')).toBeVisible();
  });

});

// T-81: the listing zone. /antojos and /marketplace (bare index pages only -
// their sub-routes, like /antojos/[id] and /antojos/sellers/*, are a later
// zone and stay unmigrated, see the last test below).
test.describe('i18n on the listing zone (/antojos, /marketplace)', () => {
  test('antojos in Spanish (default, no prefix)', async ({ page }) => {
    await page.goto('/antojos');

    await expect(page).toHaveURL(/\/antojos$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { name: 'Calma tus antojos' })).toBeVisible();
    await expect(page.getByPlaceholder('Busca tu antojo más deseado')).toBeVisible();

    await shot(page, '08-antojos-es');
  });

  test('antojos in English via /en/antojos', async ({ page }) => {
    await page.goto('/en/antojos');

    await expect(page).toHaveURL(/\/en\/antojos$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'Soothe your cravings' })).toBeVisible();
    await expect(page.getByPlaceholder('Search for your craving')).toBeVisible();

    await shot(page, '09-antojos-en');
  });

  test('marketplace in Spanish (default, no prefix)', async ({ page }) => {
    await page.goto('/marketplace');

    await expect(page).toHaveURL(/\/marketplace$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { name: 'Explora el marketplace' })).toBeVisible();
    await expect(page.getByPlaceholder('Busca en el marketplace')).toBeVisible();

    await shot(page, '10-marketplace-es');
  });

  test('marketplace in English via /en/marketplace', async ({ page }) => {
    await page.goto('/en/marketplace');

    await expect(page).toHaveURL(/\/en\/marketplace$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'Explore the marketplace' })).toBeVisible();
    await expect(page.getByPlaceholder('Search the marketplace')).toBeVisible();

    await shot(page, '11-marketplace-en');
  });

  // No LocaleSwitcher on these pages yet - it only renders inside
  // AboutLayout, and its hrefs are hardcoded to /about (see
  // src/components/general/LocaleSwitcher.jsx). Generalizing it to work from
  // any zone is follow-up work, not this PR's - noted in the PR description.
  // Both languages are still reachable directly by URL, which is what T-81's
  // "Done when" asks this spec to walk.

  test('their sub-routes are not migrated yet and stay in Spanish with no locale prefix', async ({
    page,
  }) => {
    await page.goto('/antojos/game');

    await expect(page).toHaveURL(/\/antojos\/game$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });
});
