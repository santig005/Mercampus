import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// T-170: GET /api/sellers/[id] is public and unauthenticated, and it used to
// accept an email in place of the id - looking the user up by it and
// returning their shop. Anyone could ask whether an email has a store on
// Mercampus and get the store back, and "User not found" vs "Seller not
// found" told them whether the email was registered at all.

// carlos.mesa owns the approved seller in the seed; ana.restrepo is a buyer.
const OWNER_EMAIL = 'carlos.mesa@example.test';
const BUYER_EMAIL = 'ana.restrepo@example.test';
const UNKNOWN_EMAIL = 'nadie@example.test';
const UNKNOWN_ID = '64b7f1c2a1b2c3d4e5f60718';

let route;
let ids;

describe('GET /api/sellers/[id] (T-170)', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    route = await import('@/app/api/sellers/[id]/route.js');
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
  });

  const get = id =>
    route.GET(new Request(`http://localhost/api/sellers/${encodeURIComponent(id)}`), {
      params: { id },
    });

  it('200 by id, with the schedules and day names', async () => {
    const response = await get(ids.approvedSeller);

    expect(response.status).toBe(200);
    const { seller } = await response.json();
    expect(seller.businessName).toBe('Arepas El Parche');
    expect(seller.schedules[0].day).toBe('Lunes');
  });

  it("an owner's email no longer returns their shop", async () => {
    const response = await get(OWNER_EMAIL);

    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).not.toContain('Arepas El Parche');
  });

  // The oracle: a registered email and an unknown one must be
  // indistinguishable, including a buyer's (registered, no shop).
  it('registered and unknown emails get the same answer', async () => {
    const answers = await Promise.all(
      [OWNER_EMAIL, BUYER_EMAIL, UNKNOWN_EMAIL].map(async email => {
        const response = await get(email);
        return { status: response.status, body: await response.json() };
      })
    );

    expect(answers[1]).toEqual(answers[0]);
    expect(answers[2]).toEqual(answers[0]);
  });

  it('400, not a 500 carrying a CastError, for a malformed id', async () => {
    const response = await get('not-an-id');

    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).not.toMatch(/CastError|Cast to ObjectId/);
  });

  it('404 for a well-formed id that matches nothing', async () => {
    expect((await get(UNKNOWN_ID)).status).toBe(404);
  });

  // Unchanged on purpose: the admin reviews pending sellers on this page.
  it('still returns a pending seller', async () => {
    expect((await get(ids.pendingSeller)).status).toBe(200);
  });
});
