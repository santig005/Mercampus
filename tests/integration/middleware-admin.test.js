import { NextRequest } from 'next/server';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Sesion y publicMetadata de Clerk simuladas. vi.hoisted porque vi.mock se
// eleva por encima de todo lo demas y necesita leer estos objetos.
const session = vi.hoisted(() => ({ userId: null }));
const clerkUser = vi.hoisted(() => ({ publicMetadata: {} }));

// Se mockean solo clerkMiddleware y clerkClient. createRouteMatcher se deja
// real: es lo que decide si /admin/sellers y /api/sellers/admin coinciden
// con los patrones, y eso es justo parte de lo que hay que probar.
//
// clerkMiddleware real valida el token de sesion contra los servidores de
// Clerk (necesita una cookie real, como el e2e de T-04) - aqui se reemplaza
// por un wrapper minimo que le pasa al handler de middleware.js un `auth()`
// controlable, igual que autorizacion.test.js mockea `auth` para los route
// handlers.
// next-intl/middleware importa next/server con una especificacion que el
// resolvedor ESM de Vitest no acepta (falla fuera de la propia build de
// Next, que sí lo resuelve). Nada en estos tests pasa por isIntlRoute, asi
// que se reemplaza por un stub en vez de arrastrar ese modulo real.
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

describe('middleware · rutas de admin (T-12)', () => {
  it('pagina /admin sin sesion manda a login', async () => {
    const res = await middleware(new NextRequest('http://localhost/admin/sellers'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('/auth/login');
  });

  it('api /api/sellers/admin sin sesion responde 401, no redirige', async () => {
    const res = await middleware(new NextRequest('http://localhost/api/sellers/admin'));
    expect(res.status).toBe(401);
  });

  it('pagina /admin con sesion pero sin rol manda al home', async () => {
    session.userId = 'user_buyer';
    const res = await middleware(new NextRequest('http://localhost/admin/sellers'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/');
  });

  it('api de admin con sesion pero sin rol responde 403', async () => {
    session.userId = 'user_buyer';
    const res = await middleware(new NextRequest('http://localhost/api/sellers/admin'));
    expect(res.status).toBe(403);
  });

  it('rol de admin en publicMetadata: pagina de admin pasa', async () => {
    session.userId = 'user_admin';
    clerkUser.publicMetadata = { role: 'admin' };
    const res = await middleware(new NextRequest('http://localhost/admin/sellers'));
    expect(res).toBeUndefined();
  });

  it('rol de admin en publicMetadata: api de admin pasa', async () => {
    session.userId = 'user_admin';
    clerkUser.publicMetadata = { role: 'admin' };
    const res = await middleware(new NextRequest('http://localhost/api/sellers/admin'));
    expect(res).toBeUndefined();
  });

  it('una ruta que no es de admin no se ve afectada, con o sin sesion', async () => {
    expect(await middleware(new NextRequest('http://localhost/antojos'))).toBeUndefined();

    session.userId = 'user_buyer';
    expect(await middleware(new NextRequest('http://localhost/antojos'))).toBeUndefined();
  });
});
