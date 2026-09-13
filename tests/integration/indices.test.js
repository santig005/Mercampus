import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

import { Product } from '@/utils/models/productSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Seller } from '@/utils/models/sellerSchema2';
import { User } from '@/utils/models/userSchema';

let ids;

// A plan can nest the IXSCAN at different depths depending on the Mongo
// version and whether there is a sort or projection. Looking for it in the
// serialised plan is sturdier than assuming a particular shape.
const usesIndex = async query => {
  const plan = await query.explain('queryPlanner');
  return JSON.stringify(plan.queryPlanner.winningPlan).includes('IXSCAN');
};

const indexKeys = async model =>
  (await model.collection.listIndexes().toArray()).map(index =>
    Object.keys(index.key).join(',')
  );

describe('indices', () => {
  beforeAll(async () => {
    await startTestDb();
    ({ ids } = await seedDatabase());
    // The indexes declared in the schema are created when the model starts.
    await Promise.all([
      Product.syncIndexes(),
      Schedule.syncIndexes(),
      Seller.syncIndexes(),
      User.syncIndexes(),
    ]);
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  it('declara los indices que pide el ROADMAP', async () => {
    expect(await indexKeys(Product)).toEqual(
      expect.arrayContaining(['sellerId', 'section'])
    );
    expect(await indexKeys(Schedule)).toEqual(
      expect.arrayContaining(['sellerId'])
    );
    expect(await indexKeys(Seller)).toEqual(
      expect.arrayContaining(['userId', 'university'])
    );
    expect(await indexKeys(User)).toEqual(expect.arrayContaining(['email']));
  });

  it('Product.sellerId se resuelve por indice, no por collection scan', async () => {
    expect(await usesIndex(Product.find({ sellerId: ids.approvedSeller }))).toBe(
      true
    );
  });

  it('Schedule.sellerId se resuelve por indice', async () => {
    expect(
      await usesIndex(Schedule.find({ sellerId: ids.approvedSeller }))
    ).toBe(true);
  });

  it('Seller.userId y Seller.university se resuelven por indice', async () => {
    const seller = await Seller.findById(ids.approvedSeller);

    expect(await usesIndex(Seller.find({ userId: seller.userId }))).toBe(true);
    expect(
      await usesIndex(Seller.find({ university: 'Universidad EAFIT' }))
    ).toBe(true);
  });

  it('User.email se resuelve por indice', async () => {
    expect(
      await usesIndex(User.find({ email: 'carlos.mesa@example.test' }))
    ).toBe(true);
  });

  it('una consulta sin indice sigue siendo collection scan', async () => {
    // Control: si esto diera true, el test de arriba no probaria nada.
    expect(await usesIndex(Product.find({ description: /arepa/i }))).toBe(false);
  });
});
