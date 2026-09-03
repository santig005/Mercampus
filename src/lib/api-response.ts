import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

import { logger } from '@/lib/logger';

/** 400 con el detalle por campo. */
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
 * Respuesta de error unica para los handlers.
 *
 * Toma el status de AppError cuando lo hay, registra el error una sola vez, y
 * nunca devuelve al cliente el mensaje de un 500: los errores internos llevan
 * rutas, nombres de coleccion y a veces fragmentos de la consulta.
 */
export function errorResponse(error: unknown, context: string) {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status: unknown }).status) || 500
      : 500;

  const message =
    error instanceof Error ? error.message : 'Error interno del servidor';

  logger.error(context, { status, message });

  return NextResponse.json(
    { error: status >= 500 ? 'Error interno del servidor' : message },
    { status }
  );
}
