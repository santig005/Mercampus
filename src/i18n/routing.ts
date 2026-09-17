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
  // true: the zone owns its whole subtree (only /about today - there is no
  // sub-route under it yet, but nothing stops one from being added later).
  // false: EXACT PATH ONLY. Required for /antojos and /marketplace, whose
  // sub-routes (/antojos/sellers/register, /antojos/product/add, ...) are
  // gated by Clerk's isProtectedRoute in src/middleware.js. If isIntlRoute
  // there swallowed them with a wildcard, they would skip that auth check
  // entirely - a real auth bypass, not a cosmetic bug. PR #361 was careful
  // about precisely this; keep it that way when adding routes here.
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
  { kind: 'static', path: '/about', matchSubpaths: true },
  { kind: 'static', path: '/antojos', matchSubpaths: false },
  { kind: 'static', path: '/marketplace', matchSubpaths: false },
  // T-81 (product detail): /antojos/<id> and /marketplace/<id>. See
  // DynamicLocalizedRoute above for why the sibling single-segment routes
  // under the same prefix (/antojos/game, /antojos/pqrs, /antojos/sellers/*,
  // /antojos/product/add) are not swallowed by these.
  { kind: 'dynamic', base: '/antojos' },
  { kind: 'dynamic', base: '/marketplace' },
  // T-81 (seller profile): the public seller listing, exact path only - its
  // sibling protected routes under the same /antojos/sellers prefix
  // (register, profile/edit, products/edit, schedules, approving) have no
  // [locale] file yet and stay gated by isProtectedRoute in
  // src/middleware.js; matchSubpaths: true here would swallow every one of
  // them and skip that auth check entirely (see the StaticLocalizedRoute
  // note above and ROADMAP.md T-81).
  { kind: 'static', path: '/antojos/sellers/list', matchSubpaths: false },
  // A seller id is a Mongo ObjectId too, same shape as a product id, so this
  // reuses the exact same DynamicLocalizedRoute machinery. The extra
  // "sellers" segment before the id is what a naive wildcard on /antojos
  // would not have respected - buildDynamicPattern anchors on `base` so
  // /antojos/<id> (a product) and /antojos/sellers/<id> (a seller) never
  // collide, and /antojos/sellers/register etc. (not 24 hex) still can't
  // match either. Verified in tests/unit/routing.test.js.
  { kind: 'dynamic', base: '/antojos/sellers' },
];

// Prefixes `path` with `locale` when it falls under a LOCALIZED_ROUTES
// entry: for a `static` entry, an exact match always counts, and for a
// matchSubpaths:true entry (only /about today) so does any path nested
// under it (e.g. '/about/team'), mirroring isIntlRoute's own `(.*)`
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
  return `/${locale}${path}`;
}
