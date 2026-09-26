import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// T-133. Same Clerk stub as seller-approval.test.js: identity from the token's
// clerkId (T-12c), admin-ness from publicMetadata (T-104).
const session = vi.hoisted(() => ({ userId: null, publicMetadata: {} }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId }),
  clerkClient: () => ({
    users: {
      getUser: async id => {
        if (id !== session.userId) {
          throw new Error(`getUser called with ${id}, not the session's id.`);
        }
        return { publicMetadata: session.publicMetadata };
      },
    },
  }),
}));

const BUYER = 'user_seed_ana'; // no seller profile at all

const signInAs = (clerkId, { admin = false } = {}) => {
  session.userId = clerkId;
  session.publicMetadata = admin ? { role: 'admin' } : {};
};

// What /admin/sellers renders: SellerCard's five fields plus the page's own.
// Anything else in the response is data the panel never shows.
const ALLOWED_FIELDS = [
  '_id',
  'businessName',
  'slogan',
  'description',
  'logo',
  'availability',
  'approved',
  'university',
  'createdAt',
];

let listRoute;

describe('T-133 · GET /api/sellers/admin checks for itself', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    listRoute = await import('@/app/api/sellers/admin/route.js');
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await seedDatabase();
    signInAs(null);
  });

  // These two are the point of the task: until T-133 the handler answered
  // both with every seller, and only the middleware stood in the way.
  it('answers 401 with no session, and lists nobody', async () => {
    const res = await listRoute.GET();

    expect(res.status).toBe(401);
    expect((await res.json()).sellers).toBeUndefined();
  });

  it('answers 403 to a signed-in user who is not an admin', async () => {
    signInAs(BUYER);

    const res = await listRoute.GET();

    expect(res.status).toBe(403);
    expect((await res.json()).sellers).toBeUndefined();
  });

  describe('for an admin', () => {
    beforeEach(() => signInAs(BUYER, { admin: true }));

    it('lists every seller, the pending one included, newest first', async () => {
      const res = await listRoute.GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      const names = body.sellers.map(seller => seller.businessName);
      expect(names).toEqual(expect.arrayContaining(['Arepas El Parche', 'Postres Laura']));
      expect(body.total).toBe(body.sellers.length);
      const dates = body.sellers.map(seller => Date.parse(seller.createdAt));
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });

    // The seed gives both sellers a phoneNumber and a userId, so their absence
    // here is the select doing its job, not missing data.
    it('sends only the fields the panel renders - no phone, owner, or schedules', async () => {
      const { sellers } = await (await listRoute.GET()).json();

      for (const seller of sellers) {
        expect(Object.keys(seller).every(key => ALLOWED_FIELDS.includes(key))).toBe(true);
        expect(seller).not.toHaveProperty('phoneNumber');
        expect(seller).not.toHaveProperty('userId');
        expect(seller).not.toHaveProperty('instagramUser');
        expect(seller).not.toHaveProperty('schedules');
      }
      // And what the panel does need is still there.
      const pending = sellers.find(seller => seller.businessName === 'Postres Laura');
      expect(pending).toMatchObject({ approved: false });
      expect(pending).toHaveProperty('logo');
      expect(pending).toHaveProperty('createdAt');
    });
  });
});
