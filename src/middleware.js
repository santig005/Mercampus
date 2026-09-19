import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { LOCALIZED_ROUTES, buildDynamicPattern, routing } from './i18n/routing';
import {
  ADMIN_ROUTE_PATTERNS,
  PROTECTED_ROUTE_PATTERNS,
} from './lib/route-guards';
import { decideAdminAccess } from './utils/lib/adminAccess';
import { isClerkAdmin } from './utils/lib/isClerkAdmin';

// T-81 (middleware gate): both lists are now generated in
// src/lib/route-guards.ts - the bare path plus one twin per non-default
// locale - instead of being written out here. Two reasons, in order of how
// much they matter:
//
// 1. The hand-written list covered bare paths only. The moment a zone moves
//    under src/app/[locale]/, its '/en/...' URL reaches the same page, and a
//    pattern that does not mention it is a gate that does not run. Generating
//    the twins from routing.locales means the gate widens by itself when a
//    locale is added, rather than depending on whoever adds it knowing this
//    file exists.
// 2. tests/unit/routing.test.js can import those patterns and assert on the
//    real thing the middleware uses. It could never import this file
//    (clerkMiddleware, edge runtime), so the guardrail used to re-declare the
//    list it was guarding - which proves nothing once the two drift.
//
// The twins alone are not sufficient, and that is worth knowing here: they
// are a finite set, and '/xx/antojos/...' is not in it. What makes them
// complete is src/app/[locale]/layout.jsx rejecting any locale segment that
// is not in routing.locales. Two independent layers; see that file for the
// measurement.
const isProtectedRoute = createRouteMatcher(PROTECTED_ROUTE_PATTERNS);

// T-12: the single door to /admin/*. Every admin route used to reinvent its
// own check (an in-memory Map+setInterval in api/sellers/admin/route.js, and
// the /admin/sellers page checked no role at all, only that there was a
// session). The role lives in Clerk's publicMetadata, not in Mongo's `role`:
// that one still exists for buyer/seller, but for "admin" Clerk is the only
// source of truth.
//
// T-81: /admin is NOT being migrated to next-intl (one user, who reads
// Spanish, and it is the one page where this middleware is the only role
// check - the page itself only asserts that a session exists). Its locale
// twins are generated anyway, because that costs one shared helper and
// removes the possibility that a later migration of this area opens it
// silently. See ROADMAP.md T-81 for the decision.
const isAdminRoute = createRouteMatcher(ADMIN_ROUTE_PATTERNS);

// T-46 v1 covered only /about. T-81 adds the listing zone's index pages:
// /antojos and /marketplace (bare paths only, no sub-routes).
//
// ~~isIntlRoute is checked before isProtectedRoute/isAdminRoute below and
// returns early when it matches, so a wildcard here would bypass Clerk's
// auth check entirely for anything it swallowed.~~ **No longer true as of
// T-81's middleware-gate PR** - isIntlRoute is now the LAST thing this
// middleware checks, after both gates, precisely so that stops being the
// standing hazard every previous zone had to work around. The entries below
// stay exact paths anyway: a wildcard would still swallow sibling routes
// into a locale rewrite that 404s them (/antojos/game, /antojos/pqrs), which
// is a routing bug even now that it is no longer an auth one. Everything
// not listed keeps working exactly as before, untouched by locale
// negotiation, until it gets migrated zone by zone (see ROADMAP.md).
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

// T-81 (middleware gate): the order below is the whole point of this PR, and
// it used to be the other way round.
//
// isIntlRoute ran FIRST and returned early on a match, so locale negotiation
// was allowed to answer a request before anyone checked for a session. In
// that shape, migrating a route to next-intl silently un-gated it: the only
// thing keeping the seller's forms safe was that no LOCALIZED_ROUTES entry
// happened to match them, which is a property of a list, not of the code.
//
// Now the auth gate runs first and intl is the LAST statement in the
// function. That is deliberate beyond just "correct today": with nothing
// after it, there is no early return left for a future change to slip in
// front of the session check. The ordering is enforced by the shape of the
// function rather than by a comment asking people to be careful.
//
// Cost, stated rather than discovered later: `await auth()` now runs on
// locale-aware routes too, where it previously did not. It already ran on
// every other route in the app. isClerkAdmin() - the only network roundtrip
// here - is still reached only for an admin route with a userId, so this
// adds no Clerk Backend API calls.
export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth();

  if (!userId && isProtectedRoute(req)) {
    // redirectToSignIn() carries the full current URL as redirect_url, locale
    // prefix included, so a visitor sent away from /en/antojos/... comes back
    // to /en/antojos/... after signing in rather than dropping to Spanish.
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

  // Last, always. See the note above the handler: everything that decides
  // *who* may see this route has already run, so locale negotiation can no
  // longer answer on behalf of a gate that never executed.
  if (isIntlRoute(req)) {
    return intlMiddleware(req);
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
