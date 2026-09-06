import { z } from 'zod';

import { daysES } from '@/utils/resources/days';

const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;

const scheduleEntrySchema = z.object({
  // day llega como el nombre en español (lo que pinta el formulario), no el
  // número. El handler lo convertía con daysES.indexOf(day) + 1: si el nombre
  // no coincidía exactamente, indexOf devolvía -1 y el horario se guardaba con
  // day: 0, silenciosamente. Aquí se rechaza antes de llegar a esa conversión.
  day: z.enum(daysES as [string, ...string[]]),
  startTime: z.string().regex(TIME_24H, 'La hora debe tener formato HH:MM'),
  endTime: z.string().regex(TIME_24H, 'La hora debe tener formato HH:MM'),
});

// El POST reemplaza TODO el horario del vendedor (borra y vuelve a insertar),
// así que un array vacío es válido: significa "sin horario publicado".
export const replaceSchedulesSchema = z.object({
  sellerId: z.string().regex(/^[a-f\d]{24}$/i, 'sellerId inválido'),
  schedules: z.array(scheduleEntrySchema),
});
