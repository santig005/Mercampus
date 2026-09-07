import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

import { logger } from '@/lib/logger';

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

  // 401/403 (and other 4xx) are expected client-side rejections, not server
  // failures: log them at warn so they don't drown out the errors that are
  // actually unexpected.
  const log = status >= 500 ? logger.error : logger.warn;
  log(context, { status, message });

  return NextResponse.json(
    { [bodyKey]: status >= 500 ? 'Error interno del servidor' : message },
    { status }
  );
}
