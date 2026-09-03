import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

const session = vi.hoisted(() => ({ userId: null, email: null }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId }),
  clerkClient: async () => ({
    users: {
      getUser: async () => ({
        emailAddresses: [{ emailAddress: session.email }],
      }),
    },
  }),
  currentUser: async () =>
    session.email
      ? { id: session.userId, emailAddresses: [{ emailAddress: session.email }] }
      : null,
}));

const OWNER = 'carlos.mesa@example.test';

const put = body =>
  new Request('http://localhost/api', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

let productRoute;
let sellerRoute;
let Product;
let Seller;
let ids;

describe('validacion en el borde', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    productRoute = await import('@/app/api/products/[id]/route.js');
    sellerRoute = await import('@/app/api/sellers/[id]/route.js');
    ({ Product } = await import('@/utils/models/productSchema'));
    ({ Seller } = await import('@/utils/models/sellerSchema2'));
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
    session.userId = `user_${OWNER}`;
    session.email = OWNER;
  });

  it('400 con el detalle del campo cuando el tipo no cuadra', async () => {
    const response = await productRoute.PUT(put({ price: 'gratis' }), {
      params: { id: ids.approvedProduct },
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.fields.map(f => f.field)).toContain('price');
  });

  it('400 si la categoria no pertenece a la seccion, en vez de 500 al guardar', async () => {
    const response = await productRoute.PUT(
      put({ section: 'antojos', category: ['Tecnología'] }),
      { params: { id: ids.approvedProduct } }
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.fields[0].field).toBe('category');
    expect(body.fields[0].message).toContain('Tecnología');
  });

  it('400 si el nombre viene vacio', async () => {
    const response = await productRoute.PUT(put({ name: '   ' }), {
      params: { id: ids.approvedProduct },
    });

    expect(response.status).toBe(400);
  });

  it('no deja que el cliente reasigne el producto a otro vendedor', async () => {
    const antes = await Product.findById(ids.approvedProduct);

    const response = await productRoute.PUT(
      put({ name: 'Arepa', sellerId: ids.pendingSeller }),
      { params: { id: ids.approvedProduct } }
    );

    expect(response.status).toBe(200);
    const despues = await Product.findById(ids.approvedProduct);
    // sellerId no esta declarado en el schema de validacion, asi que Zod lo
    // descarta antes de que llegue a Mongoose.
    expect(despues.sellerId.toString()).toBe(antes.sellerId.toString());
  });

  it('no deja que un vendedor se autoapruebe por el body', async () => {
    await Seller.findByIdAndUpdate(ids.approvedSeller, { approved: false });

    const response = await sellerRoute.PUT(
      put({ slogan: 'Nuevo eslogan', approved: true }),
      { params: { id: ids.approvedSeller } }
    );

    expect(response.status).toBe(200);
    const seller = await Seller.findById(ids.approvedSeller);
    expect(seller.slogan).toBe('Nuevo eslogan');
    expect(seller.approved).toBe(false);
  });

  it('400 si el telefono no es numerico', async () => {
    const response = await sellerRoute.PUT(put({ phoneNumber: '300-123' }), {
      params: { id: ids.approvedSeller },
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.fields.map(f => f.field)).toContain('phoneNumber');
  });

  it('acepta un cuerpo valido', async () => {
    const response = await productRoute.PUT(
      put({ name: 'Arepa con todo', price: 9000 }),
      { params: { id: ids.approvedProduct } }
    );

    expect(response.status).toBe(200);
    const product = await Product.findById(ids.approvedProduct);
    expect(product.name).toBe('Arepa con todo');
    expect(product.price).toBe(9000);
  });

  describe('query params', () => {
    it('400 si sellerId no es un ObjectId, en vez de un CastError 500', async () => {
      const productsRoute = await import('@/app/api/products/route.js');

      const response = await productsRoute.GET(
        new Request('http://localhost/api/products?sellerId=no-es-un-id')
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.fields.map(f => f.field)).toContain('sellerId');
    });

    it('una consulta sin parametros sigue devolviendo el listado', async () => {
      const productsRoute = await import('@/app/api/products/route.js');

      const response = await productsRoute.GET(
        new Request('http://localhost/api/products')
      );

      expect(response.status).toBe(200);
      const { products } = await response.json();
      expect(products.length).toBeGreaterThan(0);
    });
  });
});
