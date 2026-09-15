import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

let productsRoute;

const get = query =>
  productsRoute.GET(new Request(`http://localhost/api/products?${query}`));

const namesFrom = async response => (await response.json()).products.map(p => p.name);

describe('GET /api/products · search (T-24)', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    productsRoute = await import('@/app/api/products/route.js');
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await seedDatabase();
  });

  it('a term without an accent finds the seeded product with an ñ', async () => {
    // From the seed: "Buñuelo".
    const nombres = await namesFrom(await get('section=antojos&product=bunuelo'));
    expect(nombres).toContain('Buñuelo');
  });

  it('still works as a live search: a short prefix finds the product', async () => {
    const nombres = await namesFrom(await get('section=antojos&product=are'));
    expect(nombres).toContain('Arepa de queso');
  });

  it('a term that appears in no name brings back nothing', async () => {
    const nombres = await namesFrom(await get('section=antojos&product=pizza'));
    expect(nombres).toEqual([]);
  });

  it('the search respects the approved-seller filter', async () => {
    // "Brownie de chocolate" belongs to the seller awaiting approval.
    const nombres = await namesFrom(await get('section=antojos&product=brownie'));
    expect(nombres).toEqual([]);
  });

  it('a term with regex special characters does not break the query', async () => {
    const response = await get('section=antojos&product=' + encodeURIComponent('a(b'));
    expect(response.status).toBe(200);
  });
});
