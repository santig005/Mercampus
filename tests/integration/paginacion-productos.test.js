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

describe('GET /api/products · sort (T-70)', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    productsRoute = await import('@/app/api/products/route.js');
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());

    // Precios bien separados para que ningun desempate por precio dependa
    // del orden de insercion.
    const precios = [500, 4000, 1500, 3000, 2500];
    for (let i = 0; i < precios.length; i++) {
      await Product.create({
        name: `Ordenado ${i + 1}`,
        price: precios[i],
        description: 'Producto de prueba para el ordenamiento.',
        images: ['https://ik.imagekit.io/seed/ordenado.jpg'],
        section: 'antojos',
        category: ['Otros'],
        sellerId: ids.approvedSeller,
        availability: true,
      });
    }
  });

  const collectAllPages = async (sort, limit = 2) => {
    const nombres = [];
    let cursor = '';

    for (let i = 0; i < 20; i++) {
      const query = `section=antojos&product=Ordenado&sort=${sort}&limit=${limit}${
        cursor ? `&cursor=${cursor}` : ''
      }`;
      const body = await (await get(query)).json();
      nombres.push(...body.products.map(p => p.name));
      if (!body.nextCursor) break;
      cursor = body.nextCursor;
    }

    return nombres;
  };

  it('price_asc ordena de menor a mayor precio a traves de todas las paginas', async () => {
    const nombres = await collectAllPages('price_asc');
    expect(nombres).toEqual([
      'Ordenado 1',
      'Ordenado 3',
      'Ordenado 5',
      'Ordenado 4',
      'Ordenado 2',
    ]);
  });

  it('price_desc ordena de mayor a menor precio a traves de todas las paginas', async () => {
    const nombres = await collectAllPages('price_desc');
    expect(nombres).toEqual([
      'Ordenado 2',
      'Ordenado 4',
      'Ordenado 5',
      'Ordenado 3',
      'Ordenado 1',
    ]);
  });

  it('newest ordena por mas reciente primero', async () => {
    const nombres = await collectAllPages('newest');
    // Se crearon en orden 1..5, asi que el mas nuevo es el ultimo creado.
    expect(nombres).toEqual([
      'Ordenado 5',
      'Ordenado 4',
      'Ordenado 3',
      'Ordenado 2',
      'Ordenado 1',
    ]);
  });

  it('un cursor de un sort no sirve para paginar otro sort', async () => {
    const primera = await (
      await get('section=antojos&product=Ordenado&sort=price_asc&limit=2')
    ).json();

    const response = await get(
      `section=antojos&product=Ordenado&sort=newest&limit=2&cursor=${primera.nextCursor}`
    );

    expect(response.status).toBe(400);
  });

  it('sin sort, el orden por default no cambia (availability desc, createdAt desc)', async () => {
    const nombres = await collectAllPages('default');
    // El default no depende del precio: los 5 son availability:true, asi que
    // el desempate es createdAt desc - el ultimo creado aparece primero.
    expect(nombres).toEqual([
      'Ordenado 5',
      'Ordenado 4',
      'Ordenado 3',
      'Ordenado 2',
      'Ordenado 1',
    ]);
  });

  it('cada sort nuevo se resuelve por indice, no por collection scan', async () => {
    await Product.syncIndexes();

    const planNewest = await Product.find({ section: 'antojos' })
      .sort({ createdAt: -1, _id: -1 })
      .explain('queryPlanner');
    expect(JSON.stringify(planNewest.queryPlanner.winningPlan)).toContain('IXSCAN');

    const planPrice = await Product.find({ section: 'antojos' })
      .sort({ price: 1, _id: 1 })
      .explain('queryPlanner');
    expect(JSON.stringify(planPrice.queryPlanner.winningPlan)).toContain('IXSCAN');
  });
});
