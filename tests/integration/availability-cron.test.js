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
});
