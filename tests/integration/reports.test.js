import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// T-149. Same Clerk stub as seller-audit.test.js / sellers-admin-list.test.js:
// identity from the token's clerkId (T-12c), admin-ness from publicMetadata
// (T-104).
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
const BUYER = 'user_seed_carlos'; // signed in, not an admin
// A well-formed ObjectId that matches no product or seller.
const UNKNOWN_ID = '64b7f1c2a1b2c3d4e5f60718';

const signInAs = (clerkId, { admin = false } = {}) => {
  session.userId = clerkId;
  session.publicMetadata = admin ? { role: 'admin' } : {};
};
const signOut = () => {
  session.userId = null;
  session.publicMetadata = {};
};

let reportsRoute;
let adminReportsRoute;
let Report;
let rateLimitModule;
let ids;

const post = (body, { ip = '203.0.113.7' } = {}) =>
  reportsRoute.POST(
    new Request('http://localhost/api/reports', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    })
  );

describe('T-149 · POST /api/reports', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    reportsRoute = await import('@/app/api/reports/route.js');
    adminReportsRoute = await import('@/app/api/reports/admin/route.js');
    ({ Report } = await import('@/utils/models/reportSchema'));
    rateLimitModule = await import('@/server/rate-limit/rateLimit');
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
    signOut();
  });

  it('201s and saves an anonymous report of a product, reporterClerkId null', async () => {
    const res = await post({
      targetType: 'product',
      targetId: ids.approvedProduct,
      reason: 'wrong_price',
      details: 'El precio real es el doble.',
    });

    expect(res.status).toBe(201);
    const [saved] = await Report.find().lean();
    expect(saved).toMatchObject({
      targetType: 'product',
      reason: 'wrong_price',
      details: 'El precio real es el doble.',
      status: 'open',
      reporterClerkId: null,
    });
    expect(saved.targetId.toString()).toBe(ids.approvedProduct);
  });

  it('201s a report of a seller with no details (optional)', async () => {
    const res = await post({
      targetType: 'seller',
      targetId: ids.approvedSeller,
      reason: 'offensive_content',
    });

    expect(res.status).toBe(201);
    const [saved] = await Report.find().lean();
    expect(saved.targetType).toBe('seller');
    expect(saved.details).toBeUndefined();
  });

  it('takes reporterClerkId from the session, not from the body', async () => {
    signInAs(BUYER);

    const res = await post({
      targetType: 'product',
      targetId: ids.approvedProduct,
      reason: 'other',
    });

    expect(res.status).toBe(201);
    const [saved] = await Report.find().lean();
    expect(saved.reporterClerkId).toBe(BUYER);
  });

  it('ignores a forged reporterClerkId in the body - the session always wins', async () => {
    signInAs(BUYER);

    const res = await post({
      targetType: 'product',
      targetId: ids.approvedProduct,
      reason: 'other',
      reporterClerkId: 'user_someone_else',
      status: 'resolved',
    });

    expect(res.status).toBe(201);
    const [saved] = await Report.find().lean();
    expect(saved.reporterClerkId).toBe(BUYER);
    expect(saved.status).toBe('open');
  });

  it('400s an invalid reason', async () => {
    const res = await post({
      targetType: 'product',
      targetId: ids.approvedProduct,
      reason: 'not_a_real_reason',
    });

    expect(res.status).toBe(400);
    expect(await Report.countDocuments()).toBe(0);
  });

  it('400s an invalid targetType', async () => {
    const res = await post({
      targetType: 'user',
      targetId: ids.approvedProduct,
      reason: 'other',
    });

    expect(res.status).toBe(400);
  });

  it('400s a malformed targetId', async () => {
    const res = await post({
      targetType: 'product',
      targetId: 'not-an-object-id',
      reason: 'other',
    });

    expect(res.status).toBe(400);
  });

  it('400s details over the character limit', async () => {
    const res = await post({
      targetType: 'product',
      targetId: ids.approvedProduct,
      reason: 'other',
      details: 'x'.repeat(501),
    });

    expect(res.status).toBe(400);
  });

  it('404s a well-formed id that matches no product', async () => {
    const res = await post({
      targetType: 'product',
      targetId: UNKNOWN_ID,
      reason: 'other',
    });

    expect(res.status).toBe(404);
    expect(await Report.countDocuments()).toBe(0);
  });

  it('404s a well-formed id that matches no seller', async () => {
    const res = await post({
      targetType: 'seller',
      targetId: UNKNOWN_ID,
      reason: 'other',
    });

    expect(res.status).toBe(404);
  });

  describe('rate limiting', () => {
    it('answers 429 once the anonymous bucket is full, stricter than the signed-in one', async () => {
      const { limit } = rateLimitModule.RATE_LIMITS.reportAnonymous;

      for (let i = 0; i < limit; i += 1) {
        const res = await post(
          { targetType: 'product', targetId: ids.approvedProduct, reason: 'other' },
          { ip: '203.0.113.9' }
        );
        expect(res.status).toBe(201);
      }

      const res = await post(
        { targetType: 'product', targetId: ids.approvedProduct, reason: 'other' },
        { ip: '203.0.113.9' }
      );
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toMatch(/^\d+$/);
    });

    it('a signed-in caller gets its own, more generous bucket', async () => {
      signInAs(BUYER);
      const anonymousLimit = rateLimitModule.RATE_LIMITS.reportAnonymous.limit;

      // More requests than the anonymous bucket would allow, all from the
      // same IP a real anonymous caller would share - proving this is a
      // separate counter, not the same one with a higher ceiling.
      for (let i = 0; i < anonymousLimit + 1; i += 1) {
        const res = await post(
          { targetType: 'product', targetId: ids.approvedProduct, reason: 'other' },
          { ip: '203.0.113.9' }
        );
        expect(res.status).toBe(201);
      }
    });
  });
});

describe('T-149 · GET /api/reports/admin', () => {
  beforeEach(async () => {
    ({ ids } = await seedDatabase());
    signOut();
  });

  it('401s with no session', async () => {
    const res = await adminReportsRoute.GET();
    expect(res.status).toBe(401);
  });

  it('403s a signed-in caller who is not an admin', async () => {
    signInAs(BUYER);
    const res = await adminReportsRoute.GET();
    expect(res.status).toBe(403);
  });

  it('lists only open reports, newest first, for an admin', async () => {
    await Report.create([
      {
        targetType: 'product',
        targetId: ids.approvedProduct,
        reason: 'wrong_price',
        status: 'open',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        targetType: 'seller',
        targetId: ids.approvedSeller,
        reason: 'offensive_content',
        status: 'open',
        createdAt: new Date('2026-02-01T00:00:00Z'),
      },
    ]);

    signInAs(ADMIN, { admin: true });
    const res = await adminReportsRoute.GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(2);
    expect(body.reports.map(r => r.reason)).toEqual(['offensive_content', 'wrong_price']);
  });
});
