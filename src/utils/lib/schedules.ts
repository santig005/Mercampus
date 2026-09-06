import { Types } from 'mongoose';

import { Schedule, type ScheduleDoc } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';

type SellerId = string | Types.ObjectId;
type LeanSchedule = ScheduleDoc & { _id: Types.ObjectId };

/**
 * Horarios de varios vendedores en UNA sola consulta, agrupados por vendedor.
 *
 * Antes se hacia un Schedule.find() por cada producto y por cada vendedor: con
 * 50 productos eran 51 consultas. Devuelve una entrada por cada id pedido,
 * vacia si el vendedor no tiene horarios, para que quien la use no tenga que
 * comprobar si existe.
 */
export async function getSchedulesBySeller(
  sellerIds: SellerId[]
): Promise<Map<string, LeanSchedule[]>> {
  const unique = [...new Set(sellerIds.map(id => id.toString()))];
  const bySeller = new Map<string, LeanSchedule[]>(unique.map(id => [id, []]));

  if (unique.length === 0) {
    return bySeller;
  }

  const schedules = (await Schedule.find({
    sellerId: { $in: unique },
  }).lean()) as LeanSchedule[];

  for (const schedule of schedules) {
    bySeller.get(schedule.sellerId.toString())?.push(schedule);
  }

  for (const list of bySeller.values()) {
    list.sort((a, b) =>
      a.day !== b.day ? a.day - b.day : a.startTime.localeCompare(b.startTime)
    );
  }

  return bySeller;
}

/** Cambia el numero de dia por su nombre en español, como espera la UI. */
export const withDayNames = (schedules: LeanSchedule[]) =>
  schedules.map(schedule => ({
    ...schedule,
    day: daysES[schedule.day - 1],
  }));
