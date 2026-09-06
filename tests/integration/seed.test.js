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

  it('crea 3 usuarios, 2 vendedores, 6 productos y horarios', async () => {
    expect(await User.countDocuments()).toBe(3);
    expect(await Seller.countDocuments()).toBe(2);
    expect(await Product.countDocuments()).toBe(6);
    expect(await Schedule.countDocuments()).toBeGreaterThan(0);
  });

  it('deja un vendedor aprobado y uno pendiente', async () => {
    expect(await Seller.countDocuments({ approved: true })).toBe(1);
    expect(await Seller.countDocuments({ approved: false })).toBe(1);
  });

  it('enlaza cada vendedor con su usuario en los dos sentidos', async () => {
    const sellers = await Seller.find();

    for (const seller of sellers) {
      const owner = await User.findById(seller.userId);
      expect(owner).not.toBeNull();
      expect(owner.role).toBe('seller');
      expect(owner.sellerId.toString()).toBe(seller._id.toString());
    }
  });

  it('apunta los productos a un Seller, no a un User', async () => {
    // El schema declara `ref: 'User'` pero el valor real es un Seller: las
    // rutas pueblan con `model: 'Seller'` explícito. Si alguien "arregla" el
    // ref sin migrar los datos, este test lo delata.
    const sellerIds = (await Seller.find()).map(seller => seller._id.toString());

    for (const product of await Product.find()) {
      expect(sellerIds).toContain(product.sellerId.toString());
    }
  });

  it('siembra productos de las dos secciones, con categorías válidas', async () => {
    expect(await Product.countDocuments({ section: 'antojos' })).toBeGreaterThan(0);
    expect(await Product.countDocuments({ section: 'marketplace' })).toBeGreaterThan(0);

    // validateSync() aplica el validador de categorías por sección.
    for (const product of await Product.find()) {
      expect(product.validateSync()).toBeUndefined();
    }
  });

  it('da horarios a los dos vendedores, con día entre 1 y 7', async () => {
    for (const seller of await Seller.find()) {
      expect(await Schedule.countDocuments({ sellerId: seller._id })).toBeGreaterThan(0);
    }

    for (const schedule of await Schedule.find()) {
      expect(schedule.day).toBeGreaterThanOrEqual(1);
      expect(schedule.day).toBeLessThanOrEqual(7);
    }
  });

  it('es idempotente: correrlo dos veces no duplica', async () => {
    await seedDatabase();

    expect(await User.countDocuments()).toBe(3);
    expect(await Seller.countDocuments()).toBe(2);
    expect(await Product.countDocuments()).toBe(6);
  });

  it('deja la conexión viva para el resto de la suite', () => {
    expect(mongoose.connection.readyState).toBe(1);
  });
});
