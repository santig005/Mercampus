// T-122: what a buyer is told about whether they can get a product right now.
//
// There are two availabilities and the card used to show only one of them:
// `Product.availability` is the seller's manual per-product switch, and "is the
// store open" comes from the seller's Schedule. Measured on 2026-09-14, 75 of
// 95 visible products said "Disponible" while their store was closed.
//
// This is the single definition of "open". The T-14 cron (api/sellers/
// availability) uses isOpenAt() to write `Seller.availability`, and the product
// routes use productAvailability() to label each product. T-123's filter is the
// same rule as a Mongo query, in src/server/products/availableSellers.ts: change
// one and the other has to follow, or the filter and the badge disagree.
//
// Computed from the schedules at read time rather than read from
// `Seller.availability`: that field is only as fresh as the last cron run (a
// GitHub Actions schedule, every 10-20 minutes as measured on 2026-09-14), and
// "abre mar 6:38" needs the schedules anyway.
//
// T-83: `Seller.availabilityOverrideUntil` (a nullable timestamp) opens the
// store outside its schedule for a bounded window. Its override lives in
// isOpenAt(), so both callers - the T-14 cron and productAvailability() -
// see it the same way. isOpenAt() itself never touches the database or reads
// `now`: callers resolve the timestamp into a plain boolean with
// isOverrideActive() and pass that in, keeping isOpenAt() a pure function of
// `clock` (Bogotá day + HH:MM) exactly as before.

export type ScheduleSlot = {
  day: number; // 1 = Monday ... 7 = Sunday, as stored
  startTime: string; // 'HH:MM', 24h, Bogotá time
  endTime: string;
};

export type BogotaClock = { day: number; time: string };

export type NextOpening = { day: number; startTime: string };

export type AvailabilityStatus =
  | { state: 'available' }
  | { state: 'closed'; nextOpening: NextOpening }
  // The seller has no schedule at all, so "closed" would be a guess. 9 of 36
  // visible sellers on 2026-09-14. The human's call: a neutral label, not
  // "Cerrado".
  | { state: 'no-schedule' }
  | { state: 'off' };

// Colombia has no daylight saving, so a fixed offset is enough. "Now" in the
// runtime's timezone (UTC on Vercel) would not match the local time the seller
// typed into their schedule. Exported so other read-only aggregations that
// need to bucket a UTC timestamp into Bogotá local time (T-44's seller panel)
// reuse the same constant instead of re-typing the magic number.
export const BOGOTA_OFFSET_HOURS = 5;

export function bogotaClock(now: Date): BogotaClock {
  const bogota = new Date(now.getTime() - BOGOTA_OFFSET_HOURS * 60 * 60 * 1000);
  const utcDay = bogota.getUTCDay();
  return {
    day: utcDay === 0 ? 7 : utcDay,
    time: bogota.toISOString().slice(11, 16),
  };
}

// Schedules saved before the Zod validator could carry day: 0 (see
// api/schedules/route.js). They can never match, so they don't count as a
// schedule either.
const validSlots = (schedules: ScheduleSlot[]) =>
  schedules.filter(slot => Number.isInteger(slot.day) && slot.day >= 1 && slot.day <= 7);

// Both ends inclusive, exactly what the cron has always done. A slot that
// crosses midnight (endTime < startTime) never matches, as before.
//
// T-83: `overrideActive` short-circuits the schedule check entirely - a
// seller with an active override is open no matter what Schedule says.
// Defaults to `false` so every pre-T-83 caller (and every existing test)
// keeps behaving exactly as before without passing a third argument.
export function isOpenAt(
  schedules: ScheduleSlot[],
  clock: BogotaClock,
  overrideActive = false
): boolean {
  return (
    overrideActive ||
    validSlots(schedules).some(
      slot =>
        slot.day === clock.day &&
        slot.startTime <= clock.time &&
        slot.endTime >= clock.time
    )
  );
}

// T-83: turns `Seller.availabilityOverrideUntil` into the boolean isOpenAt()
// wants. A missing/null value (every seller before this field existed, and
// every seller who never used it) is "no override" - not an error - so this
// is a plain falsy check, not a `$ne`-style Mongo filter: there is no query
// here, just a value already read off a document.
export function isOverrideActive(
  overrideUntil: Date | string | null | undefined,
  now: Date
): boolean {
  if (!overrideUntil) {
    return false;
  }
  return new Date(overrideUntil).getTime() > now.getTime();
}

// The next slot that starts after `clock`, looking a full week ahead: the same
// day next week counts, so a seller open only on Mondays, asked on a Monday
// after closing, opens "lun" again.
export function nextOpening(
  schedules: ScheduleSlot[],
  clock: BogotaClock
): NextOpening | null {
  const slots = validSlots(schedules);

  for (let offset = 0; offset <= 7; offset++) {
    const day = ((clock.day - 1 + offset) % 7) + 1;
    const starts = slots
      .filter(slot => slot.day === day)
      .map(slot => slot.startTime)
      .filter(start => (offset === 0 ? start > clock.time : true))
      .filter(start => (offset === 7 ? start <= clock.time : true))
      .sort();

    if (starts.length > 0) {
      return { day, startTime: starts[0] };
    }
  }

  return null;
}

export function productAvailability(
  productOn: unknown,
  schedules: ScheduleSlot[],
  now: Date = new Date(),
  overrideUntil: Date | string | null | undefined = null
): AvailabilityStatus {
  // The seller's switch wins: a product they turned off is not coming back
  // when the store opens, override or not.
  if (!productOn) {
    return { state: 'off' };
  }

  const clock = bogotaClock(now);
  if (isOpenAt(schedules, clock, isOverrideActive(overrideUntil, now))) {
    return { state: 'available' };
  }

  const next = nextOpening(schedules, clock);
  return next ? { state: 'closed', nextOpening: next } : { state: 'no-schedule' };
}

// T-81 (seller profile zone): this used to be `availabilityLabel(status)`,
// returning a hardcoded Spanish string ("Disponible", "Cerrado ahora · abre
// mar 6:38", ...) - the human's wording from T-122/2026-09-14, but fixed to
// one language with no next-intl involved, because AvailabilityBadge (its
// only caller) predates this zone's migration. Now that AvailabilityBadge
// renders through next-intl, the language-specific strings moved into
// messages/{es,en}.json under the `AvailabilityBadge` namespace, and this
// file keeps only the pure, locale-agnostic part: turning `nextOpening`'s
// 24h `startTime` into the `{ hour, minute }` pair the component interpolates
// into its translated template. `hour` drops the leading zero (Number()),
// `minute` keeps it (stays a string) - same behaviour as the deleted
// function's template literal, still covered by
// tests/unit/store-availability.test.js.
export function formatOpeningTime(startTime: string): { hour: number; minute: string } {
  const [hours, minutes] = startTime.split(':');
  return { hour: Number(hours), minute: minutes };
}
