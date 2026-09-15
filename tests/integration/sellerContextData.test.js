import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// The same stubbed Clerk session as autorizacion.test.js: since T-12c
// identity is resolved from the clerkId the token already carries.
const session = vi.hoisted(() => ({ userId: null, throws: null }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => {
    if (session.throws) throw session.throws;
    return { userId: session.userId };
  },
}));

// T-77 reads the request headers to name the pathname it failed on. There is
// no request here, so they are stubbed: the real fallbacks are exercised by
// the cases below, not by next/headers itself.
const requestHeaders = vi.hoisted(() => ({ current: new Map() }));

vi.mock('next/headers', () => ({
  headers: () => ({ get: name => requestHeaders.current.get(name) ?? null }),
}));

const signInAs = clerkId => {
  session.userId = clerkId;
};
const signOut = () => {
  session.userId = null;
  session.throws = null;
  requestHeaders.current = new Map();
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

  // T-77. The root layout calls this on every request, so a throw from
  // auth() renders the whole layout through an error instead of a session.
  describe('when auth() throws (T-77)', () => {
    const clerkMiddlewareError = () =>
      new Error(
        "Clerk: auth() was called but Clerk can't detect usage of clerkMiddleware()" +
          ' (or the deprecated authMiddleware()). Please ensure the following:\n' +
          '-  clerkMiddleware() is used in your Next.js Middleware.'
      );

    it('degrades to the signed-out result instead of propagating', async () => {
      session.throws = clerkMiddlewareError();

      expect(await getSellerContextData()).toEqual({ user: false, seller: false });
    });

    it('degrades even when there was a session', async () => {
      signInAs(OWNER_CLERK_ID);
      session.throws = clerkMiddlewareError();

      expect(await getSellerContextData()).toEqual({ user: false, seller: false });
    });

    /**
     * The logger prints nothing under Vitest on purpose, so the level is
     * raised for the length of the call and the real output is read off
     * console.error (which is where logger.warn lands). Asserting on the
     * emitted line rather than on a spied logger.warn keeps the test honest
     * about what a CI log would actually show.
     */
    const captureWarnings = async () => {
      const previousLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'warn';
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await getSellerContextData();
        return spy.mock.calls;
      } finally {
        spy.mockRestore();
        if (previousLevel === undefined) delete process.env.LOG_LEVEL;
        else process.env.LOG_LEVEL = previousLevel;
      }
    };

    it('logs the pathname it happened on, taken from the request headers', async () => {
      session.throws = clerkMiddlewareError();
      requestHeaders.current = new Map([['x-matched-path', '/antojos/sellers/list']]);

      const calls = await captureWarnings();

      expect(calls).toHaveLength(1);
      const [line, context] = calls[0];
      expect(line).toContain('getSellerContextData: auth() threw');
      expect(context.path).toBe('/antojos/sellers/list');
      expect(context.pathSource).toBe('x-matched-path');
      expect(context.error).toContain("can't detect usage of clerkMiddleware()");
      // Nothing else is read off the request: it also carries Clerk's session
      // cookie, which must never reach a log (CLAUDE.md, rule 6).
      expect(Object.keys(context)).toEqual(['path', 'pathSource', 'error']);
    });

    it('prefers next-url, which is what a client-side navigation carries', async () => {
      session.throws = clerkMiddlewareError();
      requestHeaders.current = new Map([
        ['next-url', '/antojos'],
        ['referer', 'http://localhost:3100/marketplace'],
      ]);

      const [[, context]] = await captureWarnings();

      expect(context.path).toBe('/antojos');
      expect(context.pathSource).toBe('next-url');
    });

    it('says so rather than inventing a path when no header carries one', async () => {
      session.throws = clerkMiddlewareError();

      const [[, context]] = await captureWarnings();

      expect(context.path).toBe('unknown');
      expect(context.pathSource).toBe('none');
    });

    // Next signals "this route is dynamic", "redirect" and "not found" by
    // throwing. Swallowing DYNAMIC_SERVER_USAGE would let the root layout
    // prerender and bake a signed-out session into every static page - worse
    // than the bug this wrap is defending against.
    it('rethrows Next control-flow errors untouched', async () => {
      const dynamicUsage = Object.assign(
        new Error('Dynamic server usage: headers'),
        { digest: 'DYNAMIC_SERVER_USAGE' }
      );
      session.throws = dynamicUsage;

      await expect(getSellerContextData()).rejects.toBe(dynamicUsage);
    });
  });
});
