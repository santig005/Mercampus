import { Webhook } from 'svix';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { startTestDb, stopTestDb } from '../setup.js';

// T-154. Same Clerk stub as the other route tests: auth() returns whatever
// session the test sets.
const session = vi.hoisted(() => ({ userId: null }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId }),
}));

// The webhook reads its headers through next/headers (see webhook-clerk.test.js).
const webhookHeaders = vi.hoisted(() => ({ current: new Map() }));

vi.mock('next/headers', () => ({
  headers: () => ({ get: name => webhookHeaders.current.get(name) ?? null }),
}));

const WEBHOOK_SECRET = `whsec_${Buffer.from('mercampus-test-secret-32bytes!!').toString('base64')}`;

let pqrsRoute;
let imagesRoute;
let sellersRoute;
let sellerByIdRoute;
let productsRoute;
let productByIdRoute;
let schedulesRoute;
let webhookRoute;
let RateLimit;
let rateLimitModule;

const VALID_PQRS = { type: 'Sugerencia', description: 'Más opciones veganas', email: '' };

const pqrs = ({ ip, realIp } = {}) => {
  const headers = { 'content-type': 'application/json' };
  if (ip) headers['x-forwarded-for'] = ip;
  if (realIp) headers['x-real-ip'] = realIp;
  return new Request('http://localhost/api/pqrs', {
    method: 'POST',
    body: JSON.stringify(VALID_PQRS),
    headers,
  });
};

const sendPqrs = async (times, opts) => {
  const statuses = [];
  for (let i = 0; i < times; i += 1) {
    statuses.push((await pqrsRoute.POST(pqrs(opts))).status);
  }
  return statuses;
};

beforeAll(async () => {
  process.env.MONGO_URI = await startTestDb();
  process.env.WEBHOOK_SECRET = WEBHOOK_SECRET;

  pqrsRoute = await import('@/app/api/pqrs/route.js');
  imagesRoute = await import('@/app/api/images/route.js');
  sellersRoute = await import('@/app/api/sellers/route.js');
  sellerByIdRoute = await import('@/app/api/sellers/[id]/route.js');
  productsRoute = await import('@/app/api/products/route.js');
  productByIdRoute = await import('@/app/api/products/[id]/route.js');
  schedulesRoute = await import('@/app/api/schedules/route.js');
  webhookRoute = await import('@/app/api/webhooks/route.js');
  rateLimitModule = await import('@/server/rate-limit/rateLimit');
  ({ RateLimit } = await import('@/utils/models/rateLimitSchema'));
  await RateLimit.syncIndexes();
}, 120_000);

afterAll(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  session.userId = null;
  await RateLimit.deleteMany({});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('rate limiting · POST /api/pqrs', () => {
  it('lets N requests through and answers the N+1th with 429 and Retry-After', async () => {
    const { limit, windowMs } = rateLimitModule.RATE_LIMITS.pqrs;
    const statuses = await sendPqrs(limit, { ip: '203.0.113.7' });
    expect(statuses).toEqual(Array(limit).fill(201));

    const response = await pqrsRoute.POST(pqrs({ ip: '203.0.113.7' }));
    expect(response.status).toBe(429);

    const retryAfter = Number(response.headers.get('Retry-After'));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(windowMs / 1000);
    // Same body shape as the route's other errors (`{ message }`).
    expect(await response.json()).toEqual({ message: expect.any(String) });
  });

  it('a new window resets the count', async () => {
    const { limit, windowMs } = rateLimitModule.RATE_LIMITS.pqrs;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));

    await sendPqrs(limit, { ip: '203.0.113.7' });
    expect((await pqrsRoute.POST(pqrs({ ip: '203.0.113.7' }))).status).toBe(429);

    vi.setSystemTime(new Date(Date.now() + windowMs));
    expect((await pqrsRoute.POST(pqrs({ ip: '203.0.113.7' }))).status).toBe(201);
  });

  it('counts two IPs separately', async () => {
    const { limit } = rateLimitModule.RATE_LIMITS.pqrs;
    await sendPqrs(limit, { ip: '203.0.113.7' });

    expect((await pqrsRoute.POST(pqrs({ ip: '203.0.113.7' }))).status).toBe(429);
    expect((await pqrsRoute.POST(pqrs({ ip: '198.51.100.9' }))).status).toBe(201);
  });

  it('uses the first x-forwarded-for entry, then x-real-ip', async () => {
    const { limit } = rateLimitModule.RATE_LIMITS.pqrs;
    await sendPqrs(limit, { ip: '203.0.113.7, 10.0.0.1' });

    // Same client behind a different proxy hop: same bucket.
    expect((await pqrsRoute.POST(pqrs({ ip: '203.0.113.7, 10.0.0.2' }))).status).toBe(429);
    // No x-forwarded-for: x-real-ip identifies the client.
    expect((await pqrsRoute.POST(pqrs({ realIp: '203.0.113.7' }))).status).toBe(429);
    expect((await pqrsRoute.POST(pqrs({ realIp: '198.51.100.9' }))).status).toBe(201);
  });

  it('counts two signed-in users separately, even from the same IP', async () => {
    const { limit } = rateLimitModule.RATE_LIMITS.pqrs;
    session.userId = 'user_a';
    await sendPqrs(limit, { ip: '203.0.113.7' });
    expect((await pqrsRoute.POST(pqrs({ ip: '203.0.113.7' }))).status).toBe(429);

    session.userId = 'user_b';
    expect((await pqrsRoute.POST(pqrs({ ip: '203.0.113.7' }))).status).toBe(201);
  });

  it('never stores the raw IP', async () => {
    await pqrsRoute.POST(pqrs({ ip: '203.0.113.7' }));
    const [doc] = await RateLimit.find().lean();
    expect(doc.key).not.toContain('203.0.113.7');
    expect(doc.expiresAt).toBeInstanceOf(Date);
  });

  it('fails open: if the counter throws, the request goes through', async () => {
    vi.spyOn(RateLimit, 'findOneAndUpdate').mockImplementation(() => {
      throw new Error('connection refused');
    });

    const { limit } = rateLimitModule.RATE_LIMITS.pqrs;
    const statuses = await sendPqrs(limit + 2, { ip: '203.0.113.7' });
    expect(statuses).toEqual(Array(limit + 2).fill(201));
  });

  it('retries once on the duplicate-key race of two concurrent first upserts', async () => {
    const original = RateLimit.findOneAndUpdate.bind(RateLimit);
    let calls = 0;
    vi.spyOn(RateLimit, 'findOneAndUpdate').mockImplementation((...args) => {
      calls += 1;
      if (calls === 1) {
        throw Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
      }
      return original(...args);
    });

    expect((await pqrsRoute.POST(pqrs({ ip: '203.0.113.7' }))).status).toBe(201);
    expect(calls).toBe(2);
    const [doc] = await RateLimit.find().lean();
    expect(doc.count).toBe(1);
  });

  it('concurrent requests are all counted', async () => {
    const { limit } = rateLimitModule.RATE_LIMITS.pqrs;
    const responses = await Promise.all(
      Array.from({ length: limit + 3 }, () => pqrsRoute.POST(pqrs({ ip: '203.0.113.7' })))
    );
    const statuses = responses.map(r => r.status);
    expect(statuses.filter(s => s === 201)).toHaveLength(limit);
    expect(statuses.filter(s => s === 429)).toHaveLength(3);
  });
});

describe('rate limiting · every limited handler is wired', () => {
  // Fills the bucket to its limit directly, so the next call must be the 429
  // without exercising each handler's business logic N times.
  const exhaust = async (scope, req) => {
    const { limit, windowMs } = rateLimitModule.RATE_LIMITS[scope];
    const identity = await rateLimitModule.rateLimitIdentity(req);
    const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
    await RateLimit.create({
      key: `${scope}:${identity}:${windowStart}`,
      count: limit,
      expiresAt: new Date(windowStart + windowMs),
    });
  };

  const request = method =>
    new Request('http://localhost/api', {
      method,
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
    });

  const PRODUCT_ID = '64b7f0c2a1b2c3d4e5f60718';
  const cases = [
    ['POST /api/images', 'images', () => imagesRoute.POST(request('POST'))],
    ['DELETE /api/images', 'images', () => imagesRoute.DELETE(request('DELETE'))],
    ['POST /api/sellers', 'sellerRegistration', () => sellersRoute.POST(request('POST'))],
    [
      'PUT /api/sellers/[id]',
      'sellerUpdate',
      () => sellerByIdRoute.PUT(request('PUT'), { params: { id: PRODUCT_ID } }),
    ],
    ['POST /api/products', 'productWrite', () => productsRoute.POST(request('POST'))],
    [
      'PUT /api/products/[id]',
      'productWrite',
      () => productByIdRoute.PUT(request('PUT'), { params: { id: PRODUCT_ID } }),
    ],
    [
      'DELETE /api/products/[id]',
      'productWrite',
      () => productByIdRoute.DELETE(request('DELETE'), { params: { id: PRODUCT_ID } }),
    ],
    ['POST /api/schedules', 'scheduleWrite', () => schedulesRoute.POST(request('POST'))],
  ];

  it.each(cases)('%s answers 429 once its bucket is full', async (_name, scope, call) => {
    session.userId = 'user_wired';
    await exhaust(scope, request('POST'));

    const response = await call();
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toMatch(/^\d+$/);
  });
});

describe('rate limiting · POST /api/webhooks is not limited', () => {
  const clerkEvent = n => {
    const body = JSON.stringify({
      type: 'user.created',
      data: {
        id: `user_hook_${n}`,
        first_name: 'Ana',
        last_name: 'Restrepo',
        email_addresses: [{ email_address: `ana${n}@test.co` }],
        image_url: 'https://img.test/ana.png',
      },
    });
    const id = `msg_${n}`;
    const timestamp = new Date();
    webhookHeaders.current = new Map([
      ['svix-id', id],
      ['svix-timestamp', String(Math.floor(timestamp.getTime() / 1000))],
      ['svix-signature', new Webhook(WEBHOOK_SECRET).sign(id, timestamp, body)],
    ]);
    return new Request('http://localhost/api/webhooks', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '54.0.0.1' },
    });
  };

  it('a burst from one IP, larger than any limit, all goes through and counts nothing', async () => {
    const burst = Math.max(
      ...Object.values(rateLimitModule.RATE_LIMITS).map(({ limit }) => limit)
    ) + 1;

    for (let n = 0; n < burst; n += 1) {
      expect((await webhookRoute.POST(clerkEvent(n))).status).toBe(200);
    }
    expect(await RateLimit.countDocuments()).toBe(0);
  });
});
