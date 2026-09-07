import { z } from 'zod';

import { daysES } from '@/utils/resources/days';

const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;

const scheduleEntrySchema = z.object({
  // day arrives as the Spanish name (what the form renders), not the number.
  // The handler converted it with daysES.indexOf(day) + 1: if the name didn't
  // match exactly, indexOf returned -1 and the schedule was saved with
  // day: 0, silently. Here it is rejected before reaching that conversion.
  day: z.enum(daysES as [string, ...string[]]),
  startTime: z.string().regex(TIME_24H, 'La hora debe tener formato HH:MM'),
  endTime: z.string().regex(TIME_24H, 'La hora debe tener formato HH:MM'),
});

// The POST replaces the seller's WHOLE schedule (deletes and re-inserts), so
// an empty array is valid: it means "no published schedule".
export const replaceSchedulesSchema = z.object({
  sellerId: z.string().regex(/^[a-f\d]{24}$/i, 'sellerId inválido'),
  schedules: z.array(scheduleEntrySchema),
});
