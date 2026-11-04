import { z } from 'zod';

import {
  REPORT_DETAILS_MAX,
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
} from '@/utils/resources/reports';

const objectIdRegex = /^[a-f\d]{24}$/i;

// `reporterClerkId` and `status` are deliberately not declared: by default
// Zod drops any key it doesn't declare (same note as productIdSchema in
// product.ts), so a forged `reporterClerkId` in the body is dropped here -
// the route sets it from the session, never from this parsed object.
export const createReportSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES, { error: 'Tipo de reporte inválido' }),
  targetId: z.string().regex(objectIdRegex, 'El id no es válido'),
  reason: z.enum(REPORT_REASONS, { error: 'Motivo inválido' }),
  details: z
    .string()
    .trim()
    .max(REPORT_DETAILS_MAX, {
      error: `El detalle no puede superar ${REPORT_DETAILS_MAX} caracteres`,
    })
    .optional(),
});
