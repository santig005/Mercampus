// T-122: what a buyer is told about whether they can get a product right now.
//
// There are two availabilities and the card used to show only one of them:
// `Product.availability` is the seller's manual per-product switch, and "is the
// store open" comes from the seller's Schedule. Measured on 2026-09-14, 75 of
// 95 visible products said "Disponible" while their store was closed.
//
// This is the single definition of "open". The T-14 cron (api/sellers/
// availability) uses isOpenAt() to write `Seller.availability`, and the product
// routes use productAvailability() to label each product. T-123's filter has to
// use it too, or the filter and the badge will disagree.
//
// Computed from the schedules at read time rather than read from
// `Seller.availability`: that field lags the cron by up to ten minutes, and
// "abre mar 6:38" needs the schedules anyway.
//
// T-83 (opening outside the schedule for a bounded window) does not exist yet.
// When it lands, its override belongs in isOpenAt(), so both callers see it.

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
// typed into their schedule.
const BOGOTA_OFFSET_HOURS = 5;

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
export function isOpenAt(schedules: ScheduleSlot[], clock: BogotaClock): boolean {
  return validSlots(schedules).some(
    slot =>
      slot.day === clock.day &&
      slot.startTime <= clock.time &&
      slot.endTime >= clock.time
  );
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
  now: Date = new Date()
): AvailabilityStatus {
  // The seller's switch wins: a product they turned off is not coming back
  // when the store opens.
  if (!productOn) {
    return { state: 'off' };
  }

  const clock = bogotaClock(now);
  if (isOpenAt(schedules, clock)) {
    return { state: 'available' };
  }

  const next = nextOpening(schedules, clock);
  return next ? { state: 'closed', nextOpening: next } : { state: 'no-schedule' };
}

// Product copy, so Spanish. Wording chosen by the human on 2026-09-14;
// "Consultar horario" was their pick of a neutral label for no schedule.
const SHORT_DAYS_ES = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

export function availabilityLabel(status: AvailabilityStatus): string {
  switch (status.state) {
    case 'available':
      return 'Disponible';
    case 'off':
      return 'No disponible';
    case 'no-schedule':
      return 'Consultar horario';
    case 'closed': {
      const { day, startTime } = status.nextOpening;
      const [hours, minutes] = startTime.split(':');
      return `Cerrado ahora · abre ${SHORT_DAYS_ES[day - 1]} ${Number(hours)}:${minutes}`;
    }
  }
}
