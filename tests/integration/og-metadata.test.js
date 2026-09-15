import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

let getProductForMetadata;
let getSellerForMetadata;
let ids;

describe('T-69 · data for product/seller Open Graph', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    ({ getProductForMetadata } = await import(
      '@/server/products/getProductForMetadata'
    ));
    ({ getSellerForMetadata } = await import(
      '@/server/sellers/getSellerForMetadata'
    ));
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
  });

  it('brings name, description, price and image of the seeded product', async () => {
    const product = await getProductForMetadata(ids.approvedProduct);

    expect(product).toEqual({
      name: expect.any(String),
      description: expect.any(String),
      price: expect.any(Number),
      image: expect.any(String),
    });
  });

  it('a malformed product id returns null, not an exception', async () => {
    await expect(
      getProductForMetadata('esto-no-es-un-id-valido')
    ).resolves.toBeNull();
  });

  it('a well-formed but nonexistent product id returns null', async () => {
    await expect(
      getProductForMetadata('000000000000000000000000')
    ).resolves.toBeNull();
  });

  it('brings business name and logo of the seeded seller', async () => {
    const seller = await getSellerForMetadata(ids.approvedSeller);

    expect(seller).toMatchObject({
      businessName: expect.any(String),
      logo: expect.any(String),
    });
  });

  it('a malformed seller id returns null, not an exception', async () => {
    await expect(
      getSellerForMetadata('esto-no-es-un-id-valido')
    ).resolves.toBeNull();
  });

  it('a well-formed but nonexistent seller id returns null', async () => {
    await expect(
      getSellerForMetadata('000000000000000000000000')
    ).resolves.toBeNull();
  });
});
