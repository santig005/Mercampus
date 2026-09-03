import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

/**
 * Respuesta 400 con el detalle por campo.
 *
 * Sin esto, un body invalido llegaba a Mongoose y salia como 500 "Error al
 * guardar", que no le dice nada a quien llama.
 */
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
