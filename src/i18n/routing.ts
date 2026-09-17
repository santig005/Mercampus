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

type LocalizedRoute = {
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
  { path: '/about', matchSubpaths: true },
  { path: '/antojos', matchSubpaths: false },
  { path: '/marketplace', matchSubpaths: false },
];

// Prefixes `path` with `locale` when it falls under a LOCALIZED_ROUTES
// entry: an exact match always counts, and for a matchSubpaths:true entry
// (only /about today) so does any path nested under it (e.g. '/about/team'),
// mirroring isIntlRoute's own `(.*)` wildcard for that same entry. A
// matchSubpaths:false entry (/antojos, /marketplace) only ever matches
// exactly - nav links to an unmigrated destination like
// /antojos/sellers/list must stay bare, because that route has no
// [locale] file and a prefixed link would 404. `path` must already be the
// default-locale path (no leading locale segment).
export function localizedHref(path: string, locale: string): string {
  const isLocalized = LOCALIZED_ROUTES.some(
    (route) =>
      route.path === path ||
      (route.matchSubpaths && path.startsWith(`${route.path}/`))
  );
  if (!isLocalized || locale === routing.defaultLocale) return path;
  return `/${locale}${path}`;
}
