import { describe, expect, it } from 'vitest';

import { decideAdminAccess } from '@/utils/lib/adminAccess';

describe('decideAdminAccess', () => {
  it('deja pasar una ruta que no es de admin, sin importar sesion ni rol', () => {
    expect(
      decideAdminAccess({
        isAdminRoute: false,
        isApi: false,
        userId: null,
        isAdmin: false,
      })
    ).toEqual({ action: 'allow' });
  });

  it('pagina de admin sin sesion: manda a login', () => {
    expect(
      decideAdminAccess({
        isAdminRoute: true,
        isApi: false,
        userId: null,
        isAdmin: false,
      })
    ).toEqual({ action: 'signin' });
  });

  it('api de admin sin sesion: 401, no redirige', () => {
    expect(
      decideAdminAccess({
        isAdminRoute: true,
        isApi: true,
        userId: null,
        isAdmin: false,
      })
    ).toEqual({ action: 'json', status: 401 });
  });

  it('pagina de admin con sesion pero sin rol: manda al home', () => {
    expect(
      decideAdminAccess({
        isAdminRoute: true,
        isApi: false,
        userId: 'user_buyer',
        isAdmin: false,
      })
    ).toEqual({ action: 'redirect-home' });
  });

  it('api de admin con sesion pero sin rol: 403', () => {
    expect(
      decideAdminAccess({
        isAdminRoute: true,
        isApi: true,
        userId: 'user_buyer',
        isAdmin: false,
      })
    ).toEqual({ action: 'json', status: 403 });
  });

  it('pagina de admin con rol: deja pasar', () => {
    expect(
      decideAdminAccess({
        isAdminRoute: true,
        isApi: false,
        userId: 'user_admin',
        isAdmin: true,
      })
    ).toEqual({ action: 'allow' });
  });

  it('api de admin con rol: deja pasar', () => {
    expect(
      decideAdminAccess({
        isAdminRoute: true,
        isApi: true,
        userId: 'user_admin',
        isAdmin: true,
      })
    ).toEqual({ action: 'allow' });
  });
});
