import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const isProtectedRoute = createRouteMatcher([
  '/antojos/sellers/register(.*)',
  '/antojos/sellers/profile/edit(.*)',
  '/antojos/sellers/products/edit(.*)',
  '/antojos/sellers/schedule(.*)',
  '/antojos/product/add(.*)',
]);

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
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
