import type { ErrorEvent } from '@sentry/nextjs';

/**
 * Shared between the three Sentry entry points (`src/instrumentation.ts`,
 * `src/instrumentation-client.ts`) and `src/lib/logger.ts`'s bridge.
 */

type SentryRequest = NonNullable<ErrorEvent['request']>;
type SentryUser = NonNullable<ErrorEvent['user']>;

// Case-insensitive: Sentry normalizes incoming header names in whatever case
// the framework handed them to it, so this can't assume lower-case already.
const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-clerk-auth-token',
  'x-clerk-auth-signature',
]);

// Dropped outright rather than masked: CLAUDE.md rule 6 - no secret or PII
// leaves this app, and a partially-masked value is still a leak if the mask
// is wrong.
const SENSITIVE_USER_FIELDS = new Set(['email', 'phone', 'ip_address', 'username']);

function scrubHeaders(
  headers: SentryRequest['headers']
): SentryRequest['headers'] {
  if (!headers) return headers;
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !SENSITIVE_HEADER_NAMES.has(name.toLowerCase()))
  ) as SentryRequest['headers'];
}

function scrubRequest(request: SentryRequest): SentryRequest {
  // `data` is the request body (could be a seller's full profile, a product
  // description, anything a Zod schema validated); `cookies` carries the
  // Clerk session. Neither belongs in an error report.
  const { data, cookies, headers, ...rest } = request;
  return { ...rest, headers: scrubHeaders(headers) };
}

function scrubUser(user: SentryUser): SentryUser {
  return Object.fromEntries(
    Object.entries(user).filter(([field]) => !SENSITIVE_USER_FIELDS.has(field))
  ) as SentryUser;
}

/**
 * `beforeSend` for every Sentry.init() call in this app (server, edge,
 * client).
 */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  return {
    ...event,
    ...(event.request !== undefined ? { request: scrubRequest(event.request) } : {}),
    ...(event.user !== undefined ? { user: scrubUser(event.user) } : {}),
  };
}

export const SENTRY_COMMON_INIT_OPTIONS = {
  // CLAUDE.md rule 6: never the default. beforeSend below is the actual
  // enforcement; this just stops Sentry from attaching IP/cookies/headers
  // before beforeSend even runs.
  sendDefaultPii: false,
  beforeSend: scrubSentryEvent,
};
