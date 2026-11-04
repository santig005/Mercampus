import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// T-155. Same Clerk stub as seller-approval.test.js: identity from the token's
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

const ADMIN = 'user_seed_ana'; // made admin through publicMetadata below
const OWNER = 'user_seed_carlos'; // owns the approved seller

const signInAs = (clerkId, { admin = false } = {}) => {
  session.userId = clerkId;
  session.publicMetadata = admin ? { role: 'admin' } : {};
};
const signOut = () => {
  session.userId = null;
  session.publicMetadata = {};
};

let approvalRoute;
let historyRoute;
let Seller;
let SellerAudit;
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

const getHistory = id =>
  historyRoute.GET(new Request('http://localhost/api/sellers/admin/x/history'), {
    params: { id },
  });

const approvedOf = async id => (await Seller.findById(id).lean()).approved;
const recordsFor = id => SellerAudit.find({ sellerId: id }).lean();

describe('T-155 · seller approval audit trail', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    approvalRoute = await import('@/app/api/sellers/admin/[id]/route.js');
    historyRoute = await import('@/app/api/sellers/admin/[id]/history/route.js');
    ({ Seller } = await import('@/utils/models/sellerSchema'));
    ({ SellerAudit } = await import('@/utils/models/sellerAuditSchema'));
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
    // The native driver, not the model: the model refuses deleteMany, which
    // is the point of this suite.
    await mongoose.connection.collection(SellerAudit.collection.name).deleteMany({});
    signOut();
    vi.restoreAllMocks();
  });

  describe('a successful change is recorded', () => {
    it('approve writes exactly one record, with the actor from the session', async () => {
      signInAs(ADMIN, { admin: true });

      const response = await patchApproval(ids.pendingSeller, { approved: true });

      expect(response.status).toBe(200);
      const records = await SellerAudit.find().lean();
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        actorClerkId: ADMIN,
        action: 'approve',
        previousState: { approved: false },
        newState: { approved: true },
      });
      expect(String(records[0].sellerId)).toBe(String(ids.pendingSeller));
      expect(records[0].reason).toBeUndefined();
      expect(records[0].createdAt).toBeInstanceOf(Date);
    });

    it('an optional reason on approval is kept, trimmed', async () => {
      signInAs(ADMIN, { admin: true });

      await patchApproval(ids.pendingSeller, { approved: true, reason: '  Menú verificado  ' });

      const [record] = await recordsFor(ids.pendingSeller);
      expect(record.reason).toBe('Menú verificado');
    });

    it('reject with a reason changes the seller and records the reason', async () => {
      signInAs(ADMIN, { admin: true });

      const response = await patchApproval(ids.approvedSeller, {
        approved: false,
        reason: 'Fotos que no son del producto',
      });

      expect(response.status).toBe(200);
      expect(await approvedOf(ids.approvedSeller)).toBe(false);
      const records = await recordsFor(ids.approvedSeller);
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        actorClerkId: ADMIN,
        action: 'reject',
        previousState: { approved: true },
        newState: { approved: false },
        reason: 'Fotos que no son del producto',
      });
    });
  });

  describe('rejecting requires a reason', () => {
    it.each([
      ['missing', { approved: false }],
      ['empty', { approved: false, reason: '' }],
      ['blank', { approved: false, reason: '    ' }],
      ['too long', { approved: false, reason: 'x'.repeat(501) }],
      ['not a string', { approved: false, reason: 42 }],
    ])('400 when the reason is %s, and nothing changes or is recorded', async (_label, body) => {
      signInAs(ADMIN, { admin: true });

      const response = await patchApproval(ids.approvedSeller, body);

      expect(response.status).toBe(400);
      expect(await approvedOf(ids.approvedSeller)).toBe(true);
      expect(await SellerAudit.countDocuments()).toBe(0);
    });
  });

  describe('nobody else can, and no record is written', () => {
    it('401 without a session', async () => {
      const response = await patchApproval(ids.pendingSeller, { approved: true });

      expect(response.status).toBe(401);
      expect(await SellerAudit.countDocuments()).toBe(0);
    });

    it('403 for a signed-in non-admin, the seller owner included', async () => {
      signInAs(OWNER);

      const response = await patchApproval(ids.approvedSeller, {
        approved: false,
        reason: 'Me rechazo a mí mismo',
      });

      expect(response.status).toBe(403);
      expect(await approvedOf(ids.approvedSeller)).toBe(true);
      expect(await SellerAudit.countDocuments()).toBe(0);
    });

    it('404 on an unknown seller records nothing', async () => {
      signInAs(ADMIN, { admin: true });

      const response = await patchApproval('64b7f1c2a1b2c3d4e5f60718', { approved: true });

      expect(response.status).toBe(404);
      expect(await SellerAudit.countDocuments()).toBe(0);
    });
  });

  it('a forged actor in the body is never recorded', async () => {
    signInAs(ADMIN, { admin: true });

    const response = await patchApproval(ids.pendingSeller, {
      approved: true,
      actorClerkId: 'user_somebody_else',
    });

    // strict(): the body is refused outright, so the forged id can't reach
    // the log through any path.
    expect(response.status).toBe(400);
    expect(await approvedOf(ids.pendingSeller)).toBe(false);
    expect(await SellerAudit.countDocuments({ actorClerkId: 'user_somebody_else' })).toBe(0);
    expect(await SellerAudit.countDocuments()).toBe(0);
  });

  it('a failed audit write does not undo or fail the change', async () => {
    signInAs(ADMIN, { admin: true });
    vi.spyOn(SellerAudit, 'create').mockRejectedValueOnce(new Error('boom'));

    const response = await patchApproval(ids.pendingSeller, { approved: true });

    expect(response.status).toBe(200);
    expect(await approvedOf(ids.pendingSeller)).toBe(true);
  });

  describe('records are immutable', () => {
    let record;

    beforeEach(async () => {
      signInAs(ADMIN, { admin: true });
      await patchApproval(ids.approvedSeller, { approved: false, reason: 'Motivo original' });
      record = await SellerAudit.findOne();
    });

    const unchanged = async () => {
      const [stored] = await SellerAudit.find().lean();
      expect(await SellerAudit.countDocuments()).toBe(1);
      expect(stored.reason).toBe('Motivo original');
      expect(stored.actorClerkId).toBe(ADMIN);
    };

    it.each([
      ['updateOne', () => SellerAudit.updateOne({}, { reason: 'reescrito' })],
      ['updateMany', () => SellerAudit.updateMany({}, { reason: 'reescrito' })],
      ['findOneAndUpdate', () => SellerAudit.findOneAndUpdate({}, { reason: 'reescrito' })],
      ['findByIdAndUpdate', () => SellerAudit.findByIdAndUpdate(record._id, { reason: 'x' })],
      ['replaceOne', () => SellerAudit.replaceOne({}, { actorClerkId: 'x' })],
      ['findOneAndReplace', () => SellerAudit.findOneAndReplace({}, { actorClerkId: 'x' })],
      ['deleteOne', () => SellerAudit.deleteOne({})],
      ['deleteMany', () => SellerAudit.deleteMany({})],
      ['findOneAndDelete', () => SellerAudit.findOneAndDelete({})],
      ['findByIdAndDelete', () => SellerAudit.findByIdAndDelete(record._id)],
      ['doc.deleteOne()', () => record.deleteOne()],
      ['doc.updateOne()', () => record.updateOne({ reason: 'reescrito' })],
      [
        'doc.save() after a change',
        () => {
          record.reason = 'reescrito';
          return record.save();
        },
      ],
      [
        'bulkWrite with an update',
        () =>
          SellerAudit.bulkWrite([
            { updateOne: { filter: {}, update: { reason: 'reescrito' } } },
          ]),
      ],
      ['bulkWrite with a delete', () => SellerAudit.bulkWrite([{ deleteMany: { filter: {} } }])],
    ])('%s throws and leaves the record as it was', async (_label, attempt) => {
      await expect(attempt()).rejects.toThrow(/append-only/);
      await unchanged();
    });
  });

  describe('GET /api/sellers/admin/[id]/history', () => {
    it('returns the seller\'s records newest first', async () => {
      signInAs(ADMIN, { admin: true });
      await patchApproval(ids.pendingSeller, { approved: true });
      await patchApproval(ids.pendingSeller, { approved: false, reason: 'Cerró el negocio' });

      const response = await getHistory(ids.pendingSeller);

      expect(response.status).toBe(200);
      const { history } = await response.json();
      expect(history.map(r => r.action)).toEqual(['reject', 'approve']);
      expect(history[0]).toMatchObject({ actorClerkId: ADMIN, reason: 'Cerró el negocio' });
    });

    it('a seller from before T-155 has an empty history, not a 404', async () => {
      signInAs(ADMIN, { admin: true });

      const response = await getHistory(ids.approvedSeller);

      expect(response.status).toBe(200);
      expect((await response.json()).history).toEqual([]);
    });

    it('401 without a session and 403 for a non-admin', async () => {
      expect((await getHistory(ids.approvedSeller)).status).toBe(401);
      signInAs(OWNER);
      expect((await getHistory(ids.approvedSeller)).status).toBe(403);
    });

    it('400 on a malformed id', async () => {
      signInAs(ADMIN, { admin: true });
      expect((await getHistory('no-es-un-id')).status).toBe(400);
    });
  });
});
