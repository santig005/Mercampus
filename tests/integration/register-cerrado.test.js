import { describe, expect, it } from 'vitest';

/**
 * T-11: POST /api/register created users with no authentication and no
 * validation. User creation depends solely on Clerk's webhook (T-12b) - this
 * route was deleted rather than protected. This confirms the file is gone:
 * in Next's App Router, with no `route.js` the real request answers 404.
 */
describe('POST /api/register', () => {
  it('ya no existe', async () => {
    await expect(import('@/app/api/register/route')).rejects.toThrow();
  });
});
