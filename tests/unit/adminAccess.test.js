import { describe, expect, it } from 'vitest';

import { decideAdminAccess } from '@/utils/lib/adminAccess';

describe('decideAdminAccess', () => {
  it('lets through a route that is not an admin route, regardless of session or role', () => {
    expect(
      decideAdminAccess({
        isAdminRoute: false,
        isApi: false,
        userId: null,
        isAdmin: false,
      })
    ).toEqual({ action: 'allow' });
  });

  it('admin page with no session: sends to login', () => {
    expect(
      decideAdminAccess({
        isAdminRoute: true,
        isApi: false,
        userId: null,
        isAdmin: false,
      })
    ).toEqual({ action: 'signin' });
  });

  it('admin api with no session: 401, does not redirect', () => {
    expect(
      decideAdminAccess({
        isAdminRoute: true,
        isApi: true,
        userId: null,
        isAdmin: false,
      })
    ).toEqual({ action: 'json', status: 401 });
  });

  it('admin page with a session but no role: sends home', () => {
    expect(
      decideAdminAccess({
        isAdminRoute: true,
        isApi: false,
        userId: 'user_buyer',
        isAdmin: false,
      })
    ).toEqual({ action: 'redirect-home' });
  });

  it('admin api with a session but no role: 403', () => {
    expect(
      decideAdminAccess({
        isAdminRoute: true,
        isApi: true,
        userId: 'user_buyer',
        isAdmin: false,
      })
    ).toEqual({ action: 'json', status: 403 });
  });

  it('admin page with the role: lets through', () => {
    expect(
      decideAdminAccess({
        isAdminRoute: true,
        isApi: false,
        userId: 'user_admin',
        isAdmin: true,
      })
    ).toEqual({ action: 'allow' });
  });

  it('admin api with the role: lets through', () => {
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
