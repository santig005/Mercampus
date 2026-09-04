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
 *
 * `bodyKey` existe porque los handlers no coinciden en la forma del cuerpo:
 * unos devuelven `{ error }` y otros `{ message }`, y cambiarla rompe al
 * frontend que ya la lee. Se unifica en T-32; mientras tanto cada ruta declara
 * la suya en vez de repetir la politica de no filtrar el mensaje de un 500.
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

  logger.error(context, { status, message });

  return NextResponse.json(
    { [bodyKey]: status >= 500 ? 'Error interno del servidor' : message },
    { status }
  );
}
