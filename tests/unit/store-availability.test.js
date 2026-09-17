import { describe, expect, it } from 'vitest';

import {
  bogotaClock,
  formatOpeningTime,
  isOpenAt,
  isOverrideActive,
  nextOpening,
  productAvailability,
} from '@/lib/store-availability';

// The seed's schedule: Mon/Wed 08:00-16:00, Fri 10:00-18:00.
const weekday = [
  { day: 1, startTime: '08:00', endTime: '16:00' },
  { day: 3, startTime: '08:00', endTime: '16:00' },
  { day: 5, startTime: '10:00', endTime: '18:00' },
];

// 2024-01-01 was a Monday. Bogotá is UTC-5 all year.
const MONDAY_10AM = new Date('2024-01-01T15:00:00.000Z');
const MONDAY_8PM = new Date('2024-01-02T01:00:00.000Z'); // Tuesday in UTC
const SUNDAY_11PM = new Date('2024-01-08T04:00:00.000Z');

describe('bogotaClock (T-122)', () => {
  it('is Monday 20:00 in Bogotá even though UTC already rolled over', () => {
    expect(bogotaClock(MONDAY_8PM)).toEqual({ day: 1, time: '20:00' });
  });

  it('maps Sunday to 7, as the schedules store it', () => {
    expect(bogotaClock(SUNDAY_11PM)).toEqual({ day: 7, time: '23:00' });
  });
});

describe('isOpenAt (T-122)', () => {
  it('both ends of a slot count as open, like the cron always did', () => {
    expect(isOpenAt(weekday, { day: 1, time: '08:00' })).toBe(true);
    expect(isOpenAt(weekday, { day: 1, time: '16:00' })).toBe(true);
    expect(isOpenAt(weekday, { day: 1, time: '16:01' })).toBe(false);
  });

  it('a day without a slot is closed', () => {
    expect(isOpenAt(weekday, { day: 2, time: '10:00' })).toBe(false);
  });

  it('T-83: an active override opens the store on a day with no slot at all', () => {
    expect(isOpenAt(weekday, { day: 2, time: '10:00' }, true)).toBe(true);
  });

  it('T-83: overrideActive defaults to false, unchanged from before T-83', () => {
    expect(isOpenAt(weekday, { day: 2, time: '10:00' })).toBe(false);
  });
});

describe('isOverrideActive (T-83)', () => {
  const now = MONDAY_10AM;

  it('a future timestamp is active', () => {
    expect(isOverrideActive(new Date(now.getTime() + 60_000), now)).toBe(true);
  });

  it('a past timestamp is not active - it already expired', () => {
    expect(isOverrideActive(new Date(now.getTime() - 60_000), now)).toBe(false);
  });

  it('exactly now is not active - the window has to still be open', () => {
    expect(isOverrideActive(now, now)).toBe(false);
  });

  it('null is not active - a seller who never used this', () => {
    expect(isOverrideActive(null, now)).toBe(false);
  });

  it('undefined is not active - a document that predates the field', () => {
    expect(isOverrideActive(undefined, now)).toBe(false);
  });

  it('accepts an ISO string, the shape a lean() read hands back', () => {
    expect(isOverrideActive(new Date(now.getTime() + 60_000).toISOString(), now)).toBe(
      true
    );
  });
});

describe('nextOpening (T-122)', () => {
  it('later today, before the slot starts', () => {
    expect(nextOpening(weekday, { day: 1, time: '06:30' })).toEqual({
      day: 1,
      startTime: '08:00',
    });
  });

  it('the next day with a slot, after today’s closed', () => {
    expect(nextOpening(weekday, { day: 1, time: '20:00' })).toEqual({
      day: 3,
      startTime: '08:00',
    });
  });

  it('wraps past Sunday to Monday', () => {
    expect(nextOpening(weekday, { day: 6, time: '12:00' })).toEqual({
      day: 1,
      startTime: '08:00',
    });
  });

  it('the same weekday next week when that is the only slot', () => {
    const mondaysOnly = [{ day: 1, startTime: '08:00', endTime: '10:00' }];

    expect(nextOpening(mondaysOnly, { day: 1, time: '12:00' })).toEqual({
      day: 1,
      startTime: '08:00',
    });
  });

  it('the earliest slot of the day when a seller has two', () => {
    const split = [
      { day: 2, startTime: '14:00', endTime: '18:00' },
      { day: 2, startTime: '07:00', endTime: '09:00' },
    ];

    expect(nextOpening(split, { day: 1, time: '20:00' })).toEqual({
      day: 2,
      startTime: '07:00',
    });
  });

  it('ignores a legacy day: 0 slot and finds nothing when that is all there is', () => {
    const legacy = [{ day: 0, startTime: '08:00', endTime: '16:00' }];

    expect(nextOpening(legacy, { day: 1, time: '12:00' })).toBeNull();
  });
});

describe('productAvailability (T-122)', () => {
  it('available: product on and store open', () => {
    expect(productAvailability(true, weekday, MONDAY_10AM)).toEqual({
      state: 'available',
    });
  });

  it('closed, with when it opens: product on and store outside its schedule', () => {
    expect(productAvailability(true, weekday, MONDAY_8PM)).toEqual({
      state: 'closed',
      nextOpening: { day: 3, startTime: '08:00' },
    });
  });

  it('off: the seller’s switch wins even while the store is open', () => {
    expect(productAvailability(false, weekday, MONDAY_10AM)).toEqual({ state: 'off' });
  });

  it('no-schedule, not closed, for a seller with no schedule at all', () => {
    expect(productAvailability(true, [], MONDAY_10AM)).toEqual({
      state: 'no-schedule',
    });
  });

  it('a product switched off stays off without a schedule too', () => {
    expect(productAvailability(false, [], MONDAY_10AM)).toEqual({ state: 'off' });
  });

  it('T-83: an active override makes an out-of-schedule product available', () => {
    const overrideUntil = new Date(MONDAY_8PM.getTime() + 60 * 60 * 1000);
    expect(productAvailability(true, weekday, MONDAY_8PM, overrideUntil)).toEqual({
      state: 'available',
    });
  });

  it('T-83: an expired override behaves exactly like no override at all', () => {
    const overrideUntil = new Date(MONDAY_8PM.getTime() - 60 * 60 * 1000);
    expect(productAvailability(true, weekday, MONDAY_8PM, overrideUntil)).toEqual({
      state: 'closed',
      nextOpening: { day: 3, startTime: '08:00' },
    });
  });

  it('T-83: the product switch still wins over an active override', () => {
    const overrideUntil = new Date(MONDAY_8PM.getTime() + 60 * 60 * 1000);
    expect(productAvailability(false, weekday, MONDAY_8PM, overrideUntil)).toEqual({
      state: 'off',
    });
  });

  it('T-83: a missing overrideUntil (every seller before this field existed) behaves as before', () => {
    expect(productAvailability(true, weekday, MONDAY_8PM)).toEqual({
      state: 'closed',
      nextOpening: { day: 3, startTime: '08:00' },
    });
  });
});

// T-81 (seller profile zone): availabilityLabel() used to return the whole
// hardcoded Spanish string ("Disponible", "Cerrado ahora · abre mar 6:38",
// ...) - moved into AvailabilityBadge.jsx + messages/{es,en}.json so the
// component can render it through next-intl. What's left here in
// store-availability.ts is only the pure, language-agnostic piece:
// splitting `startTime` into the `{ hour, minute }` pair the component
// interpolates into its translated template.
describe('formatOpeningTime (T-122/T-81)', () => {
  it('drops the leading zero of the hour but keeps the minutes as-is', () => {
    expect(formatOpeningTime('06:38')).toEqual({ hour: 6, minute: '38' });
    expect(formatOpeningTime('14:05')).toEqual({ hour: 14, minute: '05' });
  });
});
