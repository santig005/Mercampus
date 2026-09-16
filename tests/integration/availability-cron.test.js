import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

import { Seller } from '@/utils/models/sellerSchema2';

const CRON_SECRET = 'secreto-de-prueba';

let availabilityRoute;
let ids;

const request = authorization =>
  new Request('http://localhost/api/sellers/availability', {
    headers: authorization ? { authorization } : {},
  });

// From the seed: an approved seller open Mon/Wed 08:00-16:00 and
// viernes 10:00-18:00 (day: 1 = lunes, ver scripts/seed.mjs).
describe('GET /api/sellers/availability', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    process.env.CRON_SECRET = CRON_SECRET;
    availabilityRoute = await import('@/app/api/sellers/availability/route.js');
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('without Authorization responds 401 and touches no Seller', async () => {
    const spy = vi.spyOn(Seller, 'findByIdAndUpdate');

    const response = await availabilityRoute.GET(request());

    expect(response.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it('with the wrong secret responds 401 and touches no Seller', async () => {
    const spy = vi.spyOn(Seller, 'findByIdAndUpdate');

    const response = await availabilityRoute.GET(request('Bearer secreto-invalido'));

    expect(response.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it('without CRON_SECRET configured responds 401 even if something is sent', async () => {
    const original = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    const response = await availabilityRoute.GET(request('Bearer undefined'));
    expect(response.status).toBe(401);

    process.env.CRON_SECRET = original;
  });

  it('marks the seeded seller available within its schedule (Monday 10am Bogota)', async () => {
    // Forced to false first: if the test passed without the route doing
    // anything, it wouldn't prove what it claims to (the schema default is
    // es true).
    await Seller.findByIdAndUpdate(ids.approvedSeller, { availability: false });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T15:00:00.000Z')); // lunes 10:00 en Bogota (UTC-5)

    const response = await availabilityRoute.GET(request(`Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);

    const seller = await Seller.findById(ids.approvedSeller);
    expect(seller.availability).toBe(true);
  });

  it('marks the seeded seller unavailable outside its schedule (Monday 8pm Bogota)', async () => {
    vi.useFakeTimers();
    // 2024-01-02T01:00 UTC es 2024-01-01 20:00 en Bogota: sigue siendo lunes
    // in local time even though the UTC day already rolled over - confirming
    // the timezone conversion, not just the hour, is right.
    vi.setSystemTime(new Date('2024-01-02T01:00:00.000Z'));

    const response = await availabilityRoute.GET(request(`Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);

    const seller = await Seller.findById(ids.approvedSeller);
    expect(seller.availability).toBe(false);
  });

  // T-83. Same fixture, same out-of-schedule instant as the test right above -
  // the only difference is the override, and it flips the result.
  it('an active override wins even outside the schedule, instead of the cron overwriting it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-02T01:00:00.000Z')); // lunes 20:00 en Bogota, cerrado

    await Seller.findByIdAndUpdate(ids.approvedSeller, {
      availabilityOverrideUntil: new Date('2024-01-02T02:00:00.000Z'), // one hour later
    });

    const response = await availabilityRoute.GET(request(`Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);

    const seller = await Seller.findById(ids.approvedSeller);
    expect(seller.availability).toBe(true);
  });

  it('an expired override does not stop the cron from marking the seller closed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-02T01:00:00.000Z')); // lunes 20:00 en Bogota, cerrado

    await Seller.findByIdAndUpdate(ids.approvedSeller, {
      availabilityOverrideUntil: new Date('2024-01-02T00:00:00.000Z'), // one hour in the past
    });

    const response = await availabilityRoute.GET(request(`Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);

    const seller = await Seller.findById(ids.approvedSeller);
    expect(seller.availability).toBe(false);
  });

  // Rule 8, as a test: every seller already in the database predates this
  // field entirely (it did not exist before this PR), so `Seller.find()`
  // returning it as `undefined`/`null` for an old document has to behave
  // exactly like "no override" - not throw, not mark it open.
  it('a seller document with no availabilityOverrideUntil field at all is unaffected', async () => {
    // By business name, not `_id`: `ids.approvedSeller` is a plain string and
    // the raw driver (unlike Mongoose) does not cast it to an ObjectId, so a
    // `_id` filter here would silently match nothing - the same reason
    // seller-pause.test.js looks its seller up this way too.
    await Seller.collection.updateOne(
      { businessName: 'Arepas El Parche' },
      { $unset: { availabilityOverrideUntil: '' } }
    );
    const raw = await Seller.collection.findOne({ businessName: 'Arepas El Parche' });
    expect('availabilityOverrideUntil' in raw).toBe(false);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-02T01:00:00.000Z')); // lunes 20:00 en Bogota, cerrado

    const response = await availabilityRoute.GET(request(`Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);

    const seller = await Seller.findById(ids.approvedSeller);
    expect(seller.availability).toBe(false);
  });
});
