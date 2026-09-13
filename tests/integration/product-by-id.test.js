import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// T-97, audit findings F28 and F29, both about the same route answering a 500:
//
// - F28: GET /api/products/[id] populated the owner with
//   `match: { approved: true }` and read `product.sellerId._id` on the next
//   line, so every product whose seller is not publicly visible answered 500
//   ("Cannot read properties of null"). Measured read-only against the real
//   database on 2026-09-08: 17 of 112 products.
// - F29: a malformed id reached Mongoose and came back as a 500 carrying the
//   CastError - the internal model name included - in the response body.
//
// The second half of F28 is the edit screen, which read that route from the
// client and turned any failure into one bare line of text. It resolves its
// product on the server now: getProductForEdit, at the bottom of this file.
const session = vi.hoisted(() => ({ userId: null }));

// Since T-12c identity is the token's clerkId, so stubbing auth() is enough.
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId }),
}));

const OWNER = 'user_seed_carlos'; // owner of the approved seller, per the seed
const BUYER = 'user_seed_ana'; // a session with no seller profile
const UNKNOWN_ID = '64b7f1c2a1b2c3d4e5f60718'; // well formed, matches nothing

let route;
let getProductForEdit;
let Product;
let Seller;
let ids;

describe('product by id (T-97)', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    route = await import('@/app/api/products/[id]/route.js');
    ({ getProductForEdit } = await import('@/server/products/getProductForEdit'));
    ({ Product } = await import('@/utils/models/productSchema'));
    ({ Seller } = await import('@/utils/models/sellerSchema2'));
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
    session.userId = null;
  });

  const get = id =>
    route.GET(new Request(`http://localhost/api/products/${id}`), {
      params: { id },
    });

  describe('GET /api/products/[id]', () => {
    it('200 with the owner populated and the schedules', async () => {
      const response = await get(ids.approvedProduct);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.sellerId.businessName).toBe('Arepas El Parche');
      // The schedules are keyed off the populated seller's _id - the exact
      // line that used to throw.
      expect(body.schedules.length).toBeGreaterThan(0);
      expect(body.schedules[0].day).toBe('Lunes');
    });

    // --- F29 ---------------------------------------------------------------

    it('400, not 500, for a malformed id', async () => {
      expect((await get('not-an-id')).status).toBe(400);
    });

    it('the 400 leaks neither the CastError nor the model name', async () => {
      const body = await (await get('not-an-id')).json();
      const serialised = JSON.stringify(body);

      expect(serialised).not.toContain('Cast to ObjectId');
      expect(serialised).not.toContain('Product');
      // It still says which field was wrong, like every other 400 here.
      expect(body.fields[0].message).toContain('id del producto');
    });

    // --- F28 ---------------------------------------------------------------

    it('404 for a well-formed ObjectId that matches nothing', async () => {
      expect((await get(UNKNOWN_ID)).status).toBe(404);
    });

    it('404, not 500, for an unapproved seller’s product', async () => {
      const response = await get(ids.pendingProduct);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ message: 'Product not found' });
    });

    it('404, not 500, when sellerId points at no seller at all', async () => {
      // The 3 orphan products measured in production: the owner is gone and
      // the populate yields null for the same reason.
      const orphan = await Product.create({
        name: 'Producto huerfano',
        price: 1000,
        description: 'Su vendedor ya no existe.',
        images: ['https://ik.imagekit.io/seed/huerfano.jpg'],
        section: 'antojos',
        category: ['Frituras'],
        sellerId: '64b7f1c2a1b2c3d4e5f60719',
      });

      expect((await get(orphan._id.toString())).status).toBe(404);
    });

    it('404 for a paused seller’s product', async () => {
      // This route left `paused` out of its visibility rule while the
      // listing, the seller list and the sitemap all apply it
      // (publicSellerFilter, T-74), so a paused seller's product stayed
      // reachable by direct link. No seller in the real database carries the
      // field today (0 of 54, measured), so this moves no existing row.
      await Seller.findByIdAndUpdate(ids.approvedSeller, { paused: true });

      expect((await get(ids.approvedProduct)).status).toBe(404);
    });

    it('the unapproved owner’s 404 is indistinguishable from the missing one', async () => {
      // Telling them apart would answer "this exists but you may not see it"
      // to anybody trying ids.
      const [unknown, pending] = await Promise.all([
        get(UNKNOWN_ID).then(r => r.json()),
        get(ids.pendingProduct).then(r => r.json()),
      ]);

      expect(pending).toEqual(unknown);
    });

    it('400 and not 500 on PUT and DELETE with a malformed id', async () => {
      // F29 named the GET, but the same id reached Mongoose through
      // verifyOwnershipAndGetSellerId in the other two handlers.
      session.userId = OWNER;
      const put = new Request('http://localhost/api/products/not-an-id', {
        method: 'PUT',
        body: JSON.stringify({ name: 'x' }),
        headers: { 'content-type': 'application/json' },
      });

      const [putResponse, deleteResponse] = await Promise.all([
        route.PUT(put, { params: { id: 'not-an-id' } }),
        route.DELETE(new Request('http://localhost/api'), {
          params: { id: 'not-an-id' },
        }),
      ]);

      expect(putResponse.status).toBe(400);
      expect(deleteResponse.status).toBe(400);
    });
  });

  describe('getProductForEdit (the edit screen)', () => {
    beforeEach(() => {
      session.userId = OWNER;
    });

    it('returns your own product, as plain JSON', async () => {
      const access = await getProductForEdit(ids.approvedProduct);

      expect(access.status).toBe('ok');
      expect(access.product.name).toBe('Arepa de queso');
      // It crosses into a Client Component: no ObjectId, no Date.
      expect(typeof access.product._id).toBe('string');
      expect(typeof access.product.sellerId).toBe('string');
    });

    it('still returns your own product once the seller loses approval', async () => {
      // This is what F28 said a seller loses - their own product, because the
      // public route's populate filter was deciding it for them.
      await Seller.findByIdAndUpdate(ids.approvedSeller, { approved: false });

      expect((await getProductForEdit(ids.approvedProduct)).status).toBe('ok');
    });

    it('still returns your own product with the store paused', async () => {
      await Seller.findByIdAndUpdate(ids.approvedSeller, { paused: true });

      expect((await getProductForEdit(ids.approvedProduct)).status).toBe('ok');
    });

    it('not-found for a malformed id, without reaching Mongoose', async () => {
      await expect(getProductForEdit('not-an-id')).resolves.toEqual({
        status: 'not-found',
      });
    });

    it('not-found for an ObjectId that does not exist', async () => {
      await expect(getProductForEdit(UNKNOWN_ID)).resolves.toEqual({
        status: 'not-found',
      });
    });

    it('forbidden, and carries no data, for another seller’s product', async () => {
      await expect(getProductForEdit(ids.pendingProduct)).resolves.toEqual({
        status: 'forbidden',
      });
    });

    it('forbidden with no session', async () => {
      session.userId = null;

      expect((await getProductForEdit(ids.approvedProduct)).status).toBe(
        'forbidden'
      );
    });

    it('forbidden for a session that is not a seller', async () => {
      session.userId = BUYER;

      expect((await getProductForEdit(ids.approvedProduct)).status).toBe(
        'forbidden'
      );
    });
  });
});
