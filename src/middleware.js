import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { LOCALIZED_ROUTES, buildDynamicPattern, routing } from './i18n/routing';
import { decideAdminAccess } from './utils/lib/adminAccess';
import { isClerkAdmin } from './utils/lib/isClerkAdmin';

const isProtectedRoute = createRouteMatcher([
  '/antojos/sellers/register(.*)',
  '/antojos/sellers/profile/edit(.*)',
  '/antojos/sellers/products/edit(.*)',
  '/antojos/sellers/schedule(.*)',
  '/antojos/sellers/approving(.*)',
  '/antojos/product/add(.*)',
]);

// T-12: the single door to /admin/*. Every admin route used to reinvent its
// own check (an in-memory Map+setInterval in api/sellers/admin/route.js, and
// the /admin/sellers page checked no role at all, only that there was a
// session). The role lives in Clerk's publicMetadata, not in Mongo's `role`:
// that one still exists for buyer/seller, but for "admin" Clerk is the only
// source of truth.
const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/(.*)/admin(.*)']);

// T-46 v1 covered only /about. T-81 adds the listing zone's index pages:
// /antojos and /marketplace (bare paths only, no sub-routes).
//
// isIntlRoute is checked before isProtectedRoute/isAdminRoute below and
// returns early when it matches, so a wildcard here would bypass Clerk's
// auth check entirely for anything it swallowed. /antojos/sellers/register,
// /antojos/product/add, etc. all live under /antojos and are gated by
// isProtectedRoute - so these two entries are exact paths (with their /en
// counterpart), never `/antojos(.*)` or `/marketplace(.*)`. Everything else
// keeps working exactly as before, untouched by locale negotiation, until it
// gets migrated zone by zone (see ROADMAP.md).
//
// T-81 (locale-aware-nav): the patterns are now derived from
// LOCALIZED_ROUTES (src/i18n/routing.ts) instead of hand-written here, so
// nav links (localizedHref, same source) can't drift from what this
// middleware actually treats as locale-aware. The exact-path-only rule
// above still lives in that list's `matchSubpaths` flag per entry - it is
// not flattened away.
//
// T-81 (product detail): a `dynamic` entry (/antojos/<id>,
// /marketplace/<id>) contributes a RegExp per locale instead of a string -
// createRouteMatcher accepts either (see node_modules/@clerk/nextjs's
// routeMatcher.js: `pattern instanceof RegExp ? pattern : pathToRegexp(pattern)`).
// buildDynamicPattern constrains the id segment to a Mongo ObjectId (24 hex
// chars), which is what keeps this from also matching /antojos/game or
// /antojos/pqrs - real, unmigrated single-segment sibling pages that would
// otherwise get rewritten into a product lookup for id "game" and 404.
// Verified live against both (see ROADMAP.md T-81).
//
// T-81 (seller profile): the same `dynamic` mechanism now also covers
// /antojos/sellers/<id> (base '/antojos/sellers'), plus a `static` exact
// entry for /antojos/sellers/list. The five protected sub-routes under the
// same /antojos/sellers prefix (register, profile/edit, products/edit,
// schedules, approving - see isProtectedRoute below) are not 24-hex-only
// single segments, so buildDynamicPattern's anchoring keeps them out of
// isIntlRoute and still gated by isProtectedRoute. Verified in
// tests/unit/routing.test.js and live (see ROADMAP.md T-81).
//
// T-81 (auth zone): /auth/login and /auth/register are `static` exact
// entries too. /auth/callback is intentionally absent - it is not gated by
// isProtectedRoute (nobody needs to be signed in to land there), so leaving
// it out is not an auth bypass risk the way a protected route would be, but
// it is still deliberate: it is Clerk's OAuth redirect target, an external
// contract, and NEXT_PUBLIC_CLERK_SIGN_IN_URL/SIGN_UP_URL are compiled-in
// constants that always point at the bare paths (see scripts/e2e.mjs and
// ROADMAP.md T-81), so those two bare paths must keep resolving exactly as
// before.
const nonDefaultLocales = routing.locales.filter(
  (locale) => locale !== routing.defaultLocale
);

const isIntlRoute = createRouteMatcher(
  LOCALIZED_ROUTES.flatMap((route) => {
    if (route.kind === 'static') {
      const suffix = route.matchSubpaths ? '(.*)' : '';
      return [
        `${route.path}${suffix}`,
        ...nonDefaultLocales.map(
          (locale) => `/${locale}${route.path}${suffix}`
        ),
      ];
    }
    return [
      buildDynamicPattern(route.base),
      ...nonDefaultLocales.map((locale) =>
        buildDynamicPattern(route.base, `/${locale}`)
      ),
    ];
  })
);

const intlMiddleware = createIntlMiddleware(routing);

export default clerkMiddleware(async (auth, req) => {
  if (isIntlRoute(req)) {
    return intlMiddleware(req);
  }

  const { userId, redirectToSignIn } = await auth();

  if (!userId && isProtectedRoute(req)) {
    // Add custom logic to run before redirecting

    return redirectToSignIn();
  }

  if (isAdminRoute(req)) {
    const decision = decideAdminAccess({
      isAdminRoute: true,
      isApi: req.nextUrl.pathname.startsWith('/api'),
      userId,
      // isClerkAdmin() is a roundtrip to Clerk's Backend API, so it is only
      // called once there is a userId AND the route is an admin one - not on
      // every public request. T-104 moved it out of this file so the server
      // side (utils/lib/auth.ts) gates on the same definition instead of on
      // Mongo's `role`.
      isAdmin: userId ? await isClerkAdmin(userId) : false,
    });

    if (decision.action === 'signin') {
      return redirectToSignIn();
    }
    if (decision.action === 'redirect-home') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    if (decision.action === 'json') {
      const error = decision.status === 401 ? 'No autenticado.' : 'No autorizado.';
      return NextResponse.json({ error }, { status: decision.status });
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
