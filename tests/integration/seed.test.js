import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

import { Product } from '@/utils/models/productSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Seller } from '@/utils/models/sellerSchema2';
import { User } from '@/utils/models/userSchema';

describe('scripts/seed', () => {
  beforeAll(async () => {
    await startTestDb();
    await seedDatabase();
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  it('creates 3 users, 2 sellers, 6 products and schedules', async () => {
    expect(await User.countDocuments()).toBe(3);
    expect(await Seller.countDocuments()).toBe(2);
    expect(await Product.countDocuments()).toBe(6);
    expect(await Schedule.countDocuments()).toBeGreaterThan(0);
  });

  it('leaves one seller approved and one pending', async () => {
    expect(await Seller.countDocuments({ approved: true })).toBe(1);
    expect(await Seller.countDocuments({ approved: false })).toBe(1);
  });

  it('links each seller with its user in both directions', async () => {
    const sellers = await Seller.find();

    for (const seller of sellers) {
      const owner = await User.findById(seller.userId);
      expect(owner).not.toBeNull();
      expect(owner.role).toBe('seller');
      expect(owner.sellerId.toString()).toBe(seller._id.toString());
    }
  });

  it('points products at a Seller, not a User', async () => {
    // The schema declares `ref: 'User'` but the actual value is a Seller: the
    // routes populate with an explicit `model: 'Seller'`. If somebody "fixes"
    // the ref without migrating the data, this test catches it.
    const sellerIds = (await Seller.find()).map(seller => seller._id.toString());

    for (const product of await Product.find()) {
      expect(sellerIds).toContain(product.sellerId.toString());
    }
  });

  it('seeds products in both sections, with valid categories', async () => {
    expect(await Product.countDocuments({ section: 'antojos' })).toBeGreaterThan(0);
    expect(await Product.countDocuments({ section: 'marketplace' })).toBeGreaterThan(0);

    // validateSync() applies the per-section category validator.
    for (const product of await Product.find()) {
      expect(product.validateSync()).toBeUndefined();
    }
  });

  it('gives both sellers schedules, with a day between 1 and 7', async () => {
    for (const seller of await Seller.find()) {
      expect(await Schedule.countDocuments({ sellerId: seller._id })).toBeGreaterThan(0);
    }

    for (const schedule of await Schedule.find()) {
      expect(schedule.day).toBeGreaterThanOrEqual(1);
      expect(schedule.day).toBeLessThanOrEqual(7);
    }
  });

  it('is idempotent: running it twice does not duplicate', async () => {
    await seedDatabase();

    expect(await User.countDocuments()).toBe(3);
    expect(await Seller.countDocuments()).toBe(2);
    expect(await Product.countDocuments()).toBe(6);
  });

  it('leaves the connection alive for the rest of the suite', () => {
    expect(mongoose.connection.readyState).toBe(1);
  });
});
