import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { migrateProductSection } from '../../scripts/migrate-product-section.mjs';
import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

let productsRoute;
let ids;

// The schema defaults section to 'antojos', so a product without the field
// can only be created by writing to the collection directly. That is how
// the old products look in production.
const insertLegacyProduct = sellerId =>
  mongoose.connection.db.collection('products').insertOne({
    name: 'Producto heredado',
    price: 3000,
    description: 'Creado antes de que existiera el campo section',
    images: ['https://ik.imagekit.io/seed/legado.jpg'],
    category: ['Dulces'],
    sellerId: new mongoose.Types.ObjectId(sellerId),
    availability: true,
    stock: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const findLegacy = () =>
  mongoose.connection.db
    .collection('products')
    .findOne({ name: 'Producto heredado' });

describe('migracion de section fuera del handler', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    productsRoute = await import('@/app/api/products/route.js');
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
  });

  it('la migracion pone section a los productos que no la tienen', async () => {
    await insertLegacyProduct(ids.approvedSeller);
    expect((await findLegacy()).section).toBeUndefined();

    const result = await migrateProductSection();

    expect(result).toEqual({ pending: 1, updated: 1 });
    expect((await findLegacy()).section).toBe('antojos');
  });

  it('es idempotente: sin pendientes no escribe nada', async () => {
    expect(await migrateProductSection()).toEqual({ pending: 0, updated: 0 });
  });

  it('GET /api/products no escribe en la base', async () => {
    await insertLegacyProduct(ids.approvedSeller);

    await productsRoute.GET(
      new Request('http://localhost/api/products?section=antojos')
    );

    // The handler used to run the migration on every request. If that sneaks
    // back in, this product would come out with section set.
    expect((await findLegacy()).section).toBeUndefined();
  });
});
