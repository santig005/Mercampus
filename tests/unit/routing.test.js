import { describe, expect, it } from 'vitest';

import {
  buildDynamicPattern,
  localizedHref,
  stripLocalePrefix,
} from '@/i18n/routing';

describe('localizedHref (T-81)', () => {
  it('prefixes an exact locale-aware route for a non-default locale', () => {
    expect(localizedHref('/antojos', 'en')).toBe('/en/antojos');
    expect(localizedHref('/marketplace', 'en')).toBe('/en/marketplace');
    expect(localizedHref('/about', 'en')).toBe('/en/about');
  });

  it('never prefixes for the default locale', () => {
    expect(localizedHref('/antojos', 'es')).toBe('/antojos');
    expect(localizedHref('/about', 'es')).toBe('/about');
  });

  // The trap this task fixes: /about owns its whole subtree (matchSubpaths:
  // true, same as isIntlRoute's own '/about(.*)'), so a link to a page under
  // it must be prefixed too, or a soft nav from /en/about/team would land on
  // the bare (Spanish) URL while the root layout - frozen since Next does
  // not re-run it on a client-side navigation - keeps rendering English.
  it('prefixes a subpath under a matchSubpaths:true route', () => {
    expect(localizedHref('/about/team', 'en')).toBe('/en/about/team');
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

  // The trap this whole task is built to avoid: isIntlRoute runs before
  // isProtectedRoute in src/middleware.js and returns early on a match, so
  // any of these being swallowed here would be a real auth bypass, not a
  // cosmetic bug. None of the six is a bare 24-hex segment, so
  // buildDynamicPattern's anchoring keeps every one of them out, and none is
  // the exact string '/antojos/sellers/list' either.
  const PROTECTED_PATHS = [
    '/antojos/sellers/register',
    '/antojos/sellers/profile/edit',
    '/antojos/sellers/products/edit',
    '/antojos/sellers/schedules',
    '/antojos/sellers/approving',
    '/antojos/product/add',
  ];

  it.each(PROTECTED_PATHS)(
    'does not prefix the protected route %s (would otherwise bypass the auth gate)',
    (path) => {
      expect(localizedHref(path, 'en')).toBe(path);
      expect(localizedHref(path, 'es')).toBe(path);
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
  ])('round-trips %s to its own twin, not to the listing', (path) => {
    expect(localizedHref(stripLocalePrefix(path), 'en')).toBe(`/en${path}`);
    expect(localizedHref(stripLocalePrefix(`/en${path}`), 'es')).toBe(path);
  });
});
