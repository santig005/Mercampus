import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildDynamicPattern,
  localizedHref,
  prefixLocale,
  routing,
  stripLocalePrefix,
} from '@/i18n/routing';
import {
  ADMIN_ROUTE_PATTERNS,
  PROTECTED_PATHS,
  PROTECTED_ROUTE_PATTERNS,
  isProtectedPath,
  isSupportedLocale,
} from '@/lib/route-guards';

describe('localizedHref (T-81)', () => {
  it('prefixes an exact locale-aware route for a non-default locale', () => {
    expect(localizedHref('/antojos', 'en')).toBe('/en/antojos');
    expect(localizedHref('/marketplace', 'en')).toBe('/en/marketplace');
    // T-152b: the home page. '/en', not '/en/' - see prefixLocale.
    expect(localizedHref('/', 'en')).toBe('/en');
  });

  it('never prefixes for the default locale', () => {
    expect(localizedHref('/antojos', 'es')).toBe('/antojos');
    expect(localizedHref('/', 'es')).toBe('/');
  });

  // T-152b: '/' replaced /about, the only matchSubpaths:true entry. The
  // root is exact-path only - if it owned its subtree, every URL in the app
  // would count as locale-aware and get prefixed into a 404. (/about/team
  // used to be the subpath case here; there is no subtree entry left to
  // test it against.)
  it('treats the root as an exact path, not a prefix of everything', () => {
    expect(localizedHref('/antojos/game', 'en')).toBe('/antojos/game');
    expect(localizedHref('/about', 'en')).toBe('/about');
  });

  it('prefixes the root without a trailing slash (T-152b)', () => {
    expect(prefixLocale('en', '/')).toBe('/en');
    expect(prefixLocale('en', '/antojos')).toBe('/en/antojos');
  });

  // /antojos and /marketplace are matchSubpaths:false on purpose: their
  // sub-routes (other than the ones migrated below) have no [locale] file,
  // so prefixing them would 404.
  it('does not prefix a subpath under a matchSubpaths:false route', () => {
    expect(localizedHref('/antojos/product/add', 'en')).toBe(
      '/antojos/product/add'
    );
  });

  // T-81 (auth zone): /auth/login used to be the example "unrelated path"
  // here, before that zone was migrated - now it has its own describe block
  // below with its own coverage. /auth/callback replaces it: it is
  // deliberately never a member of LOCALIZED_ROUTES (see that block for why),
  // so it is a genuinely unrelated path for as long as this migration runs.
  it('leaves an unrelated path untouched', () => {
    expect(localizedHref('/auth/callback', 'en')).toBe('/auth/callback');
  });
});

// T-81 (product detail): /antojos/<id> and /marketplace/<id> are `dynamic`
// LOCALIZED_ROUTES entries - the id is constrained to a Mongo ObjectId (24
// hex chars) instead of a wildcard, specifically so this can't swallow
// single-segment siblings like /antojos/game or /antojos/pqrs. See
// buildDynamicPattern in src/i18n/routing.ts and src/middleware.js.
describe('localizedHref for the product detail zone (T-81)', () => {
  const PRODUCT_ID = '652f1234567890abcdef1234'; // 24 hex chars, shaped like a Mongoose _id

  it('prefixes a product detail path for a non-default locale', () => {
    expect(localizedHref(`/antojos/${PRODUCT_ID}`, 'en')).toBe(
      `/en/antojos/${PRODUCT_ID}`
    );
    expect(localizedHref(`/marketplace/${PRODUCT_ID}`, 'en')).toBe(
      `/en/marketplace/${PRODUCT_ID}`
    );
  });

  it('never prefixes a product detail path for the default locale', () => {
    expect(localizedHref(`/antojos/${PRODUCT_ID}`, 'es')).toBe(
      `/antojos/${PRODUCT_ID}`
    );
  });

  // The trap this task exists to avoid: these are real, unmigrated
  // single-segment sibling pages under /antojos, not products. A wildcard
  // pattern would prefix them into a 404 (no [locale] file backs them).
  it('does not prefix /antojos/game or /antojos/pqrs - real sibling pages, not products', () => {
    expect(localizedHref('/antojos/game', 'en')).toBe('/antojos/game');
    expect(localizedHref('/antojos/pqrs', 'en')).toBe('/antojos/pqrs');
  });

  // A seller id is also a Mongo ObjectId, but /antojos/sellers/<id> has an
  // extra "sellers" segment before it - two segments after /antojos, not
  // one - so it must not match the *product* detail pattern (base
  // '/antojos'). It matches its own `dynamic` entry instead (base
  // '/antojos/sellers') - see the seller profile zone describe block below.
  it('does not match the product detail pattern for a seller profile path', () => {
    // buildDynamicPattern('/antojos') anchors on exactly one segment after
    // '/antojos', so this asserts against that pattern directly rather than
    // through localizedHref, which would now prefix this path via the
    // seller zone's own entry and defeat the point of the assertion.
    expect(buildDynamicPattern('/antojos').test(`/antojos/sellers/${PRODUCT_ID}`)).toBe(
      false
    );
  });

  it('does not prefix a malformed or non-ObjectId id', () => {
    expect(localizedHref('/antojos/not-an-object-id', 'en')).toBe(
      '/antojos/not-an-object-id'
    );
    expect(localizedHref('/antojos/652f123', 'en')).toBe('/antojos/652f123');
  });
});

// T-81 (seller profile): /antojos/sellers/list (static, exact) and
// /antojos/sellers/<id> (dynamic, same Mongo-ObjectId-shaped-segment rule as
// the product detail zone). The five protected sub-routes under the same
// /antojos/sellers prefix - register, profile/edit, products/edit, schedules,
// approving (see isProtectedRoute in src/middleware.js) - must stay outside
// both of these, in Spanish and English, or isIntlRoute (which runs before
// isProtectedRoute and returns early on a match) would bypass Clerk's auth
// gate entirely for them. This is the guardrail CLAUDE.md and this task ask
// for: proven here, not assumed.
describe('localizedHref for the seller profile zone (T-81)', () => {
  const SELLER_ID = '652f1234567890abcdef1234'; // 24 hex chars, shaped like a Mongoose _id

  it('prefixes the seller listing for a non-default locale', () => {
    expect(localizedHref('/antojos/sellers/list', 'en')).toBe(
      '/en/antojos/sellers/list'
    );
  });

  it('never prefixes the seller listing for the default locale', () => {
    expect(localizedHref('/antojos/sellers/list', 'es')).toBe(
      '/antojos/sellers/list'
    );
  });

  it('prefixes a seller profile path for a non-default locale', () => {
    expect(localizedHref(`/antojos/sellers/${SELLER_ID}`, 'en')).toBe(
      `/en/antojos/sellers/${SELLER_ID}`
    );
  });

  it('never prefixes a seller profile path for the default locale', () => {
    expect(localizedHref(`/antojos/sellers/${SELLER_ID}`, 'es')).toBe(
      `/antojos/sellers/${SELLER_ID}`
    );
  });

  it('does not prefix a malformed or non-ObjectId seller id', () => {
    expect(localizedHref('/antojos/sellers/not-an-object-id', 'en')).toBe(
      '/antojos/sellers/not-an-object-id'
    );
  });

  // This used to assert that NO protected route is ever prefixed, because
  // isIntlRoute ran before isProtectedRoute in src/middleware.js and a match
  // there skipped the auth check. T-81's middleware-gate PR reversed that
  // order (the gate is proven for every locale in its own describe block
  // below), so the seller onboarding zone could list its two routes.
  //
  // What is left to guard is that the list and the disk agree: a protected
  // route is prefixed if and only if its page lives under src/app/[locale]/.
  // Prefixed without the file, the English link 404s; the file without the
  // entry, the page is only reachable in Spanish and a soft navigation drops
  // the locale. Each future forms-zone PR flips its rows by moving the file
  // and adding the entry together - neither half alone passes.
  it.each(PROTECTED_PATHS)(
    'prefixes the protected route %s only if it has a [locale] page',
    (path) => {
      const migrated = existsSync(
        resolve(process.cwd(), `src/app/[locale]${path}/page.jsx`)
      );
      expect(localizedHref(path, 'en')).toBe(migrated ? `/en${path}` : path);
      expect(localizedHref(path, 'es')).toBe(path);
    }
  );

  // Pinned by name, so the test above cannot pass by both halves vanishing
  // at once (say, the pages moved back and the entries dropped).
  it.each(['/antojos/sellers/register', '/antojos/sellers/approving'])(
    'the seller onboarding route %s is migrated',
    (path) => {
      expect(localizedHref(path, 'en')).toBe(`/en${path}`);
    }
  );

  it.each(PROTECTED_PATHS)(
    'does not match the seller dynamic pattern for the protected route %s',
    (path) => {
      expect(buildDynamicPattern('/antojos/sellers').test(path)).toBe(false);
      expect(buildDynamicPattern('/antojos/sellers', '/en').test(path)).toBe(
        false
      );
    }
  );

  it('does not match the seller dynamic pattern for /admin/sellers', () => {
    expect(buildDynamicPattern('/antojos/sellers').test('/admin/sellers')).toBe(
      false
    );
    expect(localizedHref('/admin/sellers', 'en')).toBe('/admin/sellers');
  });
});

// T-81 (auth zone): /auth/login and /auth/register, static exact entries -
// same treatment as /antojos and /marketplace in the listing zone.
//
// /auth/callback is deliberately absent from LOCALIZED_ROUTES: it is where
// Clerk lands the user after an OAuth redirect (see
// src/components/auth/ProvidersButton.jsx's redirectUrl), an external
// contract, not just an internal route. This describe block's last test is
// the guardrail that keeps that exclusion deliberate rather than
// accidental - if a future edit ever added it back to LOCALIZED_ROUTES by
// mistake, this assertion would fail.
describe('localizedHref for the auth zone (T-81)', () => {
  it('prefixes /auth/login for a non-default locale', () => {
    expect(localizedHref('/auth/login', 'en')).toBe('/en/auth/login');
  });

  it('never prefixes /auth/login for the default locale', () => {
    expect(localizedHref('/auth/login', 'es')).toBe('/auth/login');
  });

  it('prefixes /auth/register for a non-default locale', () => {
    expect(localizedHref('/auth/register', 'en')).toBe('/en/auth/register');
  });

  it('never prefixes /auth/register for the default locale', () => {
    expect(localizedHref('/auth/register', 'es')).toBe('/auth/register');
  });

  // The trap this task's warning exists to avoid: /auth/callback must never
  // gain a locale-prefixed twin, in either direction.
  it('never prefixes /auth/callback - it is deliberately excluded from LOCALIZED_ROUTES', () => {
    expect(localizedHref('/auth/callback', 'en')).toBe('/auth/callback');
    expect(localizedHref('/auth/callback', 'es')).toBe('/auth/callback');
  });
});

// The switcher used to be handed its page via a `basePath` prop hardcoded in
// each layout. That was right while a layout wrapped one page and silently
// wrong once it wrapped several: from a product page or the seller list, the
// switcher sent you to /en/antojos instead of that page's own twin. Round
//tripping the live pathname through these two is what replaced it.
describe('stripLocalePrefix (T-81)', () => {
  const ID = '507f1f77bcf86cd799439011';

  it('strips a non-default locale prefix', () => {
    expect(stripLocalePrefix('/en/antojos')).toBe('/antojos');
    expect(stripLocalePrefix(`/en/antojos/${ID}`)).toBe(`/antojos/${ID}`);
    expect(stripLocalePrefix('/en/antojos/sellers/list')).toBe(
      '/antojos/sellers/list'
    );
  });

  it('leaves a default-locale path untouched', () => {
    expect(stripLocalePrefix('/antojos')).toBe('/antojos');
    expect(stripLocalePrefix(`/marketplace/${ID}`)).toBe(`/marketplace/${ID}`);
  });

  it('does not strip a path that merely starts with the locale letters', () => {
    expect(stripLocalePrefix('/energia')).toBe('/energia');
    expect(stripLocalePrefix('/english-muffin')).toBe('/english-muffin');
  });

  it('handles the bare locale root', () => {
    expect(stripLocalePrefix('/en')).toBe('/');
  });

  // The actual regression: every one of these pages shares a layout, so the
  // old hardcoded prop sent all of them to the listing.
  it.each([
    '/antojos',
    `/antojos/${ID}`,
    `/marketplace/${ID}`,
    '/antojos/sellers/list',
    `/antojos/sellers/${ID}`,
    '/antojos/sellers/register',
    '/antojos/sellers/approving',
  ])('round-trips %s to its own twin, not to the listing', (path) => {
    expect(localizedHref(stripLocalePrefix(path), 'en')).toBe(`/en${path}`);
    expect(localizedHref(stripLocalePrefix(`/en${path}`), 'es')).toBe(path);
  });
});

// T-81 (middleware gate). The guardrail above proves that isIntlRoute does
// not *swallow* the protected routes. This block proves the other half, which
// nothing covered before: that src/middleware.js actually *gates* them - at
// every URL that can reach them, not just the bare Spanish one.
//
// It asserts against PROTECTED_ROUTE_PATTERNS itself, the exact array
// createRouteMatcher is built from in src/middleware.js, rather than against
// a list re-declared here. middleware.js cannot be imported from vitest (it
// pulls clerkMiddleware and the edge runtime), which is why that definition
// lives in src/lib/route-guards.ts now. A guardrail that restates the list it
// guards goes green while the two drift apart, and the thing that moved is
// the gate.
describe('the protected-route gate covers every locale (T-81)', () => {
  // A local path-to-regexp-free reimplementation of what createRouteMatcher
  // does with these patterns: they are all literal prefixes plus a trailing
  // '(.*)'. Kept deliberately dumb - its job is to answer "is this URL
  // covered", not to re-derive Clerk's matching.
  const covers = (patterns, pathname) =>
    patterns.some((pattern) => {
      const prefix = pattern.replace(/\(\.\*\)$/, '');
      return pathname === prefix || pathname.startsWith(`${prefix}/`);
    });

  // Not it.each over a hardcoded ['en']: iterating routing.locales is what
  // makes this a default-deny. Add 'pt' to src/i18n/routing.ts and every
  // assertion below starts demanding its twin too, so the gate cannot be
  // widened for the app while being left narrow for the middleware.
  const nonDefaultLocales = routing.locales.filter(
    (locale) => locale !== routing.defaultLocale
  );

  it('has at least one non-default locale to test against', () => {
    // Otherwise every loop below would pass vacuously and this whole block
    // would be decoration.
    expect(nonDefaultLocales.length).toBeGreaterThan(0);
  });

  it.each(PROTECTED_PATHS)('gates the bare path %s', (path) => {
    expect(covers(PROTECTED_ROUTE_PATTERNS, path)).toBe(true);
  });

  it.each(PROTECTED_PATHS)('gates every locale twin of %s', (path) => {
    for (const locale of nonDefaultLocales) {
      expect(covers(PROTECTED_ROUTE_PATTERNS, `/${locale}${path}`)).toBe(true);
    }
  });

  // The '(.*)' suffix each pattern carries: /products/edit also has to cover
  // /products/edit/<id>, in every locale.
  it('gates sub-paths under a protected route, in every locale', () => {
    const subPath = '/antojos/sellers/products/edit/652f1234567890abcdef1234';
    expect(covers(PROTECTED_ROUTE_PATTERNS, subPath)).toBe(true);
    for (const locale of nonDefaultLocales) {
      expect(covers(PROTECTED_ROUTE_PATTERNS, `/${locale}${subPath}`)).toBe(
        true
      );
    }
  });

  // The admin area is NOT migrated to next-intl (see ROADMAP.md T-81), but
  // its twins are generated anyway, so a later migration cannot open it
  // silently. Its API half must NOT get twins: /en/api/... is a URL that
  // cannot exist.
  it('gates /admin and its locale twins', () => {
    expect(covers(ADMIN_ROUTE_PATTERNS, '/admin/sellers')).toBe(true);
    for (const locale of nonDefaultLocales) {
      expect(covers(ADMIN_ROUTE_PATTERNS, `/${locale}/admin/sellers`)).toBe(
        true
      );
    }
  });

  it('does not invent a locale twin for the admin API', () => {
    expect(ADMIN_ROUTE_PATTERNS).toContain('/api/(.*)/admin(.*)');
    for (const locale of nonDefaultLocales) {
      expect(ADMIN_ROUTE_PATTERNS).not.toContain(
        `/${locale}/api/(.*)/admin(.*)`
      );
    }
  });

  // The pattern said '/antojos/sellers/schedule' (singular) until this PR,
  // while the route is src/app/antojos/sellers/schedules. It matched only via
  // its own '(.*)'. Pin the real path so it cannot drift back.
  it('names the schedules route as it actually exists on disk', () => {
    expect(PROTECTED_PATHS).toContain('/antojos/sellers/schedules');
  });

  // Public routes must NOT be caught by the gate - otherwise "everything is
  // protected" would pass every assertion above and break the whole app.
  it.each([
    '/antojos',
    '/marketplace',
    '/antojos/sellers/list',
    '/antojos/game',
    '/about',
    '/auth/login',
  ])('leaves the public route %s ungated', (path) => {
    expect(covers(PROTECTED_ROUTE_PATTERNS, path)).toBe(false);
    for (const locale of nonDefaultLocales) {
      expect(covers(PROTECTED_ROUTE_PATTERNS, `/${locale}${path}`)).toBe(false);
    }
  });
});

// T-81 (middleware gate): the layer that makes the generated twins above a
// complete set instead of a sample. [locale] is a catch-all segment with no
// generateStaticParams, and src/i18n/request.ts silently falls back to the
// default locale, so without this check /xx/antojos rendered (HTTP 200,
// measured). '/xx/...' is not a twin withLocaleTwins can ever generate -
// there are infinitely many - so rejecting unknown locale segments outright
// is what closes that class of URL. Enforced in src/app/[locale]/layout.jsx.
// T-81, decided on PR #373: LocaleSwitcher hides itself where this is true,
// because its full page navigation wiped a half-filled seller form.
describe('isProtectedPath - where the locale switcher hides (T-81)', () => {
  it.each(PROTECTED_PATHS)('is true for the protected route %s', (path) => {
    expect(isProtectedPath(path)).toBe(true);
  });

  it('is true under a protected route (the product edit form)', () => {
    expect(
      isProtectedPath('/antojos/sellers/products/edit/652f1234567890abcdef1234')
    ).toBe(true);
  });

  // The switcher must stay everywhere else, including the public seller
  // pages that share the /antojos/sellers prefix.
  it.each([
    '/',
    '/about',
    '/antojos',
    '/marketplace',
    '/antojos/sellers/list',
    '/antojos/sellers/652f1234567890abcdef1234',
    '/auth/login',
    // Shares the letters of a protected path without being under it.
    '/antojos/sellers/registered',
  ])('is false for %s', (path) => {
    expect(isProtectedPath(path)).toBe(false);
  });

  // It takes a default-locale path; LocaleSwitcher strips the prefix first.
  it('matches an English URL once its prefix is stripped', () => {
    expect(isProtectedPath('/en/antojos/sellers/register')).toBe(false);
    expect(
      isProtectedPath(stripLocalePrefix('/en/antojos/sellers/register'))
    ).toBe(true);
  });
});

describe('isSupportedLocale (T-81)', () => {
  it.each(routing.locales)('accepts the real locale %s', (locale) => {
    expect(isSupportedLocale(locale)).toBe(true);
  });

  it.each(['xx', 'zz', 'EN', 'e', 'es-CO', 'admin', 'antojos', '..', ''])(
    'rejects %s, which is not a locale this app serves',
    (segment) => {
      expect(isSupportedLocale(segment)).toBe(false);
    }
  );
});
