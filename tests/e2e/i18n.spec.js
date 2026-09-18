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

  // T-81 follow-up: LocaleSwitcher was generalized and wired into both
  // listing layouts, closing the gap noted in PR #361. It later stopped
  // taking a hardcoded basePath and started deriving the twin from the live
  // pathname - see the sub-page test further down for why.
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

  // The regression that motivated deriving the target from the pathname:
  // every page under the [locale]/antojos layout used to receive the same
  // hardcoded basePath="antojos", so switching language from a product page
  // or the seller list dumped the visitor on the listing instead of that
  // page's own twin.
  //
  // Asserted on the href rather than by clicking, and that is not a shortcut:
  // on the product detail page the switcher is in the DOM with the right
  // href but is painted over by ProductPage's own full-bleed layout, so
  // Playwright cannot click it (see ROADMAP.md T-81 - it is a real
  // visibility bug this test found, filed separately). The href is exactly
  // what this fix controls; the listing-page tests above still exercise a
  // real click. Asserting the URL after a click would not have caught the
  // original bug anyway - it landed on a real, valid page, just the wrong one.
  test('the switcher points at the current page twin, not the listing', async ({
    page,
  }) => {
    const productId = process.env.E2E_PRODUCT_ID;

    await page.goto(`/antojos/${productId}`);
    await expect(page.getByRole('link', { name: 'English' })).toHaveAttribute(
      'href',
      `/en/antojos/${productId}`
    );

    await page.goto(`/en/antojos/${productId}`);
    await expect(page.getByRole('link', { name: 'Español' })).toHaveAttribute(
      'href',
      `/antojos/${productId}`
    );

    await page.goto('/antojos/sellers/list');
    await expect(page.getByRole('link', { name: 'English' })).toHaveAttribute(
      'href',
      '/en/antojos/sellers/list'
    );
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

// T-81: the seller profile zone (/antojos/sellers/[id], /antojos/sellers/list).
// SELLER_ID comes from scripts/e2e.mjs (E2E_SELLER_ID), the approved seller
// seeded as "Arepas El Parche" with a Mon/Wed/Fri schedule and
// availability: true (Seller schema default) - see scripts/seed.mjs.
//
// SellerPage.jsx's own interface copy (the "Recomendar a un amigo" CTA,
// Instagram/WhatsApp buttons, the "Horario" heading) is NOT translated in
// this PR - only AvailabilityBadge and TableSchema, the two shared
// components the product detail zone's own PR flagged (rule 9) as leaking
// Spanish. That is why the share button below is still found by its Spanish
// accessible name even on the /en page - a known, deliberately scoped gap,
// recorded in ROADMAP.md T-81 for a later pass (SellerPage.jsx is this
// zone's own screen, not a shared component, but translating it fully would
// have pushed this PR well past the file-count ceiling the last zone set).
const SELLER_ID = process.env.E2E_SELLER_ID;

test.describe('i18n on the seller profile zone (/antojos/sellers/[id], /antojos/sellers/list)', () => {
  test('seller listing in Spanish (default, no prefix)', async ({ page }) => {
    await page.goto('/antojos/sellers/list');

    await expect(page).toHaveURL(/\/antojos\/sellers\/list$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(
      page.getByRole('heading', { name: /¡Conoce a los maestros del sabor! 🎉/ })
    ).toBeVisible();

    await shot(page, '16-sellers-list-es');
  });

  test('seller listing in English via /en/antojos/sellers/list', async ({ page }) => {
    await page.goto('/en/antojos/sellers/list');

    await expect(page).toHaveURL(/\/en\/antojos\/sellers\/list$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(
      page.getByRole('heading', { name: /Meet the masters of flavor! 🎉/ })
    ).toBeVisible();

    await shot(page, '17-sellers-list-en');
  });

  test('seller profile in Spanish (default, no prefix) - interface copy in Spanish, business name is data', async ({
    page,
  }) => {
    await page.goto(`/antojos/sellers/${SELLER_ID}`);

    await expect(page).toHaveURL(new RegExp(`/antojos/sellers/${SELLER_ID}$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    // AvailabilityBadge and TableSchema, translated (this PR). .first() -
    // the products listed further down the page render their own badges
    // too (ProductCard), so "Disponible" is not unique on this page.
    await expect(
      page.getByText('Disponible', { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Día' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Lunes' })).toBeVisible();
    // The seller's own business name is data, not UI copy - unchanged.
    await expect(page.getByText('Arepas El Parche')).toBeVisible();

    await shot(page, '18-seller-profile-es');
  });

  test('seller profile in English via /en/antojos/sellers/[id] - badge and schedule table translate', async ({
    page,
  }) => {
    await page.goto(`/en/antojos/sellers/${SELLER_ID}`);

    await expect(page).toHaveURL(new RegExp(`/en/antojos/sellers/${SELLER_ID}$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    // AvailabilityBadge, now in English (same .first() reasoning as above).
    await expect(
      page.getByText('Available', { exact: true }).first()
    ).toBeVisible();
    // TableSchema headers and day names, now in English.
    await expect(page.getByRole('columnheader', { name: 'Day' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Start Time' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'End Time' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Monday' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Wednesday' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Friday' })).toBeVisible();
    // The seller's own business name (data, in Spanish as typed) is
    // unaffected, and SellerPage.jsx's own remaining chrome - out of scope
    // here (see the note above) - stays Spanish too.
    await expect(page.getByText('Arepas El Parche')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Recomendar a un amigo' })
    ).toBeVisible();

    await shot(page, '19-seller-profile-en');
  });

  // The human decision (2026-09-17, T-132): a shared seller link now also
  // carries the sharer's locale, same rule as the product share link above -
  // src/lib/share-url.js's `seller` branch reuses localizedHref instead of
  // always building a bare path.
  test('sharing a seller from the English profile page carries /en in the link', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__shareOpens = [];
      window.open = url => {
        window.__shareOpens.push(url);
        return null;
      };
    });

    await page.goto(`/en/antojos/sellers/${SELLER_ID}`);

    // The "Recomendar a un amigo" CTA is SellerPage's own chrome, not yet
    // translated (see the note above), so it is still found by its Spanish
    // text even here. ShareButton.jsx itself was already translated in the
    // product detail zone's PR, so its own "Share via WhatsApp" label does
    // read English on this page.
    await page.getByRole('button', { name: 'Recomendar a un amigo' }).click();
    await page.getByRole('button', { name: /Share via WhatsApp/ }).click();

    const opened = await page.evaluate(() => window.__shareOpens);
    expect(opened).toHaveLength(1);

    const decoded = decodeURIComponent(opened[0]);
    expect(decoded).toContain(`/en/antojos/sellers/${SELLER_ID}?source=share`);
  });
});

// T-81: the auth zone (/auth/login, /auth/register). /auth/callback is
// deliberately not walked here - it is Clerk's OAuth redirect target, an
// external contract, not a UI screen, and it is not in LOCALIZED_ROUTES on
// purpose (see src/i18n/routing.ts and ROADMAP.md T-81).
//
// Only the wrapper copy this PR actually translated is asserted here -
// heading, subtitle, field labels, submit button, the cross-link between
// the two screens. The Clerk error dictionary and SignUpForm's verification
// (OTP) modal are untouched (see the notes at the top of SignInForm.jsx /
// SignUpForm.jsx) and are not walked here either, same scoping the seller
// profile zone's own PR used for SellerPage.jsx's untranslated chrome.
test.describe('i18n on the auth zone (/auth/login, /auth/register)', () => {
  test('login in Spanish (default, no prefix) - also Clerk\'s compiled-in redirect target', async ({
    page,
  }) => {
    await page.goto('/auth/login');

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(
      page.getByRole('heading', { name: 'Inicia Sesión' })
    ).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Iniciar Sesión' })
    ).toBeVisible();

    await shot(page, '20-auth-login-es');
  });

  test('login in English via /en/auth/login', async ({ page }) => {
    await page.goto('/en/auth/login');

    await expect(page).toHaveURL(/\/en\/auth\/login$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

    await shot(page, '21-auth-login-en');
  });

  test('register in Spanish (default, no prefix) - also Clerk\'s compiled-in redirect target', async ({
    page,
  }) => {
    await page.goto('/auth/register');

    await expect(page).toHaveURL(/\/auth\/register$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(
      page.getByRole('heading', { name: 'Regístrate' })
    ).toBeVisible();
    await expect(page.getByLabel('Nombre completo')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Registrarse' })
    ).toBeVisible();

    await shot(page, '22-auth-register-es');
  });

  test('register in English via /en/auth/register', async ({ page }) => {
    await page.goto('/en/auth/register');

    await expect(page).toHaveURL(/\/en\/auth\/register$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();

    await shot(page, '23-auth-register-en');
  });

  // The cross-link between the two screens keeps the locale on a soft
  // navigation - same class of bug LOCALIZED_ROUTES/localizedHref exists to
  // prevent (see src/i18n/routing.ts).
  test('the "create one" link from English login keeps the locale', async ({
    page,
  }) => {
    await page.goto('/en/auth/login');

    await page.getByRole('link', { name: /Create one/ }).click();

    await expect(page).toHaveURL(/\/en\/auth\/register$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible();
  });

  test('the "sign in" link from English register keeps the locale', async ({
    page,
  }) => {
    await page.goto('/en/auth/register');

    await page.getByRole('link', { name: /Sign in/ }).click();

    await expect(page).toHaveURL(/\/en\/auth\/login$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  });

  // /auth/callback is deliberately not visited here - it renders Clerk's
  // AuthenticateWithRedirectCallback, which expects an in-progress OAuth
  // handshake; loading it cold in a test is not a realistic exercise of
  // that screen and risks flakiness unrelated to i18n. The exclusion from
  // LOCALIZED_ROUTES is proven in tests/unit/routing.test.js instead
  // (localizedHref('/auth/callback', ...) never prefixes it), which is
  // enough to guard the routing behavior this task is responsible for
  // without touching that screen - see the warning in ROADMAP.md T-81.
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
