import * as Sentry from '@sentry/nextjs';

import { SENTRY_COMMON_INIT_OPTIONS } from '@/lib/sentry';

// T-60: client-side mirror of src/instrumentation.ts. NEXT_PUBLIC_ because
// this file ships in the browser bundle - a DSN is not a secret (it only
// lets a caller send events, not read them), but SENTRY_DSN without the
// prefix would just never reach the client at build time.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    ...SENTRY_COMMON_INIT_OPTIONS,
  });
}
