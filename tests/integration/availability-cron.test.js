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

// Del seed: vendedor aprobado con horario lunes/miercoles 08:00-16:00 y
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

  it('sin Authorization responde 401 y no toca ningun Seller', async () => {
    const spy = vi.spyOn(Seller, 'findByIdAndUpdate');

    const response = await availabilityRoute.GET(request());

    expect(response.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it('con el secreto equivocado responde 401 y no toca ningun Seller', async () => {
    const spy = vi.spyOn(Seller, 'findByIdAndUpdate');

    const response = await availabilityRoute.GET(request('Bearer secreto-invalido'));

    expect(response.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it('sin CRON_SECRET configurado responde 401 aunque manden algo', async () => {
    const original = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    const response = await availabilityRoute.GET(request('Bearer undefined'));
    expect(response.status).toBe(401);

    process.env.CRON_SECRET = original;
  });

  it('marca disponible al vendedor sembrado dentro de su horario (lunes 10am Bogota)', async () => {
    // Se fuerza a false primero: si el test pasara igual sin que la ruta
    // hiciera nada, no probaria lo que dice probar (el default del schema ya
    // es true).
    await Seller.findByIdAndUpdate(ids.approvedSeller, { availability: false });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T15:00:00.000Z')); // lunes 10:00 en Bogota (UTC-5)

    const response = await availabilityRoute.GET(request(`Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);

    const seller = await Seller.findById(ids.approvedSeller);
    expect(seller.availability).toBe(true);
  });

  it('marca no disponible al vendedor sembrado fuera de su horario (lunes 8pm Bogota)', async () => {
    vi.useFakeTimers();
    // 2024-01-02T01:00 UTC es 2024-01-01 20:00 en Bogota: sigue siendo lunes
    // en hora local aunque el dia UTC ya cambio - confirma que la conversion
    // de zona horaria, no solo la de hora, esta bien.
    vi.setSystemTime(new Date('2024-01-02T01:00:00.000Z'));

    const response = await availabilityRoute.GET(request(`Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);

    const seller = await Seller.findById(ids.approvedSeller);
    expect(seller.availability).toBe(false);
  });
});
