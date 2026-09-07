import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// Same Clerk stub as autorizacion.test.js: since T-12c the identity comes from
// the clerkId in the token, so mocking auth() is enough.
const session = vi.hoisted(() => ({ userId: null }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId }),
}));

const OWNER = 'user_seed_carlos'; // owns the approved seller
const OTHER_SELLER = 'user_seed_laura'; // owns the pending one
const signInAs = clerkId => {
  session.userId = clerkId;
};

let productsRoute;
let sellersRoute;
let sellerRoute;
let Seller;
let ids;

const getProducts = async (query = '') =>
  (await productsRoute.GET(new Request(`http://localhost/api/products?${query}`))).json();

const getSellers = async (query = '') =>
  (await sellersRoute.GET(new Request(`http://localhost/api/sellers?${query}`))).json();

const putSeller = (id, body) =>
  sellerRoute.PUT(
    new Request('http://localhost/api/sellers', {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
    { params: { id } }
  );

const businessNames = ({ sellers }) => sellers.map(seller => seller.businessName);

describe('T-71 · modo pausa del vendedor', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    productsRoute = await import('@/app/api/products/route.js');
    sellersRoute = await import('@/app/api/sellers/route.js');
    sellerRoute = await import('@/app/api/sellers/[id]/route.js');
    ({ Seller } = await import('@/utils/models/sellerSchema2'));
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
    session.userId = null;
  });

  it('un vendedor nuevo nace despausado', async () => {
    const seller = await Seller.findById(ids.approvedSeller).lean();

    expect(seller.paused).toBe(false);
  });

  it('pausar esconde al vendedor del listado publico', async () => {
    expect(businessNames(await getSellers())).toContain('Arepas El Parche');

    await Seller.findByIdAndUpdate(ids.approvedSeller, { paused: true });

    expect(businessNames(await getSellers())).not.toContain('Arepas El Parche');
  });

  // T-74: nothing covered this and a refactor broke it - sharing the product
  // listing's filter (which requires approved: true) with this endpoint empties
  // the admin's approval queue, because SellerGrid is where an admin approves
  // pending sellers. Pausing hides a seller here; being unapproved must not.
  it('un vendedor sin aprobar SI se devuelve: el admin los aprueba desde ese listado', async () => {
    expect(businessNames(await getSellers())).toContain('Postres Laura');
  });

  it('pausar esconde tambien sus productos del listado', async () => {
    const antes = await getProducts('section=antojos');
    expect(antes.products.length).toBeGreaterThan(0);

    await Seller.findByIdAndUpdate(ids.approvedSeller, { paused: true });

    const despues = await getProducts('section=antojos');
    expect(despues.products).toHaveLength(0);
  });

  it('pedir explicitamente los productos de un vendedor en pausa devuelve vacio', async () => {
    await Seller.findByIdAndUpdate(ids.approvedSeller, { paused: true });

    const body = await getProducts(`section=antojos&sellerId=${ids.approvedSeller}`);

    expect(body.products).toHaveLength(0);
    expect(body.nextCursor).toBeNull();
  });

  it('despausar lo devuelve al listado con su catalogo intacto', async () => {
    await Seller.findByIdAndUpdate(ids.approvedSeller, { paused: true });
    await Seller.findByIdAndUpdate(ids.approvedSeller, { paused: false });

    expect(businessNames(await getSellers())).toContain('Arepas El Parche');
    expect((await getProducts('section=antojos')).products.length).toBeGreaterThan(0);
  });

  it('pausar no toca la aprobacion', async () => {
    signInAs(OWNER);
    const response = await putSeller(ids.approvedSeller, { paused: true });

    expect(response.status).toBe(200);
    const seller = await Seller.findById(ids.approvedSeller).lean();
    expect(seller.paused).toBe(true);
    expect(seller.approved).toBe(true); // sigue aprobado, solo escondido
  });

  it('un vendedor no puede pausar la tienda de otro', async () => {
    signInAs(OTHER_SELLER);
    const response = await putSeller(ids.approvedSeller, { paused: true });

    expect(response.status).toBe(403);
    const seller = await Seller.findById(ids.approvedSeller).lean();
    expect(seller.paused).toBe(false);
  });

  it('sin sesion no se puede pausar', async () => {
    const response = await putSeller(ids.approvedSeller, { paused: true });

    expect(response.status).toBe(401);
  });

  // The regression this whole feature could have caused: none of the sellers
  // already in the database carry a `paused` field (54 of them, measured
  // read-only against the real one), and `paused: false` doesn't match a
  // missing field. A listing filtered that way would have returned nobody.
  it('un vendedor viejo, sin el campo paused, sigue apareciendo', async () => {
    await Seller.collection.updateOne(
      { _id: (await Seller.findById(ids.approvedSeller))._id },
      { $unset: { paused: '' } }
    );
    const raw = await Seller.collection.findOne({ businessName: 'Arepas El Parche' });
    expect('paused' in raw).toBe(false); // de verdad quedo sin el campo

    expect(businessNames(await getSellers())).toContain('Arepas El Parche');
    expect((await getProducts('section=antojos')).products.length).toBeGreaterThan(0);
  });

  it('paused y availability son campos distintos: pausar no cambia la disponibilidad', async () => {
    signInAs(OWNER);
    await putSeller(ids.approvedSeller, { paused: true });

    const seller = await Seller.findById(ids.approvedSeller).lean();
    expect(seller.availability).toBe(true); // el horario de hoy no se toca
    expect(seller.paused).toBe(true);
  });
});
