import { expect, test } from '@playwright/test';

// T-84. The control for the signed-in project. Without it, every assertion in
// tests/e2e/signed-in/ could equally be explained by "the gate is open to
// everyone", and the fixture would be proving nothing.
//
// This spec runs in the `public` project, so it has no session.
const gatedRoutes = [
  '/antojos/sellers/schedules',
  '/antojos/sellers/profile/edit',
  '/antojos/product/add',
  '/antojos/sellers/products/edit',
  '/antojos/sellers/approving',
];

test.describe('the seller screens are gated (T-84)', () => {
  for (const route of gatedRoutes) {
    test(`${route} sends a visitor to the login`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/auth\/login/);
    });
  }
});

// T-81 (middleware gate). The zone that migrates these screens to next-intl
// has not landed yet - this runs first, on purpose, so the gate is already
// correct when it does.
//
// Two things are being proven here, and neither is visible to a unit test:
//
// 1. The locale twin is gated. Before this PR the matcher listed bare paths
//    only, so /en/<protected> was not gated by anything. It happened to 404
//    (no [locale] file yet), which is a dead end, not a gate - the difference
//    shows up the moment the file exists. Proven during planning with a
//    throwaway page at [locale]/antojos/sellers/profile/edit: with no
//    session, /en/... and /xx/... both returned 200 and rendered it.
// 2. An invented locale is not a way in. /xx/ is not a twin the middleware
//    can generate (there are infinitely many), so it is closed at a
//    different layer - src/app/[locale]/layout.jsx - and has to be asserted
//    separately.
test.describe('the gate covers locale-prefixed URLs too (T-81)', () => {
  for (const route of gatedRoutes) {
    test(`/en${route} sends a visitor to the login, not to the page`, async ({
      page,
    }) => {
      await page.goto(`/en${route}`);

      await expect(page).toHaveURL(/auth\/login/);
    });
  }

  // An invented locale segment must not resolve to a real page.
  //
  // This asserts on what RENDERS, not on the status code, and that is not a
  // softened assertion - it is the only correct one here. notFound() answers
  // HTTP 200 app-wide in this repo (T-91, already filed and out of scope for
  // this PR), so a status assertion would be measuring T-91 rather than this
  // gate. It also reaches the /xx paths that DO match a route by accident:
  // /xx/antojos/sellers/schedules resolves the [locale]/antojos/sellers/[id]
  // page with id="schedules", so nothing about it is a routing miss - the
  // [locale] layout rejecting "xx" is the only thing stopping it.
  const expectNotFound = async (page) => {
    await expect(
      page.getByRole('heading', { name: 'Esto ya no está aquí' })
    ).toBeVisible();
  };

  for (const route of gatedRoutes) {
    test(`/xx${route} does not resolve to the page`, async ({ page }) => {
      await page.goto(`/xx${route}`);

      await expectNotFound(page);
    });
  }

  // The same catch-all closed on the zones that ARE migrated. Measured before
  // this PR: /xx/antojos answered 200 with the real Spanish listing - a
  // nonsense URL serving genuine, indexable content. Public, so this half is
  // not an auth fix; it is the same layer, checked where it was already
  // reachable.
  for (const route of ['/antojos', '/marketplace', '/antojos/sellers/list', '/about']) {
    test(`/xx${route} does not resolve either`, async ({ page }) => {
      await page.goto(`/xx${route}`);

      await expectNotFound(page);
    });
  }

  // The locales that DO exist must keep working, or every check above would
  // be passing by having broken the feature it guards.
  test('the real locales still serve their pages', async ({ page }) => {
    await page.goto('/antojos');
    await expect(
      page.getByRole('heading', { name: 'Calma tus antojos' })
    ).toBeVisible();

    await page.goto('/en/antojos');
    await expect(
      page.getByRole('heading', { name: 'Soothe your cravings' })
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  // Signing in has to bring the visitor back to the locale they were on. The
  // gate returns redirectToSignIn(), which carries the current URL as
  // redirect_url - if that ever dropped to the bare path, an English visitor
  // would silently land back in Spanish after logging in.
  test('the login preserves the locale it bounced you from', async ({ page }) => {
    await page.goto('/en/antojos/sellers/profile/edit');

    await expect(page).toHaveURL(/auth\/login/);
    await expect(page).toHaveURL(/redirect_url=.*%2Fen%2Fantojos%2Fsellers%2Fprofile%2Fedit/);
  });
});

// T-81: /admin is deliberately NOT migrated to next-intl (one user, who reads
// Spanish, and it is the one page where the middleware is the only role
// check - the page itself asserts only that a session exists). Its locale
// twins are generated anyway so that decision cannot be quietly reversed by
// someone adding a [locale]/admin file later. Asserted here because "we
// generated the pattern" is a unit-test fact; "the URL does not serve the
// panel" is this one.
test.describe('the admin area is gated at every locale (T-81)', () => {
  test('/admin/sellers sends a signed-out visitor to the login', async ({ page }) => {
    await page.goto('/admin/sellers');

    await expect(page).toHaveURL(/auth\/login/);
  });

  test('/en/admin/sellers does not serve the panel', async ({ page }) => {
    await page.goto('/en/admin/sellers');

    // What it must never be is the admin panel rendering for someone with no
    // session. It is currently gated before that can happen - and /admin is
    // not migrated, so it would 404 anyway - but the assertion is written
    // against the thing that matters rather than against which of the two
    // layers happens to answer first today.
    await expect(
      page.getByRole('heading', { name: /Panel de Administración/ })
    ).toHaveCount(0);
  });
});
