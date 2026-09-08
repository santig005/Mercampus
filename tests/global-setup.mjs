import { clerkSetup } from '@clerk/testing/playwright';

// T-84: fetches Clerk's Testing Token once per run and puts it in the
// environment, where setupClerkTestingToken (which clerk.signIn calls for us)
// reads it. Without it, a programmatic sign-in trips the bot protection that a
// development instance applies to everything that is not a real browser
// session. Workers are forked after this runs, so they inherit it.
//
// It lives outside tests/e2e on purpose: anything in there is a candidate test
// file, and this is not a test.
export default async function globalSetup() {
  await clerkSetup({
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  });
}
