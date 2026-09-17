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

  // T-81 (product detail zone): /antojos/[id] is a *dynamic* route, unlike
  // every other route migrated so far. A wildcard matcher would also match
  // these two - real, single-segment sibling pages, not products - and
  // rewrite them into a product lookup for id "game" / "pqrs", 404-ing both.
  // The `dynamic` LOCALIZED_ROUTES entry constrains the id to a Mongo
  // ObjectId shape instead, so these stay outside it. See
  // src/i18n/routing.ts (buildDynamicPattern) and ROADMAP.md T-81.
  test('/antojos/pqrs is not swallowed by the product detail matcher either', async ({
    page,
  }) => {
    await page.goto('/antojos/pqrs');

    await expect(page).toHaveURL(/\/antojos\/pqrs$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });
});

// T-81: the product detail zone (/antojos/[id], /marketplace/[id]). Seed ids
// come from scripts/e2e.mjs, same as tests/e2e/recorrido.spec.js.
const PRODUCT_ID = process.env.E2E_PRODUCT_ID;
const MARKETPLACE_PRODUCT_ID = process.env.E2E_MARKETPLACE_PRODUCT_ID;

test.describe('i18n on the product detail zone (/antojos/[id], /marketplace/[id])', () => {
  test('antojos product in Spanish (default, no prefix) - product copy stays as the seller typed it', async ({
    page,
  }) => {
    await page.goto(`/antojos/${PRODUCT_ID}`);

    await expect(page).toHaveURL(new RegExp(`/antojos/${PRODUCT_ID}$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    // Interface copy, in Spanish.
    await expect(page.getByRole('heading', { name: 'Horario' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Volver' })).toBeVisible();
    // Product copy (what the seller typed) is data, not UI copy - unchanged.
    await expect(page.getByText('Arepa de queso').first()).toBeVisible();

    await shot(page, '12-product-antojos-es');
  });

  test('antojos product in English via /en/antojos/[id] - interface translates, product copy does not', async ({
    page,
  }) => {
    await page.goto(`/en/antojos/${PRODUCT_ID}`);

    await expect(page).toHaveURL(new RegExp(`/en/antojos/${PRODUCT_ID}$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    // Interface copy, now in English.
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
    // The WhatsApp contact CTA is an <a>, not a <button> - role 'link'. Its
    // accessible name comes from aria-label, "Contact {seller} via
    // WhatsApp" - the seller's business name sits in the middle, so match
    // on the translated tail only.
    await expect(
      page.getByRole('link', { name: /via WhatsApp/ })
    ).toBeVisible();
    // Product copy (what the seller typed, in Spanish) is data, not UI copy -
    // still Spanish, on purpose. See CLAUDE.md and ROADMAP.md T-81.
    await expect(page.getByText('Arepa de queso').first()).toBeVisible();

    await shot(page, '13-product-antojos-en');
  });

  test('marketplace product in Spanish (default, no prefix)', async ({ page }) => {
    await page.goto(`/marketplace/${MARKETPLACE_PRODUCT_ID}`);

    await expect(page).toHaveURL(
      new RegExp(`/marketplace/${MARKETPLACE_PRODUCT_ID}$`)
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { name: 'Horario' })).toBeVisible();
    await expect(page.getByText('Termo Mercampus').first()).toBeVisible();

    await shot(page, '14-product-marketplace-es');
  });

  test('marketplace product in English via /en/marketplace/[id]', async ({
    page,
  }) => {
    await page.goto(`/en/marketplace/${MARKETPLACE_PRODUCT_ID}`);

    await expect(page).toHaveURL(
      new RegExp(`/en/marketplace/${MARKETPLACE_PRODUCT_ID}$`)
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
    await expect(page.getByText('Termo Mercampus').first()).toBeVisible();

    await shot(page, '15-product-marketplace-en');
  });

  // T-81 (ProductPage.jsx:78, the call site PR #363 missed): the back button
  // used to do router.push(`/${section}`) - always bare, dropping the
  // locale. Now routed through localizedHref, so this soft navigation from
  // an English product page has to land on /en/antojos, not /antojos.
  test('the back button keeps the locale on a soft navigation', async ({
    page,
  }) => {
    await page.goto(`/en/antojos/${PRODUCT_ID}`);

    await page.getByRole('button', { name: 'Back' }).click();

    await expect(page).toHaveURL(/\/en\/antojos$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(
      page.getByRole('heading', { name: 'Soothe your cravings' })
    ).toBeVisible();
  });

  // The human decision (2026-09-17): a shared link carries the sharer's
  // locale. window.open is intercepted instead of reading the clipboard, to
  // avoid granting clipboard permissions just for this assertion - same
  // technique as tests/e2e/recorrido.spec.js's T-132 coverage.
  test('sharing a product from the English marketplace page carries /en in the link', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__shareOpens = [];
      window.open = url => {
        window.__shareOpens.push(url);
        return null;
      };
    });

    await page.goto(`/en/marketplace/${MARKETPLACE_PRODUCT_ID}`);

    await page.getByRole('button', { name: /Recommend to a friend/ }).click();
    await page.getByRole('button', { name: /Share via WhatsApp/ }).click();

    const opened = await page.evaluate(() => window.__shareOpens);
    expect(opened).toHaveLength(1);

    const decoded = decodeURIComponent(opened[0]);
    expect(decoded).toContain(
      `/en/marketplace/${MARKETPLACE_PRODUCT_ID}?source=share`
    );
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
