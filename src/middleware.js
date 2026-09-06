import { clerkClient, clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { decideAdminAccess } from './utils/lib/adminAccess';

const isProtectedRoute = createRouteMatcher([
  '/antojos/sellers/register(.*)',
  '/antojos/sellers/profile/edit(.*)',
  '/antojos/sellers/products/edit(.*)',
  '/antojos/sellers/schedule(.*)',
  '/antojos/product/add(.*)',
]);

// T-12: la unica puerta para /admin/*. Antes cada ruta admin reinventaba su
// propio chequeo (Map+setInterval en memoria en api/sellers/admin/route.js,
// y la pagina /admin/sellers no comprobaba rol en absoluto, solo sesion). El
// rol vive en publicMetadata de Clerk, no en el `role` de Mongo: ese sigue
// existiendo para buyer/seller, pero para "admin" Clerk es la fuente unica.
const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/(.*)/admin(.*)']);

// T-46 v1: only /about is migrated to next-intl so far. Everything else
// keeps working exactly as before, untouched by locale negotiation, until
// it gets migrated zone by zone (see ROADMAP.md).
const isIntlRoute = createRouteMatcher(['/about(.*)', '/en/about(.*)']);

const intlMiddleware = createIntlMiddleware(routing);

// clerkClient() sale a la Backend API de Clerk (publicMetadata no viaja en el
// JWT de sesion salvo que se personalice el session token en el dashboard, un
// cambio de infraestructura que este repo ya evita tras el incidente de
// T-64). Solo se llama cuando ya hay userId, es decir, solo para quien
// intenta entrar a una ruta de admin - no en cada request publica.
async function esAdmin(userId) {
  const user = await clerkClient().users.getUser(userId);
  return user.publicMetadata?.role === 'admin';
}

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
      isAdmin: userId ? await esAdmin(userId) : false,
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
