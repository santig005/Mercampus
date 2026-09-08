import { clerk } from '@clerk/testing/playwright';
import { expect, test as setup } from '@playwright/test';

import { AUTH_STATE_PATH } from './auth-state.js';

// T-84. Runs once, before the signed-in project, and leaves a storage state the
// specs reuse - so signing in costs one browser session for the whole suite
// instead of one per test.
//
// The account is created by scripts/e2e.mjs against the real Clerk instance the
// keys point at, and the seeded Mongo owner of "Arepas El Parche" was rewritten
// to carry its id. That link is the whole point: without it auth() resolves to a
// Clerk user with no Mongo document behind it, and every seller screen would
// treat the session as a stranger.
setup('sign in as the seeded approved seller', async ({ page }) => {
  const emailAddress = process.env.E2E_CLERK_EMAIL;

  expect(
    emailAddress,
    'E2E_CLERK_EMAIL is set by scripts/e2e.mjs. Run the suite through ' +
      '`npm run test:e2e`, not with a bare `npx playwright test`.'
  ).toBeTruthy();

  // Clerk has to be loaded before it can be driven, and the sign-in helper
  // needs a page that is not itself gated.
  await page.goto('/antojos');
  await clerk.loaded({ page });

  await clerk.signIn({ page, emailAddress });

  // Prove the session is real before saving it. A storage state written from a
  // sign-in that silently failed is exactly the "passes against nothing" trap
  // T-84 was opened to avoid: every later spec would redirect to the login page
  // and assert happily against it.
  await page.goto('/antojos/sellers/schedules');
  await expect(page).not.toHaveURL(/auth\/login/);

  await page.context().storageState({ path: AUTH_STATE_PATH });
});
