import type { Types } from 'mongoose';

import { bogotaClock } from '@/lib/store-availability';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Seller } from '@/utils/models/sellerSchema2';

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
 *
 * T-83: a seller with an active `availabilityOverrideUntil` counts as open
 * here too - the ROADMAP note next to T-123 is explicit that the override
 * "must count as open under whatever definition this lands". `$gt: now`
 * already excludes a seller without the field (a nonexistent field never
 * satisfies `$gt`), so this needs no `$ne`-style rewrite for the 54 sellers
 * that predate it - unlike an equality filter, which is the trap T-71 hit.
 */
export async function getAvailableSellerIds(
  sellerIds: Types.ObjectId[],
  now: Date
): Promise<Types.ObjectId[]> {
  if (sellerIds.length === 0) {
    return [];
  }

  const { day, time } = bogotaClock(now);

  const [withSchedule, openNow, overridden] = await Promise.all([
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
    Seller.find({
      _id: { $in: sellerIds },
      availabilityOverrideUntil: { $gt: now },
    }).distinct('_id'),
  ]);

  const scheduled = new Set(withSchedule.map(String));
  const open = new Set(openNow.map(String));
  const overriddenOpen = new Set(overridden.map(String));

  return sellerIds.filter(id => {
    const key = id.toString();
    return open.has(key) || overriddenOpen.has(key) || !scheduled.has(key);
  });
}
