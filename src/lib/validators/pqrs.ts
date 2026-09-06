import { z } from 'zod';

import { pqrsTypes } from '@/utils/resources/pqrs';

export const createPqrsSchema = z.object({
  // El formulario permite enviar la PQRS de forma anónima (email vacío).
  email: z.union([z.string().trim().email('Email inválido'), z.literal('')]).optional(),
  description: z.string().trim().min(1, 'La descripción es obligatoria').max(5000),
  type: z.enum(pqrsTypes as [string, ...string[]]),
});
