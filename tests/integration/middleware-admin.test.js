import { NextRequest } from 'next/server';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Stubbed Clerk session and publicMetadata. vi.hoisted because vi.mock is
// hoisted above everything else and needs to read these objects.
const session = vi.hoisted(() => ({ userId: null }));
const clerkUser = vi.hoisted(() => ({ publicMetadata: {} }));

// Only clerkMiddleware and clerkClient are mocked. createRouteMatcher is
// left real: it is what decides whether /admin/sellers and
// /api/sellers/admin match the patterns, and that is part of what to test.
//
// The real clerkMiddleware validates the session token against Clerk's
// servers (it needs a real cookie, like T-04's e2e) - here it is replaced
// by a minimal wrapper handing middleware.js's handler a controllable
// `auth()`, the same way autorizacion.test.js mocks `auth` for the route
// handlers.
// next-intl/middleware imports next/server with a specifier Vitest's ESM
// resolver rejects (it fails outside Next's own build, which does resolve
// it). Nothing in these tests goes through isIntlRoute, so it is stubbed
// rather than dragging in the real module.
vi.mock('next-intl/middleware', () => ({
  default: () => () => undefined,
}));

vi.mock('@clerk/nextjs/server', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    clerkMiddleware: handler => async req => {
      const auth = async () => ({
        userId: session.userId,
        redirectToSignIn: () =>
          new Response(null, { status: 307, headers: { location: '/auth/login' } }),
      });
      return handler(auth, req);
    },
    clerkClient: () => ({
      users: { getUser: async () => clerkUser },
    }),
  };
});

let middleware;

beforeAll(async () => {
  ({ default: middleware } = await import('@/middleware'));
});

beforeEach(() => {
  session.userId = null;
  clerkUser.publicMetadata = {};
});

describe('middleware · admin routes (T-12)', () => {
  it('/admin page with no session sends to login', async () => {
    const res = await middleware(new NextRequest('http://localhost/admin/sellers'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('/auth/login');
  });

  it('/api/sellers/admin api with no session responds 401, does not redirect', async () => {
    const res = await middleware(new NextRequest('http://localhost/api/sellers/admin'));
    expect(res.status).toBe(401);
  });

  it('/admin page with a session but no role sends home', async () => {
    session.userId = 'user_buyer';
    const res = await middleware(new NextRequest('http://localhost/admin/sellers'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/');
  });

  it('admin api with a session but no role responds 403', async () => {
    session.userId = 'user_buyer';
    const res = await middleware(new NextRequest('http://localhost/api/sellers/admin'));
    expect(res.status).toBe(403);
  });

  it('admin role in publicMetadata: admin page passes', async () => {
    session.userId = 'user_admin';
    clerkUser.publicMetadata = { role: 'admin' };
    const res = await middleware(new NextRequest('http://localhost/admin/sellers'));
    expect(res).toBeUndefined();
  });

  it('admin role in publicMetadata: admin api passes', async () => {
    session.userId = 'user_admin';
    clerkUser.publicMetadata = { role: 'admin' };
    const res = await middleware(new NextRequest('http://localhost/api/sellers/admin'));
    expect(res).toBeUndefined();
  });

  it('a non-admin route is unaffected, with or without a session', async () => {
    expect(await middleware(new NextRequest('http://localhost/antojos'))).toBeUndefined();

    session.userId = 'user_buyer';
    expect(await middleware(new NextRequest('http://localhost/antojos'))).toBeUndefined();
  });
});
