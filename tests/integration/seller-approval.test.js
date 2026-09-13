import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// T-105. Same Clerk stub as autorizacion.test.js: the identity comes from the
// clerkId in the token (T-12c), and admin-ness from publicMetadata (T-104), so
// both have to be controllable here.
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

// From the seed.
const OWNER = 'user_seed_carlos'; // owns the approved seller
const BUYER = 'user_seed_ana'; // no seller profile at all

const signInAs = (clerkId, { admin = false } = {}) => {
  session.userId = clerkId;
  session.publicMetadata = admin ? { role: 'admin' } : {};
};
const signOut = () => {
  session.userId = null;
  session.publicMetadata = {};
};

let approvalRoute;
let sellerRoute;
let Seller;
let ids;

const patchApproval = (id, body) =>
  approvalRoute.PATCH(
    new Request('http://localhost/api/sellers/admin/x', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
    { params: { id } }
  );

const approvedOf = async id => (await Seller.findById(id).lean()).approved;

describe('T-105 · aprobacion de vendedores', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    approvalRoute = await import('@/app/api/sellers/admin/[id]/route.js');
    sellerRoute = await import('@/app/api/sellers/[id]/route.js');
    ({ Seller } = await import('@/utils/models/sellerSchema2'));
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
    signOut();
  });

  // Every assertion reads Mongo after the call rather than trusting the
  // response body. That is the whole point of this suite: before T-105 the
  // endpoint answered 200 and wrote nothing, and a test that only checked the
  // status would have passed against the bug.
  describe('an admin can actually flip it', () => {
    it('approves a pending seller, and the document changes', async () => {
      signInAs(BUYER, { admin: true });
      expect(await approvedOf(ids.pendingSeller)).toBe(false);

      const response = await patchApproval(ids.pendingSeller, { approved: true });

      expect(response.status).toBe(200);
      expect(await approvedOf(ids.pendingSeller)).toBe(true);
    });

    it('un-approves an approved seller, and the document changes', async () => {
      signInAs(BUYER, { admin: true });

      const response = await patchApproval(ids.approvedSeller, { approved: false });

      expect(response.status).toBe(200);
      expect(await approvedOf(ids.approvedSeller)).toBe(false);
    });
  });

  describe('and nobody else can', () => {
    it('401 without a session, and the seller stays pending', async () => {
      const response = await patchApproval(ids.pendingSeller, { approved: true });

      expect(response.status).toBe(401);
      expect(await approvedOf(ids.pendingSeller)).toBe(false);
    });

    it('403 for a signed-in user who is not an admin', async () => {
      signInAs(BUYER);

      const response = await patchApproval(ids.pendingSeller, { approved: true });

      expect(response.status).toBe(403);
      expect(await approvedOf(ids.pendingSeller)).toBe(false);
    });

    // The one that matters most: owning the shop must not be enough. The
    // middleware would also stop this in a real request, but the handler has
    // to stand on its own - see the note in the route.
    it('403 for the seller themselves: owning a shop is not approving it', async () => {
      signInAs(OWNER);

      const response = await patchApproval(ids.approvedSeller, { approved: true });

      expect(response.status).toBe(403);
    });
  });

  describe('bad input', () => {
    it('400 when `approved` is missing', async () => {
      signInAs(BUYER, { admin: true });

      expect((await patchApproval(ids.pendingSeller, {})).status).toBe(400);
      expect(await approvedOf(ids.pendingSeller)).toBe(false);
    });

    it('400 when `approved` is not a boolean', async () => {
      signInAs(BUYER, { admin: true });

      const response = await patchApproval(ids.pendingSeller, { approved: 'si' });

      expect(response.status).toBe(400);
      expect(await approvedOf(ids.pendingSeller)).toBe(false);
    });

    // strict(): this endpoint flips visibility, so a body carrying anything
    // else is a mistake worth reporting rather than silently dropping.
    it('400 when the body carries anything else', async () => {
      signInAs(BUYER, { admin: true });

      const response = await patchApproval(ids.pendingSeller, {
        approved: true,
        businessName: 'Renombrado de contrabando',
      });

      expect(response.status).toBe(400);
      const seller = await Seller.findById(ids.pendingSeller).lean();
      expect(seller.approved).toBe(false);
      expect(seller.businessName).not.toBe('Renombrado de contrabando');
    });

    it('400 on a malformed id, not a 500 with the CastError', async () => {
      signInAs(BUYER, { admin: true });

      const response = await patchApproval('no-es-un-id', { approved: true });

      expect(response.status).toBe(400);
    });

    it('404 on a well-formed id that matches nothing', async () => {
      signInAs(BUYER, { admin: true });

      const response = await patchApproval('64b7f1c2a1b2c3d4e5f60718', {
        approved: true,
      });

      expect(response.status).toBe(404);
    });
  });

  // T-13 closed self-approval by leaving `approved` out of the seller's own
  // update schema. T-105 adds a writer for it, and this makes sure it added
  // exactly one: the self-service route must still ignore the field.
  it('the seller\'s own PUT still cannot approve them', async () => {
    signInAs(OWNER);
    const ownSeller = ids.approvedSeller;
    await Seller.findByIdAndUpdate(ownSeller, { approved: false });

    const response = await sellerRoute.PUT(
      new Request('http://localhost/api/sellers', {
        method: 'PUT',
        body: JSON.stringify({ approved: true, slogan: 'Recién hechas' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: ownSeller } }
    );

    expect(response.status).toBe(200); // the slogan is a legitimate edit
    const seller = await Seller.findById(ownSeller).lean();
    expect(seller.slogan).toBe('Recién hechas');
    expect(seller.approved).toBe(false); // but approving is not
  });
});
