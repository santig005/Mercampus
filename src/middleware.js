import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
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

// T-46 v1: only /about is migrated to next-intl so far. Everything else
// keeps working exactly as before, untouched by locale negotiation, until
// it gets migrated zone by zone (see ROADMAP.md).
const isIntlRoute = createRouteMatcher(['/about(.*)', '/en/about(.*)']);

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
