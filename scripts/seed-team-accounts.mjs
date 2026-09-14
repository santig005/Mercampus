/**
 * Creates the Mongo `User` a team member needs to use the development
 * database (T-63).
 *
 * Why it is needed: since T-63, Preview, Development and the local `.env` use
 * their own database (`mercampus_dev`), but Clerk is still one development
 * instance everywhere (T-64). A `User` is born from Clerk's `user.created`
 * webhook, and that webhook only reaches Production - `WEBHOOK_SECRET` exists
 * nowhere else, and Clerk sends each event to a single endpoint. So signing in
 * on a preview or on `npm run dev` finds no `User`, and `src/utils/lib/auth.ts`
 * treats the session as nobody: no seller registration, no seller panel.
 *
 * Only the accounts named with --email are copied. The development instance
 * also holds real students' accounts, and their names and emails have no
 * business in a less protected database.
 *
 * Admin needs nothing here: it lives in Clerk's publicMetadata (T-104), and the
 * instance is the same in every environment.
 *
 * Dry run by default. It writes through `createOrUpdateUser`, the webhook's own
 * upsert, so a `User` made here is the one the webhook would have made, and an
 * existing one keeps its `role` and `sellerId`.
 *
 *   npm run seed:team -- --email ana@example.com --email luis@example.com
 *   npm run seed:team -- --email ana@example.com --apply
 */
import mongoose from 'mongoose';

import { connectDB } from '@/utils/connectDB';
import { createOrUpdateUser } from '@/utils/lib/createUser';
import { User } from '@/utils/models/userSchema';

export const CREATE = 'create';
export const EXISTS = 'exists';
export const NOT_IN_CLERK = 'not-in-clerk';

// Production's database name (T-63). A guard by name, not by host: it is the
// one thing a production URI always carries, whichever user or cluster alias
// it was copied with.
export const PRODUCTION_DATABASE = 'mercampus_products';

const CLERK_API = 'https://api.clerk.com/v1';

// Not `new URL()`: a replica-set URI lists several `host:port` pairs, which
// WHATWG URL rejects. Mongo's default database is `test`.
export function databaseName(uri) {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/.exec(uri);
  return match?.[1] || 'test';
}

export function assertNotProductionDatabase(uri) {
  const name = databaseName(uri);
  if (name === PRODUCTION_DATABASE) {
    throw new Error(
      `MONGO_URI points at "${name}", the production database.\n` +
        'This script is for the development database only (T-63).'
    );
  }
  return name;
}

const hasEmail = (clerkUser, email) =>
  clerkUser.email_addresses?.some(
    address => address.email_address?.toLowerCase() === email
  );

/**
 * `clerkUsers` are user objects as Clerk's Backend API returns them. Returns
 * one entry per requested email, in order.
 */
export async function syncTeamAccounts({ emails, clerkUsers, apply = false }) {
  const results = [];

  for (const email of emails.map(e => e.toLowerCase())) {
    const clerkUser = clerkUsers.find(user => hasEmail(user, email));
    if (!clerkUser) {
      results.push({ email, status: NOT_IN_CLERK });
      continue;
    }

    const existing = await User.exists({ clerkId: clerkUser.id });
    if (apply) {
      await createOrUpdateUser(
        clerkUser.id,
        clerkUser.first_name,
        clerkUser.last_name,
        clerkUser.email_addresses,
        clerkUser.image_url
      );
    }

    results.push({
      email,
      clerkId: clerkUser.id,
      status: existing ? EXISTS : CREATE,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// CLI

async function clerkGet(secretKey, path) {
  const response = await fetch(`${CLERK_API}${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.errors?.[0]?.long_message ?? body?.errors?.[0]?.message;
    throw new Error(`Clerk GET ${path} -> ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  return body;
}

function readAll(flag) {
  const values = [];
  process.argv.forEach((arg, i) => {
    if (arg === flag && process.argv[i + 1]) values.push(process.argv[i + 1]);
  });
  return values;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const emails = readAll('--email');
  const { MONGO_URI, CLERK_SECRET_KEY } = process.env;

  if (!emails.length) {
    throw new Error('Usage: seed-team-accounts.mjs --email <email> [--email <email>...] [--apply]');
  }
  if (!MONGO_URI) throw new Error('MONGO_URI is missing.');
  if (!CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY is missing.');

  const database = assertNotProductionDatabase(MONGO_URI);

  // Same question every script touching Clerk asks first (T-12h).
  const instance = await clerkGet(CLERK_SECRET_KEY, '/instance');
  if (instance.environment_type !== 'development') {
    throw new Error(
      `The Clerk instance is "${instance.environment_type}" (${instance.id}).\n` +
        'The app runs on the development instance everywhere (T-64); a clerkId\n' +
        'from another instance would sign in as nobody.'
    );
  }

  const query = emails
    .map(email => `email_address=${encodeURIComponent(email.toLowerCase())}`)
    .join('&');
  const clerkUsers = await clerkGet(CLERK_SECRET_KEY, `/users?${query}&limit=100`);

  console.log(`Clerk instance: ${instance.id} (development)`);
  console.log(`Database: ${database}\n`);

  await connectDB();
  try {
    const results = await syncTeamAccounts({ emails, clerkUsers, apply });

    for (const result of results) {
      if (result.status === NOT_IN_CLERK) {
        console.error(`MISSING  ${result.email}: no account with this email in the Clerk instance.`);
        process.exitCode = 1;
      } else if (result.status === CREATE) {
        console.log(`${apply ? 'CREATED ' : 'CREATE  '} ${result.email} (${result.clerkId})`);
      } else {
        console.log(`${apply ? 'UPDATED ' : 'EXISTS  '} ${result.email} (${result.clerkId})`);
      }
    }

    if (!apply && results.some(result => result.status !== NOT_IN_CLERK)) {
      console.log('\nDry run: nothing was written. Run it again with --apply.');
    }
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1]?.includes('seed-team-accounts')) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
