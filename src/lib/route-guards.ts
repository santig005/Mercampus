import { routing } from '@/i18n/routing';

// T-81 (middleware gate): the paths src/middleware.js gates, and the rule
// that turns each one into every URL that can reach it.
//
// This lives outside middleware.js so tests/unit/routing.test.js can assert
// against the *real* patterns the middleware is built from, not a copy of
// them. A guardrail that re-declares the list it is guarding proves nothing:
// the two drift, the test stays green, and the gate is the thing that moved.
// middleware.js cannot be imported from vitest (it pulls clerkMiddleware and
// the whole edge runtime), so the shared definition had to move down here.

// Paths that require a session. Every one of them is a seller's own form.
//
// NOT in this list, on purpose: /antojos/sellers/panel. It is a Server
// Component that gates itself - getSellerPanelStats() returns 'no-session'
// and the page redirects - which is strictly better than relying on the
// middleware alone. Listing it here would change what an anonymous visitor
// sees (Clerk's sign-in redirect instead of the page's own), a behaviour
// change this PR has no reason to make. Recorded in ROADMAP.md T-81 so the
// mismatch between "this list" and "the actually-protected surface" is
// written down rather than rediscovered.
export const PROTECTED_PATHS = [
  '/antojos/sellers/register',
  '/antojos/sellers/profile/edit',
  '/antojos/sellers/products/edit',
  // Was '/antojos/sellers/schedule' (singular) until this PR. The real
  // directory is src/app/antojos/sellers/schedules, so the old pattern only
  // matched by accident, via its own '(.*)' suffix. It worked, but it said
  // something that was not true about the route it guards.
  '/antojos/sellers/schedules',
  '/antojos/sellers/approving',
  '/antojos/product/add',
] as const;

// The admin area's *pages*. Kept apart from the API patterns below because
// only pages can ever carry a locale prefix.
export const ADMIN_PAGE_PATHS = ['/admin'] as const;

// The admin area's API. Deliberately NOT run through withLocaleTwins: an API
// route never carries a locale prefix - next-intl does not rewrite /api, and
// isIntlRoute never matches it - so a '/en/api/...' twin would be a pattern
// for a URL that cannot exist. Left as a literal pattern so that stays
// explicit instead of looking like an oversight.
export const ADMIN_API_PATTERNS = ['/api/(.*)/admin(.*)'] as const;

// Turns each path into the set of URLs that can actually reach it: the bare
// path plus one twin per non-default locale, each with the '(.*)' suffix the
// hand-written patterns always carried (so /antojos/sellers/products/edit
// also covers .../edit/<id>).
//
// Generated, never typed out, and this is the whole point. The old list was
// hand-written and covered bare paths only, so the day a zone moved under
// src/app/[locale]/ its '/en/...' URL would have reached the page with no
// session check at all. Deriving the twins from routing.locales means adding
// a locale to src/i18n/routing.ts extends the gate by itself, instead of
// depending on whoever adds it remembering that this file exists.
export function withLocaleTwins(paths: readonly string[]): string[] {
  const nonDefaultLocales = routing.locales.filter(
    (locale) => locale !== routing.defaultLocale
  );

  return paths.flatMap((path) => [
    `${path}(.*)`,
    ...nonDefaultLocales.map((locale) => `/${locale}${path}(.*)`),
  ]);
}

export const PROTECTED_ROUTE_PATTERNS = withLocaleTwins(PROTECTED_PATHS);

export const ADMIN_ROUTE_PATTERNS = [
  ...withLocaleTwins(ADMIN_PAGE_PATHS),
  ...ADMIN_API_PATTERNS,
];

// Whether a locale segment is one this app actually serves. The [locale]
// route segment is a catch-all: Next hands it any single path segment, and
// src/i18n/request.ts falls back to the default locale for anything it does
// not recognise, so WITHOUT this check /xx/antojos renders (measured: HTTP
// 200, Spanish content, on a URL that means nothing). That is cosmetic on a
// public page and an auth bypass on a gated one, because '/xx/...' is not a
// twin withLocaleTwins can generate - there are infinitely many of them.
// src/app/[locale]/layout.jsx calls this and 404s when it is false, which is
// what makes the generated twins above a complete set rather than a sample.
export function isSupportedLocale(locale: string): boolean {
  return (routing.locales as readonly string[]).includes(locale);
}
