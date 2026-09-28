import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// T-165: a product opened from a seller's product list (product -> seller ->
// product) showed no seller and no schedule, and its WhatsApp button had no
// number, because this route returned bare Product documents - `sellerId` as
// a plain id, no `schedules` - while ProductModal expects the listing's shape.

let route;
let ids;

describe('GET /api/products/seller/[id] (T-165)', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    route = await import('@/app/api/products/seller/[id]/route.js');
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
  });

  const get = (id, query = '') =>
    route.GET(new Request(`http://localhost/api/products/seller/${id}${query}`), {
      params: { id },
    });

  it('each product carries the populated seller, like the listing', async () => {
    const response = await get(ids.approvedSeller);

    expect(response.status).toBe(200);
    const { products } = await response.json();
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      // The fields ProductModal reads for the header and the WhatsApp link.
      expect(product.sellerId._id).toBe(ids.approvedSeller);
      expect(product.sellerId.businessName).toBe('Arepas El Parche');
      expect(product.sellerId.phoneNumber).toBeTruthy();
    }
  });

  it('each product carries the seller schedules, with day names', async () => {
    const { products } = await (await get(ids.approvedSeller)).json();

    for (const product of products) {
      expect(product.schedules.length).toBeGreaterThan(0);
      expect(product.schedules[0].day).toBe('Lunes');
    }
  });

  it('each product carries availabilityStatus, like the listing', async () => {
    const { products } = await (await get(ids.approvedSeller)).json();

    for (const product of products) {
      expect(product.availabilityStatus).toBeDefined();
    }
  });

  it('an uppercase id still finds the schedules', async () => {
    const { products } = await (await get(ids.approvedSeller.toUpperCase())).json();

    expect(products.length).toBeGreaterThan(0);
    expect(products[0].schedules.length).toBeGreaterThan(0);
  });

  it('filters by section', async () => {
    const { products } = await (await get(ids.approvedSeller, '?section=marketplace')).json();

    for (const product of products) {
      expect(product.section).toBe('marketplace');
    }
  });

  it('400, not 500, for a malformed id', async () => {
    const response = await get('not-an-id');

    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).not.toMatch(/CastError|Cast to ObjectId/);
  });

  it('400 for an unknown section', async () => {
    expect((await get(ids.approvedSeller, '?section=otra')).status).toBe(400);
  });

  // Unchanged on purpose (see the route): the seller's own edit screen reads
  // this too, so a not-yet-approved seller still gets its products back.
  it('still returns the products of a pending seller', async () => {
    const { products } = await (await get(ids.pendingSeller)).json();

    expect(products.length).toBeGreaterThan(0);
  });
});
