import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

import { Schedule } from '@/utils/models/scheduleSchema';
import { Seller } from '@/utils/models/sellerSchema2';

// T-122: both product routes carry `availabilityStatus`, so the card, the
// modal (fed by the listing) and the product page (fed by the detail route)
// all show the same state. The seed's approved seller opens Mon/Wed
// 08:00-16:00 and Fri 10:00-18:00; "Arepa de queso" is switched on and
// "Jugo de mango" off.
const MONDAY_10AM = new Date('2024-01-01T15:00:00.000Z');
const MONDAY_8PM = new Date('2024-01-02T01:00:00.000Z');

let listRoute;
let detailRoute;
let ids;

const listing = async () => {
  const response = await listRoute.GET(
    new Request('http://localhost/api/products?section=antojos&limit=20')
  );
  const { products } = await response.json();
  return Object.fromEntries(products.map(p => [p.name, p.availabilityStatus]));
};

const detail = async id =>
  (
    await detailRoute.GET(new Request(`http://localhost/api/products/${id}`), {
      params: { id },
    })
  ).json();

describe('availabilityStatus on the product routes (T-122)', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    listRoute = await import('@/app/api/products/route.js');
    detailRoute = await import('@/app/api/products/[id]/route.js');
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Only Date is faked: the Mongo driver's own timers have to keep running.
  const at = date => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(date);
  };

  it('inside the schedule: available, and off for the switched-off product', async () => {
    at(MONDAY_10AM);

    const status = await listing();

    expect(status['Arepa de queso']).toEqual({ state: 'available' });
    expect(status['Jugo de mango']).toEqual({ state: 'off' });
  });

  it('outside the schedule: closed, with the next opening', async () => {
    at(MONDAY_8PM);

    const status = await listing();

    expect(status['Arepa de queso']).toEqual({
      state: 'closed',
      nextOpening: { day: 3, startTime: '08:00' },
    });
    // The switch still wins over the schedule.
    expect(status['Jugo de mango']).toEqual({ state: 'off' });
  });

  it('a seller with no schedule gets no-schedule, not closed', async () => {
    await Schedule.deleteMany({ sellerId: ids.approvedSeller });
    at(MONDAY_8PM);

    expect((await listing())['Arepa de queso']).toEqual({ state: 'no-schedule' });
  });

  // T-83. Same out-of-schedule instant as the "outside the schedule" case
  // above, but with an active override - both routes have to agree it counts
  // as open, exactly as they agree it doesn't without one.
  it('an active override makes the listing show available outside the schedule', async () => {
    await Seller.findByIdAndUpdate(ids.approvedSeller, {
      availabilityOverrideUntil: new Date(MONDAY_8PM.getTime() + 60 * 60 * 1000),
    });
    at(MONDAY_8PM);

    const status = await listing();

    expect(status['Arepa de queso']).toEqual({ state: 'available' });
    // The switch still wins over an active override too.
    expect(status['Jugo de mango']).toEqual({ state: 'off' });
  });

  it('an expired override leaves the listing closed, same as no override', async () => {
    await Seller.findByIdAndUpdate(ids.approvedSeller, {
      availabilityOverrideUntil: new Date(MONDAY_8PM.getTime() - 60 * 60 * 1000),
    });
    at(MONDAY_8PM);

    expect((await listing())['Arepa de queso']).toEqual({
      state: 'closed',
      nextOpening: { day: 3, startTime: '08:00' },
    });
  });

  it('the detail route also reflects an active override', async () => {
    await Seller.findByIdAndUpdate(ids.approvedSeller, {
      availabilityOverrideUntil: new Date(MONDAY_8PM.getTime() + 60 * 60 * 1000),
    });
    at(MONDAY_8PM);

    const body = await detail(ids.approvedProduct);

    expect(body.availabilityStatus).toEqual({ state: 'available' });
  });

  it('the detail route agrees with the listing', async () => {
    at(MONDAY_8PM);

    const body = await detail(ids.approvedProduct);

    expect(body.availabilityStatus).toEqual({
      state: 'closed',
      nextOpening: { day: 3, startTime: '08:00' },
    });
    // The schedules still reach the UI with day names, as before.
    expect(body.schedules[0].day).toBe('Lunes');
  });
});
