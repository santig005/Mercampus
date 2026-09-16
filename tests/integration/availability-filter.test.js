import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

import { Product } from '@/utils/models/productSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Seller } from '@/utils/models/sellerSchema2';
import { User } from '@/utils/models/userSchema';

// T-123: the listing filtered by the T-122 badge's rule, in the Mongo query,
// across cursor pages.
//
// Fixtures, at Monday 20:00 in Bogotá:
// - the seed's seller (Mon/Wed 08-16, Fri 10-18) is closed: "Arepa de queso"
//   and "Buñuelo" are switched on but unavailable, "Jugo de mango" is off;
// - an open-all-day seller: "Empanada abierta" on, "Pan apagado" off;
// - a seller with no schedule: "Tinto sin horario" on - available, by the
//   human's call;
// - a seller whose only slot has the legacy day: 0 - no valid schedule, so
//   "Chocolate legado" is available too, exactly as its badge says.
const MONDAY_8PM = new Date('2024-01-02T01:00:00.000Z');
const MONDAY_10AM = new Date('2024-01-01T15:00:00.000Z');

// Newest first within each block (fixtures are created after the seed, in
// this order).
const AVAILABLE_ORDER = ['Chocolate legado', 'Tinto sin horario', 'Empanada abierta'];
const UNAVAILABLE_ORDER = ['Pan apagado', 'Jugo de mango', 'Buñuelo', 'Arepa de queso'];

let productsRoute;

const get = query =>
  productsRoute.GET(new Request(`http://localhost/api/products?${query}`));

const collectPages = async (query, limit) => {
  const products = [];
  let cursor = '';

  for (let i = 0; i < 20; i++) {
    const response = await get(
      `section=antojos&${query}&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    products.push(...body.products);
    if (!body.nextCursor) break;
    cursor = body.nextCursor;
  }

  return products;
};

const names = products => products.map(p => p.name);

const product = (name, price, sellerId, availability) => ({
  name,
  price,
  description: 'Producto de prueba para el filtro de disponibilidad.',
  images: ['https://ik.imagekit.io/seed/filtro.jpg'],
  section: 'antojos',
  category: ['Otros'],
  sellerId,
  availability,
});

describe('GET /api/products · availability filter (T-123)', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
    productsRoute = await import('@/app/api/products/route.js');
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await seedDatabase();

    const owners = await User.create(
      ['open', 'unscheduled', 'legacy'].map(key => ({
        clerkId: `user_t123_${key}`,
        name: key,
        lastName: 'Fixture',
        email: `${key}@example.test`,
        role: 'seller',
      }))
    );
    const [open, unscheduled, legacy] = await Seller.create(
      owners.map((owner, i) => ({
        businessName: `Vendedor T-123 ${i + 1}`,
        phoneNumber: 3000000000 + i,
        userId: owner._id,
        approved: true,
      }))
    );

    await Schedule.create([
      ...[1, 2, 3, 4, 5, 6, 7].map(day => ({
        sellerId: open._id,
        day,
        startTime: '00:00',
        endTime: '23:59',
      })),
      { sellerId: legacy._id, day: 0, startTime: '08:00', endTime: '22:00' },
    ]);

    // One at a time, so createdAt and _id follow this order.
    await Product.create(product('Empanada abierta', 3500, open._id, true));
    await Product.create(product('Pan apagado', 2000, open._id, false));
    await Product.create(product('Tinto sin horario', 1500, unscheduled._id, true));
    await Product.create(product('Chocolate legado', 4000, legacy._id, true));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Only Date is faked: the Mongo driver's own timers have to keep running.
  const at = date => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(date);
  };

  it('"available" lists products switched on whose seller is open or has no schedule', async () => {
    at(MONDAY_8PM);

    expect(names(await collectPages('availability=available', 12))).toEqual(
      AVAILABLE_ORDER
    );
  });

  it('"unavailable" lists the rest: switched off, or the store is closed', async () => {
    at(MONDAY_8PM);

    expect(names(await collectPages('availability=unavailable', 12))).toEqual(
      UNAVAILABLE_ORDER
    );
  });

  it('the block a product is listed in agrees with its badge', async () => {
    at(MONDAY_8PM);

    const available = await collectPages('availability=available', 12);
    const unavailable = await collectPages('availability=unavailable', 12);

    for (const p of available) {
      expect(['available', 'no-schedule']).toContain(p.availabilityStatus.state);
    }
    for (const p of unavailable) {
      expect(['closed', 'off']).toContain(p.availabilityStatus.state);
    }
  });

  it('with both selected, "Recomendado" is available first across every page size', async () => {
    at(MONDAY_8PM);

    // 1, 2 and 3 put the boundary between the blocks at a different spot in a
    // page each time, including exactly at the end of one.
    for (const limit of [1, 2, 3, 12]) {
      expect(names(await collectPages('', limit))).toEqual([
        ...AVAILABLE_ORDER,
        ...UNAVAILABLE_ORDER,
      ]);
    }
  });

  it('"load more" on a filtered listing neither repeats nor skips', async () => {
    at(MONDAY_8PM);

    expect(names(await collectPages('availability=available', 1))).toEqual(
      AVAILABLE_ORDER
    );
    expect(names(await collectPages('availability=unavailable', 2))).toEqual(
      UNAVAILABLE_ORDER
    );
  });

  it('a price sort pages through a filtered listing in price order', async () => {
    at(MONDAY_8PM);

    expect(
      names(await collectPages('availability=available&sort=price_asc', 1))
    ).toEqual(['Tinto sin horario', 'Empanada abierta', 'Chocolate legado']);
  });

  it('when a store opens, its products move into the available block', async () => {
    at(MONDAY_10AM);

    expect(names(await collectPages('availability=available', 12))).toEqual(
      expect.arrayContaining(['Arepa de queso', 'Buñuelo'])
    );
    expect(names(await collectPages('availability=unavailable', 12))).toEqual([
      'Pan apagado',
      'Jugo de mango',
    ]);
  });

  // T-83. The ROADMAP note next to T-123 says the override "must count as
  // open under whatever definition this lands" - this is that promise, at
  // the level of the filter rather than just the per-product badge.
  it('an active override moves a closed seller\'s products into the available block', async () => {
    at(MONDAY_8PM);

    const closedSellerId = (
      await Product.findOne({ name: 'Arepa de queso' })
    ).sellerId;
    await Seller.findByIdAndUpdate(closedSellerId, {
      availabilityOverrideUntil: new Date(MONDAY_8PM.getTime() + 60 * 60 * 1000),
    });

    const available = names(await collectPages('availability=available', 20));
    expect(available).toEqual(expect.arrayContaining(['Arepa de queso']));
    // The switched-off product of the same, now-overridden seller stays put.
    expect(available).not.toContain('Jugo de mango');
  });

  it('a cursor made under one filter is rejected under another', async () => {
    at(MONDAY_8PM);

    const first = await (
      await get('section=antojos&availability=available&limit=1')
    ).json();

    const both = await get(`section=antojos&limit=1&cursor=${first.nextCursor}`);
    const other = await get(
      `section=antojos&availability=unavailable&limit=1&cursor=${first.nextCursor}`
    );

    expect(both.status).toBe(400);
    expect(other.status).toBe(400);
  });

  it('an unknown availability value is a 400, not an unfiltered listing', async () => {
    expect((await get('section=antojos&availability=abiertos')).status).toBe(400);
  });
});
