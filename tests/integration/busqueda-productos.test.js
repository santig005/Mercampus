import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

let productsRoute;

const get = query =>
  productsRoute.GET(new Request(`http://localhost/api/products?${query}`));

const namesFrom = async response => (await response.json()).products.map(p => p.name);

describe('GET /api/products · búsqueda (T-24)', () => {
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

  it('un termino sin tilde encuentra el producto sembrado con eñe', async () => {
    // Del seed: "Buñuelo".
    const nombres = await namesFrom(await get('section=antojos&product=bunuelo'));
    expect(nombres).toContain('Buñuelo');
  });

  it('sigue funcionando como busqueda en vivo: un prefijo corto encuentra el producto', async () => {
    const nombres = await namesFrom(await get('section=antojos&product=are'));
    expect(nombres).toContain('Arepa de queso');
  });

  it('un termino que no aparece en ningun nombre no trae nada', async () => {
    const nombres = await namesFrom(await get('section=antojos&product=pizza'));
    expect(nombres).toEqual([]);
  });

  it('la busqueda respeta el filtro de vendedor aprobado', async () => {
    // "Brownie de chocolate" es del vendedor pendiente de aprobacion.
    const nombres = await namesFrom(await get('section=antojos&product=brownie'));
    expect(nombres).toEqual([]);
  });

  it('un termino con caracteres especiales de regex no revienta la consulta', async () => {
    const response = await get('section=antojos&product=' + encodeURIComponent('a(b'));
    expect(response.status).toBe(200);
  });
});
