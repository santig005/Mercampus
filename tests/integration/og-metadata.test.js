import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

let getProductForMetadata;
let getSellerForMetadata;
let ids;

describe('T-69 · datos para el Open Graph de producto/vendedor', () => {
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

  it('trae nombre, descripcion, precio e imagen del producto sembrado', async () => {
    const product = await getProductForMetadata(ids.approvedProduct);

    expect(product).toEqual({
      name: expect.any(String),
      description: expect.any(String),
      price: expect.any(Number),
      image: expect.any(String),
    });
  });

  it('un id de producto con formato invalido devuelve null, no una excepcion', async () => {
    await expect(
      getProductForMetadata('esto-no-es-un-id-valido')
    ).resolves.toBeNull();
  });

  it('un id de producto bien formado pero inexistente devuelve null', async () => {
    await expect(
      getProductForMetadata('000000000000000000000000')
    ).resolves.toBeNull();
  });

  it('trae nombre de negocio y logo del vendedor sembrado', async () => {
    const seller = await getSellerForMetadata(ids.approvedSeller);

    expect(seller).toMatchObject({
      businessName: expect.any(String),
      logo: expect.any(String),
    });
  });

  it('un id de vendedor con formato invalido devuelve null, no una excepcion', async () => {
    await expect(
      getSellerForMetadata('esto-no-es-un-id-valido')
    ).resolves.toBeNull();
  });

  it('un id de vendedor bien formado pero inexistente devuelve null', async () => {
    await expect(
      getSellerForMetadata('000000000000000000000000')
    ).resolves.toBeNull();
  });
});
