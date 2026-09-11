import { clerkClient } from '@clerk/nextjs/server';

/**
 * Whether a Clerk account carries the admin role.
 *
 * T-12 made Clerk's `publicMetadata` the only source of truth for "is admin";
 * Mongo's `User.role` stays about buyer/seller. T-104 found that only
 * `middleware.js` ever got that memo: three other places still read Mongo's
 * `role`, one of them the gate on the seller approve/reject mutation. This is
 * the single definition they now share.
 *
 * `clerkClient()` goes out to Clerk's Backend API: `publicMetadata` does not
 * travel in the session JWT unless the session token is customised in the
 * dashboard, an infrastructure change this repo avoids after the T-64
 * incident. So every call is a roundtrip - ask only where the answer changes
 * the outcome (an authorisation gate), never on a path that renders on every
 * request.
 *
 * It lives here rather than in `auth.ts` on purpose: it imports Clerk and
 * nothing else, so `middleware.js` can share it without pulling Mongoose and
 * `connectDB` into the edge bundle.
 */
export async function isClerkAdmin(userId: string): Promise<boolean> {
  const user = await clerkClient().users.getUser(userId);
  return user.publicMetadata?.role === 'admin';
}
