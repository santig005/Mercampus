import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// Same Clerk stub as autorizacion.test.js: since T-12c the identity comes from
// the clerkId in the token, so mocking auth() is enough.
const session = vi.hoisted(() => ({ userId: null }));

// T-104: clerkClient is stubbed because verifySellerId now asks Clerk for
// admin-ness whenever the session is not the seller's owner - which is
// exactly the path 'un vendedor no puede pausar la tienda de otro' takes.
// No publicMetadata here: none of these sessions is an admin.
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId }),
  clerkClient: () => ({
    users: { getUser: async () => ({ publicMetadata: {} }) },
  }),
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

  // T-74 wrote this test the other way round, and on purpose: it asserted that
  // an unapproved seller IS returned here, because sharing the product
  // listing's filter with this endpoint would have emptied the admin's
  // approval queue - SellerGrid was where an admin approved pending sellers,
  // and it read this endpoint.
  //
  // T-106 removed that reason. The approval UI lives only at /admin/sellers
  // now, which reads GET /api/sellers/admin, so nothing needs the pending
  // sellers from the public endpoint any more. What T-74's test was pinning
  // was a real dependency at the time; with that dependency gone, what is left
  // is a public, unauthenticated endpoint shipping the pending queue to every
  // visitor so that one privileged page could filter it back in client-side.
  // The assertion is inverted rather than deleted, so the file still records
  // that this behaviour existed and why it stopped.
  it('un vendedor sin aprobar NO se devuelve en el listado publico', async () => {
    expect(businessNames(await getSellers())).not.toContain('Postres Laura');
  });

  // The other half of the same change: the pending seller did not vanish, they
  // moved. T-106 is only defensible if the admin surface still sees them.
  it('el vendedor sin aprobar sigue estando para el admin, en /api/sellers/admin', async () => {
    const adminRoute = await import('@/app/api/sellers/admin/route.js');
    const { sellers } = await (await adminRoute.GET()).json();

    expect(sellers.map(seller => seller.businessName)).toContain('Postres Laura');
  });

  // Rule 8, as a test rather than a promise: every seller in the real base
  // carries an explicit boolean `approved` (measured read-only 2026-09-13: 55
  // documents, 37 true, 18 false, 0 missing), so an equality filter drops
  // nobody. This locks that in for the case the measurement cannot cover - a
  // document written before the field existed. `approved` has a schema
  // default, so this has to unset it underneath Mongoose.
  it('un vendedor sin el campo approved queda fuera, no dentro', async () => {
    await Seller.collection.updateOne(
      { businessName: 'Arepas El Parche' },
      { $unset: { approved: '' } }
    );
    const raw = await Seller.collection.findOne({ businessName: 'Arepas El Parche' });
    expect('approved' in raw).toBe(false); // the field really is gone

    // Deliberately the strict reading: no approval on record is not approval.
    // The opposite trade-off from `paused`, and for the opposite reason - a
    // missing `paused` means nobody ever paused the store, while a missing
    // `approved` means nobody ever approved it.
    expect(businessNames(await getSellers())).not.toContain('Arepas El Parche');
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
    expect(seller.approved).toBe(true); // still approved, just hidden
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
    expect('paused' in raw).toBe(false); // the field really is gone

    expect(businessNames(await getSellers())).toContain('Arepas El Parche');
    expect((await getProducts('section=antojos')).products.length).toBeGreaterThan(0);
  });

  it('paused y availability son campos distintos: pausar no cambia la disponibilidad', async () => {
    signInAs(OWNER);
    await putSeller(ids.approvedSeller, { paused: true });

    const seller = await Seller.findById(ids.approvedSeller).lean();
    expect(seller.availability).toBe(true); // today's schedule is untouched
    expect(seller.paused).toBe(true);
  });
});
