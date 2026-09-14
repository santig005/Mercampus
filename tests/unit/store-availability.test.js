import { describe, expect, it } from 'vitest';

import {
  availabilityLabel,
  bogotaClock,
  isOpenAt,
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
});

describe('availabilityLabel (T-122)', () => {
  it('the four labels the buyer sees', () => {
    expect(availabilityLabel({ state: 'available' })).toBe('Disponible');
    expect(availabilityLabel({ state: 'off' })).toBe('No disponible');
    expect(availabilityLabel({ state: 'no-schedule' })).toBe('Consultar horario');
    expect(
      availabilityLabel({ state: 'closed', nextOpening: { day: 2, startTime: '06:38' } })
    ).toBe('Cerrado ahora · abre mar 6:38');
  });

  it('keeps the minutes and drops only the leading zero of the hour', () => {
    expect(
      availabilityLabel({ state: 'closed', nextOpening: { day: 6, startTime: '14:05' } })
    ).toBe('Cerrado ahora · abre sáb 14:05');
  });
});
