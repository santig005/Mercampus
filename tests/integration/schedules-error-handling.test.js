import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// T-141 (batch 1): GET /api/schedules/[id] and GET /api/schedules used to
// answer a 500 with `{ message: 'Internal server error.', error: error.message }` -
// the second key echoing whatever Mongoose or the driver said, verbatim.
// Migrated to errorResponse(), the same way POST /api/schedules and
// GET /api/products/[id] already were (T-97/F29).
let scheduleByIdRoute;
let schedulesRoute;
let Schedule;
let ids;

beforeAll(async () => {
  process.env.MONGO_URI = await startTestDb();
  scheduleByIdRoute = await import('@/app/api/schedules/[id]/route.js');
  schedulesRoute = await import('@/app/api/schedules/route.js');
  ({ Schedule } = await import('@/utils/models/scheduleSchema'));
}, 120_000);

afterAll(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  ({ ids } = await seedDatabase());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/schedules/[id]', () => {
  const get = id =>
    scheduleByIdRoute.GET(new Request(`http://localhost/api/schedules/${id}`), {
      params: { id },
    });

  it('200 with the seller’s schedules on the happy path', async () => {
    const response = await get(ids.approvedSeller);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.schedules.length).toBeGreaterThan(0);
  });

  it('a forced internal error returns the errorResponse shape, not a crash', async () => {
    vi.spyOn(Schedule, 'find').mockRejectedValueOnce(new Error('secret driver detail'));

    const response = await get(ids.approvedSeller);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: 'Error interno del servidor' });
  });

  it('the 500 never leaks the underlying driver/Mongoose message', async () => {
    vi.spyOn(Schedule, 'find').mockRejectedValueOnce(new Error('secret driver detail'));

    const response = await get(ids.approvedSeller);
    const serialised = JSON.stringify(await response.json());

    expect(serialised).not.toContain('secret driver detail');
  });
});

describe('GET /api/schedules', () => {
  const get = () => schedulesRoute.GET(new Request('http://localhost/api/schedules'));

  it('a forced internal error returns the errorResponse shape, not a crash', async () => {
    vi.spyOn(Schedule, 'find').mockRejectedValueOnce(new Error('secret driver detail'));

    const response = await get();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: 'Error interno del servidor' });
  });

  it('the 500 never leaks the underlying driver/Mongoose message', async () => {
    vi.spyOn(Schedule, 'find').mockRejectedValueOnce(new Error('secret driver detail'));

    const response = await get();
    const serialised = JSON.stringify(await response.json());

    expect(serialised).not.toContain('secret driver detail');
  });
});
