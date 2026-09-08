import { describe, expect, it } from 'vitest';

/**
 * T-12d: GET /api/users/user-with-seller/[email] no tenia ninguna
 * authentication and answered 200 with the full User and Seller to anyone
 * who tried an email - an account-enumeration oracle.
 * SellerContext now receives user/seller resolved on the server by clerkId
 * (getSellerContextData, T-12c), so the route is no longer needed.
 * This confirms the file is gone: with no `route.js`, Next answers 404 on
 * verdad.
 */
describe('GET /api/users/user-with-seller/[email]', () => {
  it('ya no existe', async () => {
    await expect(
      import('@/app/api/users/user-with-seller/[email]/route')
    ).rejects.toThrow();
  });
});
