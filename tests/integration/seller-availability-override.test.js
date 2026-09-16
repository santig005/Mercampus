import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// Same Clerk stub as seller-pause.test.js: identity comes from the clerkId in
// the token, and verifySellerId asks Clerk for admin-ness only when the
// session isn't the seller's own owner.
const session = vi.hoisted(() => ({ userId: null }));

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

let sellerRoute;
let Seller;
let ids;

const putSeller = (id, body) =>
  sellerRoute.PUT(
    new Request('http://localhost/api/sellers', {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
    { params: { id } }
  );

// T-83. Mirrors seller-pause.test.js (T-71): the ownership checks are the
// same ones, exercised through the same route, just with the other field.
describe('T-83 · extraordinary availability override', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
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

  it('a newly seeded seller has no active override', async () => {
    const seller = await Seller.findById(ids.approvedSeller).lean();

    expect(seller.availabilityOverrideUntil).toBeNull();
  });

  it('the owner can set a bounded override', async () => {
    signInAs(OWNER);
    const until = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const response = await putSeller(ids.approvedSeller, {
      availabilityOverrideUntil: until,
    });

    expect(response.status).toBe(200);
    const seller = await Seller.findById(ids.approvedSeller).lean();
    expect(new Date(seller.availabilityOverrideUntil).toISOString()).toBe(until);
  });

  it('the owner can cancel an override early by sending null', async () => {
    signInAs(OWNER);
    await putSeller(ids.approvedSeller, {
      availabilityOverrideUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    const response = await putSeller(ids.approvedSeller, {
      availabilityOverrideUntil: null,
    });

    expect(response.status).toBe(200);
    const seller = await Seller.findById(ids.approvedSeller).lean();
    expect(seller.availabilityOverrideUntil).toBeNull();
  });

  // The bound itself: an override with no expiry is the exact bug the
  // ROADMAP entry calls out, so the API has to refuse it rather than accept
  // whatever the client sends.
  it('rejects a window further out than the cap, instead of a seller stuck open indefinitely', async () => {
    signInAs(OWNER);
    const tooFar = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const response = await putSeller(ids.approvedSeller, {
      availabilityOverrideUntil: tooFar,
    });

    expect(response.status).toBe(400);
    const seller = await Seller.findById(ids.approvedSeller).lean();
    expect(seller.availabilityOverrideUntil).toBeNull();
  });

  it('a seller cannot set an override on another seller\'s store', async () => {
    signInAs(OTHER_SELLER);
    const response = await putSeller(ids.approvedSeller, {
      availabilityOverrideUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    expect(response.status).toBe(403);
    const seller = await Seller.findById(ids.approvedSeller).lean();
    expect(seller.availabilityOverrideUntil).toBeNull();
  });

  it('without a session, setting an override answers 401', async () => {
    const response = await putSeller(ids.approvedSeller, {
      availabilityOverrideUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    expect(response.status).toBe(401);
  });

  // Rule 8, as a test: no seller in the real database can carry this field
  // yet - it did not exist before this PR, so every one of the 54 real
  // sellers is in exactly this state, not a hypothetical edge case.
  it('a seller document with no availabilityOverrideUntil field at all still saves other fields', async () => {
    // By business name, not `_id`: `ids.approvedSeller` is a plain string and
    // the raw driver (unlike Mongoose) does not cast it to an ObjectId, so a
    // `_id` filter here would silently match nothing - the same reason
    // seller-pause.test.js looks its seller up this way too.
    await Seller.collection.updateOne(
      { businessName: 'Arepas El Parche' },
      { $unset: { availabilityOverrideUntil: '' } }
    );
    const raw = await Seller.collection.findOne({ businessName: 'Arepas El Parche' });
    expect('availabilityOverrideUntil' in raw).toBe(false);

    signInAs(OWNER);
    const response = await putSeller(ids.approvedSeller, { slogan: 'Nuevo eslogan' });

    expect(response.status).toBe(200);
    const seller = await Seller.findById(ids.approvedSeller).lean();
    expect(seller.slogan).toBe('Nuevo eslogan');
  });
});
