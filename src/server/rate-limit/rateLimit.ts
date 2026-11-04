import { createHash } from 'node:crypto';

import { tooManyRequests } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { connectDB } from '@/utils/connectDB';
import { getClerkUserId } from '@/utils/lib/auth';
import { RateLimit } from '@/utils/models/rateLimitSchema';

/**
 * T-154: fixed-window rate limiting, backed by the existing MongoDB.
 *
 * Why Mongo and not memory or Redis: an in-memory counter does not survive
 * Vercel's serverless functions (every instance has its own, and they come
 * and go - the trap the old `sellers/admin` `Map` fell into, T-12); Upstash or
 * Redis would add a dependency and an account to manage; Mongo is already a
 * hard dependency of every route limited here.
 *
 * Why here (src/server/) and not src/lib/: it queries Mongo, and CLAUDE.md
 * keeps data access in src/server/. And not in src/middleware.js: that runs
 * on the Edge runtime, where Mongoose does not work.
 */

const MINUTE = 60 * 1000;

/**
 * Every limit in one place. Counted per identity (Clerk user id with a
 * session, client IP without one), per scope, per fixed window. Every request
 * to a limited handler counts, including ones later rejected as 400/401/403:
 * a flood of invalid requests still costs a DB roundtrip each.
 */
export const RATE_LIMITS = {
  // Public form, writes one document per call, no session required.
  pqrs: { limit: 5, windowMs: 10 * MINUTE },
  // Upload and delete share one bucket: both cost ImageKit calls.
  images: { limit: 30, windowMs: 10 * MINUTE },
  // Seller registration: legitimately happens once per account.
  sellerRegistration: { limit: 5, windowMs: 60 * MINUTE },
  // Seller profile edits (PUT /api/sellers/[id]).
  sellerUpdate: { limit: 30, windowMs: 10 * MINUTE },
  // Product create, edit and delete share one bucket.
  productWrite: { limit: 60, windowMs: 10 * MINUTE },
  // Replacing a seller's whole schedule (POST /api/schedules).
  scheduleWrite: { limit: 30, windowMs: 10 * MINUTE },
} as const;

export type RateLimitScope = keyof typeof RATE_LIMITS;

/** sha256, so a raw IP never sits in the database or in a key. */
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex').slice(0, 32);

/**
 * Who is calling. The session's Clerk id when there is one; otherwise the
 * client IP - the first entry of `x-forwarded-for`, then `x-real-ip` (both set
 * by Vercel) - and otherwise one shared `unknown` bucket.
 */
export async function rateLimitIdentity(req: Request): Promise<string> {
  try {
    return `user:${await getClerkUserId()}`;
  } catch {
    // No session (401), or auth() unavailable: fall back to the IP.
  }

  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || req.headers.get('x-real-ip')?.trim();

  return ip ? `ip:${hash(ip)}` : 'unknown';
}

const isDuplicateKey = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 11000;

async function increment(key: string, expiresAt: Date): Promise<number> {
  const bump = () =>
    RateLimit.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, new: true }
    ).lean();

  let doc;
  try {
    doc = await bump();
  } catch (error) {
    // Two concurrent first requests of a window both try to insert; the
    // unique index lets one win and the other gets E11000. By then the
    // document exists, so the retry is a plain $inc.
    if (!isDuplicateKey(error)) throw error;
    doc = await bump();
  }

  return doc?.count ?? 0;
}

/**
 * Counts this request against `scope` and returns a 429 response if it is
 * over the limit, or `null` to let it through. Call it at the top of the
 * handler and return its response when it gives one.
 */
export async function enforceRateLimit(
  req: Request,
  scope: RateLimitScope,
  { bodyKey = 'error' }: { bodyKey?: 'error' | 'message' } = {}
) {
  const now = Date.now();
  const { limit, windowMs } = RATE_LIMITS[scope];
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowEnd = windowStart + windowMs;

  try {
    const identity = await rateLimitIdentity(req);
    await connectDB();
    const count = await increment(
      `${scope}:${identity}:${windowStart}`,
      new Date(windowEnd)
    );

    if (count > limit) {
      return tooManyRequests((windowEnd - now) / 1000, { bodyKey });
    }

    return null;
  } catch (error) {
    // Fail OPEN: the counter lives in the same Mongo the route needs, so when
    // the store is unreachable the route can't work anyway; failing closed
    // would only turn a DB blip into a 429. No identity in the log.
    logger.warn('rate limit check failed, letting the request through', {
      scope,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
