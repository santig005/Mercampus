import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

import { Product } from '@/utils/models/productSchema';

let productsRoute;
let ids;

const get = query =>
  productsRoute.GET(new Request(`http://localhost/api/products?${query}`));

describe('GET /api/products · paginación (T-23)', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    productsRoute = await import('@/app/api/products/route.js');
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());

    // 5 productos propios, aislados del resto del seed por el prefijo del
    // nombre: asi el test no depende de cuantos productos siembre seed.mjs
    // hoy (3 antojos visibles), y no se rompe si esa cantidad cambia.
    for (let i = 1; i <= 5; i++) {
      await Product.create({
        name: `Paginado ${i}`,
        price: 1000 * i,
        description: 'Producto de prueba para la paginacion.',
        images: ['https://ik.imagekit.io/seed/paginado.jpg'],
        section: 'antojos',
        category: ['Otros'],
        sellerId: ids.approvedSeller,
        availability: i % 2 === 0, // mezcla de disponibles/no disponibles
      });
    }
  });

  it('respeta el limit y avisa que hay mas con nextCursor', async () => {
    const body = await (await get('section=antojos&product=Paginado&limit=2')).json();

    expect(body.products).toHaveLength(2);
    expect(body.nextCursor).toEqual(expect.any(String));
  });

  it('la ultima pagina trae el resto y nextCursor en null', async () => {
    const primera = await (
      await get('section=antojos&product=Paginado&limit=3')
    ).json();
    const segunda = await (
      await get(`section=antojos&product=Paginado&limit=3&cursor=${primera.nextCursor}`)
    ).json();

    expect(primera.products).toHaveLength(3);
    expect(segunda.products).toHaveLength(2);
    expect(segunda.nextCursor).toBeNull();
  });

  it('el cursor avanza sin repetir ni saltarse productos', async () => {
    const vistos = new Set();
    let cursor = '';

    for (let i = 0; i < 10; i++) {
      const query = `section=antojos&product=Paginado&limit=2${
        cursor ? `&cursor=${cursor}` : ''
      }`;
      const body = await (await get(query)).json();

      for (const product of body.products) {
        expect(vistos.has(product._id)).toBe(false); // nunca un repetido
        vistos.add(product._id);
      }

      if (!body.nextCursor) break;
      cursor = body.nextCursor;
    }

    expect(vistos.size).toBe(5);
  });

  it('un vendedor pendiente de aprobacion nunca aparece, en ninguna pagina', async () => {
    const vistos = [];
    let cursor = '';

    for (let i = 0; i < 10; i++) {
      const query = `section=antojos&limit=2${cursor ? `&cursor=${cursor}` : ''}`;
      const body = await (await get(query)).json();
      vistos.push(...body.products.map(p => p.name));
      if (!body.nextCursor) break;
      cursor = body.nextCursor;
    }

    expect(vistos).not.toContain('Brownie de chocolate');
    expect(vistos).not.toContain('Galletas de avena');
  });

  it('un sellerId que no es elegible devuelve una pagina vacia, no un 500', async () => {
    const response = await get(`sellerId=${ids.pendingSeller}`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ products: [], nextCursor: null });
  });

  it('un cursor invalido responde 400 en vez de reventar contra Mongo', async () => {
    const response = await get('cursor=esto-no-es-un-cursor-valido');
    expect(response.status).toBe(400);
  });

  it('la consulta paginada se resuelve por indice, no por collection scan', async () => {
    await Product.syncIndexes();

    const plan = await Product.find({ section: 'antojos' })
      .sort({ availability: -1, createdAt: -1, _id: -1 })
      .explain('queryPlanner');

    expect(JSON.stringify(plan.queryPlanner.winningPlan)).toContain('IXSCAN');
  });
});
