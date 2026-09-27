import { defineRouting } from 'next-intl/routing';

// T-46: v1 only covers /about as the proof screen. Other routes don't go
// through this middleware yet (see src/middleware.js), so they stay in
// Spanish with no locale prefix until they're migrated zone by zone.
export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
  // The rest of the app always defaults to Spanish regardless of the
  // visitor's browser language. Keep /about consistent with that instead of
  // letting Accept-Language silently switch it to English; visitors opt in
  // via the locale switcher instead.
  localeDetection: false,
});

type StaticLocalizedRoute = {
  kind: 'static';
  // Default-locale path, no locale prefix, e.g. '/antojos'.
  path: string;
  // true: the zone owns its whole subtree (no entry uses it since T-152b
  // moved /about to / - kept for the next zone that owns a subtree).
  // false: EXACT PATH ONLY. Required for /antojos and /marketplace, whose
  // sub-routes (/antojos/sellers/register, /antojos/product/add, ...) are
  // gated by Clerk's isProtectedRoute in src/middleware.js.
  //
  // This used to say that a wildcard here would skip that auth check
  // entirely - a real auth bypass. **That stopped being true in T-81's
  // middleware-gate PR**, which moved isIntlRoute to run *after* both gates
  // instead of before them. Keep the flag accurate anyway: a wildcard still
  // rewrites sibling routes into a locale lookup that 404s them
  // (/antojos/game, /antojos/pqrs are real pages), so it is now a routing
  // bug rather than a security one. PR #361 was careful about precisely
  // this; keep it that way when adding routes here.
  matchSubpaths: boolean;
};

// T-81 (product detail): a route whose default-locale path is a fixed
// prefix plus exactly one dynamic segment shaped like a Mongo ObjectId -
// /antojos/<id> and /marketplace/<id>. There is no `matchSubpaths` option
// here on purpose: constraining the segment to 24 hex chars (what a
// Mongoose `_id` always is - see buildDynamicPattern) is what keeps this
// from swallowing single-segment siblings under the same prefix, like
// /antojos/game and /antojos/pqrs, which are real unmigrated pages, not
// products. A wildcard (`/antojos(.*)`) would have matched those too and,
// per the same isIntlRoute-runs-before-isProtectedRoute trap noted above,
// would have been a routing bug rather than an auth bypass here (neither
// page is gated) - but it still would have 404'd both by rewriting them
// into a product lookup for id "game" / "pqrs". Verified live: see
// src/middleware.js and ROADMAP.md T-81 for the before/after check.
type DynamicLocalizedRoute = {
  kind: 'dynamic';
  // Default-locale path prefix, no locale prefix and no trailing slash,
  // e.g. '/antojos'. The dynamic segment is always exactly one Mongo
  // ObjectId, appended by buildDynamicPattern.
  base: string;
};

type LocalizedRoute = StaticLocalizedRoute | DynamicLocalizedRoute;

// 24 hex chars: the only shape a Mongoose `_id` takes. Product ids always
// come from Mongoose, so this is a safe, cheap way to tell a product id
// apart from a sibling route segment like "game" or "pqrs" without having
// to know the full list of siblings up front.
const OBJECT_ID_PATTERN = '[0-9a-fA-F]{24}';

// Builds the regex that matches a `dynamic` route's exact default-locale
// path, optionally under a locale prefix (e.g. '/en'). Exported so
// src/middleware.js builds isIntlRoute's patterns from the exact same
// regex localizedHref uses below - one definition of "what counts as a
// product detail URL", not two that could drift apart.
export function buildDynamicPattern(base: string, localePrefix = ''): RegExp {
  return new RegExp(`^${localePrefix}${base}/${OBJECT_ID_PATTERN}$`);
}

// T-152b: puts a default-locale path under a locale prefix. Plain
// concatenation is right for every route except the root: '/en' + '/' is
// '/en/', which is not the URL next-intl serves the English home at
// ('as-needed' prefixing gives '/en'), and a middleware pattern built from it
// would never match. One helper, used by both localizedHref and the
// middleware, so the two cannot disagree about it.
export function prefixLocale(locale: string, path: string): string {
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

// T-81 (locale-aware-nav): single source of truth for which routes have a
// locale-prefixed twin (e.g. /antojos and /en/antojos). Two consumers:
// - src/middleware.js derives isIntlRoute's matcher patterns from this list
//   instead of hand-writing them.
// - localizedHref (below) uses it to decide which internal links need a
//   locale prefix, so a client-side navigation never lands on a URL whose
//   locale disagrees with the root layout - which Next.js does not
//   re-execute on a soft navigation, so <html lang>, Clerk's localization
//   and NextIntlClientProvider all stay frozen at whatever locale the last
//   full page load resolved (see src/app/layout.jsx and
//   src/components/general/LocaleSwitcher.jsx for the full story).
export const LOCALIZED_ROUTES: LocalizedRoute[] = [
  // T-152b: the home page. It used to be /about (matchSubpaths: true), which
  // now redirects here (next.config.mjs). EXACT PATH ONLY - matchSubpaths on
  // the root would make every URL in the app locale-aware.
  { kind: 'static', path: '/', matchSubpaths: false },
  { kind: 'static', path: '/antojos', matchSubpaths: false },
  { kind: 'static', path: '/marketplace', matchSubpaths: false },
  // T-81 (product detail): /antojos/<id> and /marketplace/<id>. See
  // DynamicLocalizedRoute above for why the sibling single-segment routes
  // under the same prefix (/antojos/game, /antojos/pqrs, /antojos/sellers/*,
  // /antojos/product/add) are not swallowed by these.
  { kind: 'dynamic', base: '/antojos' },
  { kind: 'dynamic', base: '/marketplace' },
  // T-81 (seller profile): the public seller listing, exact path only. Its
  // sibling protected routes under the same /antojos/sellers prefix migrate
  // one by one (see the seller onboarding entries below), each as its own
  // exact entry - matchSubpaths: true here would rewrite every one of them,
  // migrated or not, into a [locale] lookup that 404s the ones with no
  // [locale] file yet (see the StaticLocalizedRoute note above).
  { kind: 'static', path: '/antojos/sellers/list', matchSubpaths: false },
  // A seller id is a Mongo ObjectId too, same shape as a product id, so this
  // reuses the exact same DynamicLocalizedRoute machinery. The extra
  // "sellers" segment before the id is what a naive wildcard on /antojos
  // would not have respected - buildDynamicPattern anchors on `base` so
  // /antojos/<id> (a product) and /antojos/sellers/<id> (a seller) never
  // collide, and /antojos/sellers/register etc. (not 24 hex) still can't
  // match either. Verified in tests/unit/routing.test.js.
  { kind: 'dynamic', base: '/antojos/sellers' },
  // T-81 (auth zone): /auth/login and /auth/register, exact paths only.
  // /auth/callback is deliberately NOT here and never should be - it is
  // where Clerk lands the user after an OAuth redirect, an external
  // contract (see ProvidersButton.jsx's redirectUrl and the OAuth apps'
  // configured callback URL), not just an internal route. If isIntlRoute
  // ever rewrote or locale-prefixed it, a visitor mid-OAuth-handshake could
  // land on a URL Clerk isn't expecting - a broken sign-in, not a cosmetic
  // bug. It also carries no interface copy worth translating (a transitional
  // screen). See ROADMAP.md T-81 for the full note.
  { kind: 'static', path: '/auth/login', matchSubpaths: false },
  { kind: 'static', path: '/auth/register', matchSubpaths: false },
  // T-81 (seller onboarding): the first two gated routes to migrate -
  // signing up as a seller and waiting for approval. Safe to list only
  // because the middleware now runs isProtectedRoute BEFORE isIntlRoute, and
  // PROTECTED_ROUTE_PATTERNS (src/lib/route-guards.ts) already carry an /en
  // twin of both. The rest of the seller's forms (products, profile/edit,
  // schedules) stay bare until their own PRs.
  { kind: 'static', path: '/antojos/sellers/register', matchSubpaths: false },
  { kind: 'static', path: '/antojos/sellers/approving', matchSubpaths: false },
  // T-81 (seller products): the second forms batch - adding a product and the
  // seller's own product list/edit screens. Same shape as the seller profile
  // zone above: a `static` exact entry for the list
  // (/antojos/sellers/products/edit) plus a `dynamic` entry for the id
  // sub-route, since a product id is a Mongo ObjectId too. `matchSubpaths`
  // stays false on the list on purpose - the dynamic entry is what covers
  // /products/edit/<id>, not a wildcard on the list path.
  { kind: 'static', path: '/antojos/product/add', matchSubpaths: false },
  { kind: 'static', path: '/antojos/sellers/products/edit', matchSubpaths: false },
  { kind: 'dynamic', base: '/antojos/sellers/products/edit' },
  // T-81 (seller profile/schedule): the third and last forms batch - editing
  // the seller's own profile and managing schedules. Both are exact `static`
  // entries, same shape as register/approving above (already in
  // PROTECTED_PATHS, so the gate is untouched by adding these).
  { kind: 'static', path: '/antojos/sellers/profile/edit', matchSubpaths: false },
  { kind: 'static', path: '/antojos/sellers/schedules', matchSubpaths: false },
];

// Prefixes `path` with `locale` when it falls under a LOCALIZED_ROUTES
// entry: for a `static` entry, an exact match always counts, and for a
// matchSubpaths:true entry (none today, see above) so does any path nested
// under it (e.g. '/zone/sub'), mirroring isIntlRoute's own `(.*)`
// wildcard for that same entry. A matchSubpaths:false entry (/antojos,
// /marketplace) only ever matches exactly - nav links to an unmigrated
// destination like /antojos/sellers/list must stay bare, because that
// route has no [locale] file and a prefixed link would 404. For a
// `dynamic` entry, `path` counts only when it is exactly the base plus one
// Mongo-ObjectId-shaped segment, via the same regex isIntlRoute is built
// from (buildDynamicPattern) - so a malformed or non-product id, or a
// sibling like /antojos/game, is left bare rather than prefixed into a
// 404. `path` must already be the default-locale path (no leading locale
// segment).
export function localizedHref(path: string, locale: string): string {
  const isLocalized = LOCALIZED_ROUTES.some((route) => {
    if (route.kind === 'static') {
      return (
        route.path === path ||
        (route.matchSubpaths && path.startsWith(`${route.path}/`))
      );
    }
    return buildDynamicPattern(route.base).test(path);
  });
  if (!isLocalized || locale === routing.defaultLocale) return path;
  return prefixLocale(locale, path);
}

// The inverse of localizedHref's prefixing: turns whatever the browser is
// showing back into the default-locale path. `localePrefix: 'as-needed'`
// means the default locale never carries a prefix, so only the non-default
// ones are stripped. Feeding the result back through localizedHref is how
// LocaleSwitcher builds the twin URL for the other locale.
//
// This exists because the switcher used to be told its page via a `basePath`
// prop hardcoded per layout, which silently went wrong the moment a layout
// covered more than one page: every route under [locale]/antojos sent the
// visitor to /en/antojos, losing the product or seller they were looking at.
// Deriving it from the live pathname cannot drift as more zones migrate.
export function stripLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(`/${locale}`.length);
    }
  }
  return pathname;
}
