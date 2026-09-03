import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

import { Schedule } from '@/utils/models/scheduleSchema';
import { Seller } from '@/utils/models/sellerSchema2';

let productsRoute;
let sellersRoute;

describe('horarios sin N+1', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    productsRoute = await import('@/app/api/products/route.js');
    sellersRoute = await import('@/app/api/sellers/route.js');
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await seedDatabase();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('el listado de productos consulta horarios una sola vez', async () => {
    // Aprobar al segundo vendedor para que el listado traiga productos de dos
    // vendedores distintos: asi el test detecta tanto una consulta por producto
    // como una por vendedor.
    await Seller.updateMany({}, { $set: { approved: true } });

    const spy = vi.spyOn(Schedule, 'find');

    const response = await productsRoute.GET(
      new Request('http://localhost/api/products?section=antojos')
    );
    const { products } = await response.json();

    // Varios productos, del mismo vendedor: antes eran tantas consultas como
    // productos.
    expect(products.length).toBeGreaterThan(1);
    expect(new Set(products.map(p => p.sellerId._id)).size).toBeGreaterThan(1);
    expect(spy).toHaveBeenCalledTimes(1);

    // Y los horarios siguen llegando, con el dia ya traducido.
    expect(products[0].schedules.length).toBeGreaterThan(0);
    expect(products[0].schedules[0].day).toBe('Lunes');
  });

  it('el listado de vendedores consulta horarios una sola vez', async () => {
    const spy = vi.spyOn(Schedule, 'find');

    const response = await sellersRoute.GET(new Request('http://localhost/api/sellers'));
    const { sellers } = await response.json();

    expect(sellers.length).toBeGreaterThan(1);
    expect(spy).toHaveBeenCalledTimes(1);

    const parche = sellers.find(seller => seller.businessName === 'Arepas El Parche');
    expect(parche.schedules.map(schedule => schedule.day)).toEqual([
      'Lunes',
      'Miércoles',
      'Viernes',
    ]);
  });

  it('un vendedor sin horarios devuelve una lista vacia, no falla', async () => {
    const seller = await Seller.create({
      businessName: 'Sin horario',
      phoneNumber: 3000000000,
      userId: new mongoose.Types.ObjectId(),
      approved: true,
      university: 'Universidad EAFIT',
    });

    const response = await sellersRoute.GET(new Request('http://localhost/api/sellers'));
    const { sellers } = await response.json();

    const nuevo = sellers.find(s => s._id === seller._id.toString());
    expect(nuevo.schedules).toEqual([]);
  });
});
