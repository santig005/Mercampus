import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

import { logger } from '@/lib/logger';
import { ConfigError } from '@/utils/lib/errors';

/** 400 with the per-field detail. */
export const invalidPayload = (error: ZodError) =>
  NextResponse.json(
    {
      message: 'Datos inválidos',
      fields: error.issues.map(issue => ({
        field: issue.path.join('.') || '(raíz)',
        message: issue.message,
      })),
    },
    { status: 400 }
  );

/**
 * The one error response for the handlers.
 *
 * Takes the status from AppError when there is one, logs the error exactly
 * once, and never returns a 500's message to the client: internal errors
 * carry paths, collection names and sometimes fragments of the query.
 *
 * `bodyKey` exists because the handlers don't agree on the body shape: some
 * return `{ error }` and others `{ message }`, and changing it breaks the
 * frontend already reading it. T-32 unifies them; until then each route
 * declares its own instead of repeating the policy of not leaking a 500's
 * message.
 */
export function errorResponse(
  error: unknown,
  context: string,
  { bodyKey = 'error' }: { bodyKey?: 'error' | 'message' } = {}
) {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status: unknown }).status) || 500
      : 500;

  const message =
    error instanceof Error ? error.message : 'Error interno del servidor';

  // T-126: the imagekit SDK (and others) reject with a plain object
  // (`{ message, help }`), not an `Error`. `message` above falls back to the
  // generic string for those, which is fine for the client response but was
  // silently dropping the real reason from the server log. Pull it - and
  // `help`, when present - from any thrown value that has one, without ever
  // logging the whole object: it could be a request or an SDK client
  // carrying a private key.
  const detail =
    !(error instanceof Error) &&
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
      ? {
          detailMessage: (error as { message: string }).message,
          ...('help' in error &&
          typeof (error as { help: unknown }).help === 'string'
            ? { help: (error as { help: string }).help }
            : {}),
        }
      : undefined;

  // 401/403 (and other 4xx) are expected client-side rejections, not server
  // failures: log them at warn so they don't drown out the errors that are
  // actually unexpected.
  const log = status >= 500 ? logger.error : logger.warn;
  log(context, { status, message, ...detail });

  // T-113: a missing env var isn't a transient failure like a DB timeout -
  // retrying does nothing until a human sets it in Vercel. The generic 500
  // branch below reads as "try again" to the caller; this one says so.
  if (error instanceof ConfigError) {
    return NextResponse.json(
      {
        [bodyKey]:
          'Error de configuración del servidor. Reintentar no lo va a arreglar; ya quedó registrado para el equipo.',
      },
      { status }
    );
  }

  return NextResponse.json(
    { [bodyKey]: status >= 500 ? 'Error interno del servidor' : message },
    { status }
  );
}

/**
 * T-154: 429 for a request over its rate limit. Same body shape as
 * errorResponse (`{ [bodyKey]: message }`) so the frontend reads it the same
 * way, plus `Retry-After` in seconds until the current window ends.
 *
 * Not logged here: a client hammering a route would turn every rejected
 * request into a log line. The limiter is what decides, and it logs nothing
 * that identifies the caller.
 */
export const tooManyRequests = (
  retryAfterSeconds: number,
  { bodyKey = 'error' }: { bodyKey?: 'error' | 'message' } = {}
) =>
  NextResponse.json(
    {
      [bodyKey]:
        'Demasiadas solicitudes. Espera un momento antes de volver a intentarlo.',
    },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.max(1, Math.ceil(retryAfterSeconds))) },
    }
  );
