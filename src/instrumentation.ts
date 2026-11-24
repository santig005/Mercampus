import * as Sentry from '@sentry/nextjs';

import { SENTRY_COMMON_INIT_OPTIONS } from '@/lib/sentry';

// T-60: off by default. With SENTRY_DSN unset (every environment until
// T-60b sets it in Vercel), this never calls Sentry.init, so there is no
// Sentry client, no network call, and the logger bridge's
// `Sentry.getClient()` guard stays false.
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  // Both runtimes share the same options: nothing here is nodejs- or
  // edge-specific. If that changes, split this into two Sentry.init calls.
  Sentry.init({
    dsn,
    // Errors only, no performance monitoring - this is a portfolio-scale
    // app with no traffic to sample (see CLAUDE.md, "modo rehabilitación").
    // Revisit if T-60b's alert work ever needs transaction data.
    tracesSampleRate: 0,
    ...SENTRY_COMMON_INIT_OPTIONS,
  });
}

// Reports errors from nested React Server Components that `register()`'s
// try/catch can't reach. Always exported (unlike Sentry.init above, this
// line itself makes no network call): captureRequestError no-ops when
// Sentry.init was never called, same guard as everywhere else.
export const onRequestError = Sentry.captureRequestError;
