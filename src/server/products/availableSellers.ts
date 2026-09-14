import type { Types } from 'mongoose';

import { bogotaClock } from '@/lib/store-availability';
import { Schedule } from '@/utils/models/scheduleSchema';

/**
 * T-123: of these sellers, the ones whose switched-on products count as
 * available right now - open per their schedule, or with no schedule at all
 * (the human's call on 2026-09-14: "Consultar horario" belongs with
 * "Disponibles ahora").
 *
 * This is productAvailability() (src/lib/store-availability.ts) written as a
 * Mongo query, so the listing can filter and paginate by it instead of
 * labelling a page after the fact. The two must agree: the open-slot filter is
 * isOpenAt()'s predicate (same day, both ends inclusive) and a slot outside
 * days 1-7 does not count as a schedule, as in validSlots(). The integration
 * test checks every product's badge against the block it was listed in.
 *
 * Computed per request rather than read from `Seller.availability`, which is
 * only as fresh as the last cron run.
 */
export async function getAvailableSellerIds(
  sellerIds: Types.ObjectId[],
  now: Date
): Promise<Types.ObjectId[]> {
  if (sellerIds.length === 0) {
    return [];
  }

  const { day, time } = bogotaClock(now);

  const [withSchedule, openNow] = await Promise.all([
    Schedule.distinct('sellerId', {
      sellerId: { $in: sellerIds },
      day: { $gte: 1, $lte: 7 },
    }),
    Schedule.distinct('sellerId', {
      sellerId: { $in: sellerIds },
      day,
      startTime: { $lte: time },
      endTime: { $gte: time },
    }),
  ]);

  const scheduled = new Set(withSchedule.map(String));
  const open = new Set(openNow.map(String));

  return sellerIds.filter(id => {
    const key = id.toString();
    return open.has(key) || !scheduled.has(key);
  });
}
