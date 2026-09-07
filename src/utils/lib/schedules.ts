import { Types } from 'mongoose';

import { Schedule, type ScheduleDoc } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';

type SellerId = string | Types.ObjectId;
type LeanSchedule = ScheduleDoc & { _id: Types.ObjectId };

/**
 * Several sellers' schedules in ONE query, grouped by seller.
 *
 * This used to be a Schedule.find() per product and per seller: with 50
 * products that was 51 queries. It returns an entry for every id asked for,
 * empty when the seller has no schedules, so callers do not have to check
 * whether it exists.
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

/** Swaps the day number for its Spanish name, as the UI expects. */
export const withDayNames = (schedules: LeanSchedule[]) =>
  schedules.map(schedule => ({
    ...schedule,
    day: daysES[schedule.day - 1],
  }));
