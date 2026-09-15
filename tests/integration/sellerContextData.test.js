import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// The same stubbed Clerk session as autorizacion.test.js: since T-12c
// identity is resolved from the clerkId the token already carries.
const session = vi.hoisted(() => ({ userId: null }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId }),
}));

const signInAs = clerkId => {
  session.userId = clerkId;
};
const signOut = () => {
  session.userId = null;
};

// From the seed.
const OWNER_CLERK_ID = 'user_seed_carlos'; // owner of the approved seller
const BUYER_CLERK_ID = 'user_seed_ana'; // a user with no seller profile

let getSellerContextData;

describe('getSellerContextData', () => {
  beforeAll(async () => {
    // connectDB reads MONGO_URI when imported, so it has to be set before
    // loading the module (same order as autorizacion.test.js).
    process.env.MONGO_URI = await startTestDb();
    ({ getSellerContextData } = await import('@/utils/lib/auth'));
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await seedDatabase();
    signOut();
  });

  it('with no session: user and seller are false', async () => {
    expect(await getSellerContextData()).toEqual({
      user: false,
      seller: false,
    });
  });

  it('a Clerk session with no User in Mongo: user and seller are false', async () => {
    // Lost webhook (T-12b): there is a clerkId in the session but no User
    // carries it. It must be treated like "no session", not throw.
    signInAs('user_sin_webhook');
    expect(await getSellerContextData()).toEqual({
      user: false,
      seller: false,
    });
  });

  it('a user with no seller profile: seller is "None"', async () => {
    signInAs(BUYER_CLERK_ID);
    const { user, seller } = await getSellerContextData();

    expect(seller).toBe('None');
    expect(user.email).toBe('ana.restrepo@example.test');
    expect(user.sellerId).toBeUndefined();
  });

  it('a user with a seller: seller brings the populated document', async () => {
    signInAs(OWNER_CLERK_ID);
    const { user, seller } = await getSellerContextData();

    expect(seller).toMatchObject({ businessName: expect.any(String), approved: true });
    expect(user.sellerId).toBeUndefined();
  });

  it('the result is plain JSON, not Mongoose documents', async () => {
    signInAs(OWNER_CLERK_ID);
    const { user, seller } = await getSellerContextData();

    // Cruza la frontera Server -> Client Component: un ObjectId de Mongoose
    // no es un objeto plano y React lo rechaza como prop.
    expect(() => JSON.stringify({ user, seller })).not.toThrow();
    expect(typeof user._id).toBe('string');
    expect(typeof seller._id).toBe('string');
  });
});
