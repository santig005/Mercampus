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

  // T-81 follow-up: LocaleSwitcher was generalized (basePath prop) and wired
  // into both listing layouts, closing the gap noted in PR #361.
  test('the language switcher navigates between /antojos and /en/antojos', async ({ page }) => {
    await page.goto('/antojos');

    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en\/antojos$/);
    await expect(page.getByRole('heading', { name: 'Soothe your cravings' })).toBeVisible();

    await page.getByRole('link', { name: 'Español' }).click();
    await expect(page).toHaveURL(/\/antojos$/);
    await expect(page.getByRole('heading', { name: 'Calma tus antojos' })).toBeVisible();
  });

  test('the language switcher navigates between /marketplace and /en/marketplace', async ({ page }) => {
    await page.goto('/marketplace');

    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en\/marketplace$/);
    await expect(page.getByRole('heading', { name: 'Explore the marketplace' })).toBeVisible();

    await page.getByRole('link', { name: 'Español' }).click();
    await expect(page).toHaveURL(/\/marketplace$/);
    await expect(page.getByRole('heading', { name: 'Explora el marketplace' })).toBeVisible();
  });

  test('their sub-routes are not migrated yet and stay in Spanish with no locale prefix', async ({
    page,
  }) => {
    await page.goto('/antojos/game');

    await expect(page).toHaveURL(/\/antojos\/game$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });
});

// T-81 follow-up (locale-aware-nav): the tests above check the URL after a
// navigation, which is exactly what let the original bug slip through -
// SidebarBtn hardcoded `goto='/marketplace'` (no prefix), so a soft
// navigation from /en/antojos landed on the *Spanish* URL while the root
// layout - which Next.js does not re-execute on a client-side navigation -
// kept rendering English: <html lang> stayed "en" and every string on the
// page was still English, only fixed by a hard reload. A test that only
// reads the URL cannot see that mismatch. These assert URL, <html lang>,
// and rendered copy together, right after an internal (soft) navigation.
const openSidebar = async page => {
  await page.locator('label[for="my-dibujador"]').first().click();
};

test.describe('internal navigation keeps URL, <html lang>, and copy in sync (T-81)', () => {
  test('sidebar Marketplace link from English antojos stays in English', async ({ page }) => {
    await page.goto('/en/antojos');
    await openSidebar(page);

    await page.getByRole('link', { name: 'Marketplace', exact: true }).click();

    await expect(page).toHaveURL(/\/en\/marketplace$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByPlaceholder('Search the marketplace')).toBeVisible();
  });

  test('sidebar Marketplace link from Spanish antojos stays in Spanish', async ({ page }) => {
    await page.goto('/antojos');
    await openSidebar(page);

    await page.getByRole('link', { name: 'Marketplace', exact: true }).click();

    await expect(page).toHaveURL(/\/marketplace$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByPlaceholder('Busca en el marketplace')).toBeVisible();
  });

  test('About-zone "explore products" link from English about stays in English', async ({
    page,
  }) => {
    await page.goto('/en/about');

    // exact + the topbar's exact casing ("Explore Products"): the hero
    // section below has its own CTA with the same words but a lowercase
    // "products" (t('hero.ctaSecondary')), and getByRole's default matching
    // is case-insensitive, so without `exact: true` this locator resolves
    // to both links.
    await page.getByRole('link', { name: 'Explore Products', exact: true }).click();

    await expect(page).toHaveURL(/\/en\/antojos$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'Soothe your cravings' })).toBeVisible();
  });

  test('About-zone "explore products" link from Spanish about stays in Spanish', async ({
    page,
  }) => {
    await page.goto('/about');

    // See the English case above: `exact: true` picks the topbar link over
    // the hero's "Explorar productos" (lowercase p).
    await page.getByRole('link', { name: 'Explorar Productos', exact: true }).click();

    await expect(page).toHaveURL(/\/antojos$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { name: 'Calma tus antojos' })).toBeVisible();
  });
});
