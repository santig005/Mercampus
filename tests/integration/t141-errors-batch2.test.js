import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// T-141 (batch 2): every one of these used to answer a 500 with
// `error.message` (the driver's/Mongoose's raw text) echoed straight into the
// body, each in a slightly different shape. Migrated to errorResponse(), the
// same way batch 1 (tests/integration/schedules-error-handling.test.js) and
// GET /api/products/[id] (T-97/F29) already were.
const session = vi.hoisted(() => ({ userId: null, publicMetadata: {} }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId }),
  clerkClient: () => ({
    users: { getUser: async () => ({ publicMetadata: session.publicMetadata }) },
  }),
}));

const signInAs = clerkId => {
  session.userId = clerkId;
};
const signOut = () => {
  session.userId = null;
  session.publicMetadata = {};
};

const OWNER_CLERK_ID = 'user_seed_carlos'; // owns the approved seller
const BUYER_CLERK_ID = 'user_seed_ana'; // no seller profile

let usersRoute;
let sellerRoute;
let sellersRoute;
let productsRoute;
let availabilityRoute;
let User;
let Seller;
let Product;
let ids;

beforeAll(async () => {
  process.env.MONGO_URI = await startTestDb();
  usersRoute = await import('@/app/api/users/[id]/route.js');
  sellerRoute = await import('@/app/api/sellers/[id]/route.js');
  sellersRoute = await import('@/app/api/sellers/route.js');
  productsRoute = await import('@/app/api/products/route.js');
  availabilityRoute = await import('@/app/api/sellers/availability/route.js');
  ({ User } = await import('@/utils/models/userSchema'));
  ({ Seller } = await import('@/utils/models/sellerSchema'));
  ({ Product } = await import('@/utils/models/productSchema'));
}, 120_000);

afterAll(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  ({ ids } = await seedDatabase());
  signOut();
  process.env.CRON_SECRET = 'test-cron-secret';
});

afterEach(() => {
  vi.restoreAllMocks();
});

const notLeaked = body => {
  const serialised = JSON.stringify(body);
  expect(serialised).not.toContain('secret driver detail');
};

describe('GET /api/users/[id]', () => {
  const get = id =>
    usersRoute.GET(new Request(`http://localhost/api/users/${id}`), { params: { id } });

  it('200 by id on the happy path', async () => {
    const response = await get(ids.approvedOwner);

    expect(response.status).toBe(200);
    expect((await response.json()).user.clerkId).toBe(OWNER_CLERK_ID);
  });

  it('200 by email on the happy path', async () => {
    const response = await get('carlos.mesa@example.test');

    expect(response.status).toBe(200);
    expect((await response.json()).user.clerkId).toBe(OWNER_CLERK_ID);
  });

  it('a forced internal error returns the errorResponse shape, not a crash', async () => {
    vi.spyOn(User, 'findById').mockRejectedValueOnce(new Error('secret driver detail'));

    const response = await get(ids.approvedOwner);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Error interno del servidor' });
  });

  it('the 500 never leaks the underlying driver/Mongoose message', async () => {
    vi.spyOn(User, 'findById').mockRejectedValueOnce(new Error('secret driver detail'));

    const response = await get(ids.approvedOwner);
    notLeaked(await response.json());
  });
});

describe('PUT /api/sellers/[id]', () => {
  const put = (id, data) =>
    sellerRoute.PUT(
      new Request(`http://localhost/api/sellers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id } }
    );

  it('a forced internal error returns the errorResponse shape, not a crash', async () => {
    signInAs(OWNER_CLERK_ID);
    vi.spyOn(Seller, 'findByIdAndUpdate').mockRejectedValueOnce(
      new Error('secret driver detail')
    );

    const response = await put(ids.approvedSeller, { slogan: 'Nuevo eslogan' });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Error interno del servidor' });
  });

  it('the 500 never leaks the underlying driver/Mongoose message', async () => {
    signInAs(OWNER_CLERK_ID);
    vi.spyOn(Seller, 'findByIdAndUpdate').mockRejectedValueOnce(
      new Error('secret driver detail')
    );

    const response = await put(ids.approvedSeller, { slogan: 'Nuevo eslogan' });
    notLeaked(await response.json());
  });

  // The old catch answered `{ error: message }` for every status, 401/403
  // included - this checks that an AppError's own status still comes
  // through unchanged after the migration, not just the generic 500 case.
  it('still answers 401 (not a 500) without a session', async () => {
    const response = await put(ids.approvedSeller, { slogan: 'Nuevo eslogan' });

    expect(response.status).toBe(401);
  });
});

describe('GET /api/sellers', () => {
  const get = () => sellersRoute.GET(new Request('http://localhost/api/sellers'));

  it('a forced internal error returns the errorResponse shape, not a crash', async () => {
    vi.spyOn(Seller, 'find').mockRejectedValueOnce(new Error('secret driver detail'));

    const response = await get();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ message: 'Error interno del servidor' });
  });

  it('the 500 never leaks the underlying driver/Mongoose message', async () => {
    vi.spyOn(Seller, 'find').mockRejectedValueOnce(new Error('secret driver detail'));

    const response = await get();
    notLeaked(await response.json());
  });
});

describe('POST /api/sellers', () => {
  const post = data =>
    sellersRoute.POST(
      new Request('http://localhost/api/sellers', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'content-type': 'application/json' },
      })
    );
  const sellerValido = {
    businessName: 'Nuevo negocio',
    phoneNumber: '3001112233',
  };

  it('a forced internal error returns the errorResponse shape, not a crash', async () => {
    signInAs(BUYER_CLERK_ID);
    vi.spyOn(Seller.prototype, 'save').mockRejectedValueOnce(
      new Error('secret driver detail')
    );

    const response = await post(sellerValido);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ message: 'Error interno del servidor' });
  });

  it('the 500 never leaks the underlying driver/Mongoose message', async () => {
    signInAs(BUYER_CLERK_ID);
    vi.spyOn(Seller.prototype, 'save').mockRejectedValueOnce(
      new Error('secret driver detail')
    );

    const response = await post(sellerValido);
    notLeaked(await response.json());
  });
});

describe('POST /api/products', () => {
  const post = data =>
    productsRoute.POST(
      new Request('http://localhost/api/products', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'content-type': 'application/json' },
      })
    );
  const productoValido = {
    name: 'Arepa nueva T-141',
    price: 5000,
    description: 'Recién hecha',
    images: ['https://img.test/arepa.png'],
    category: ['Panadería'],
  };

  it('a forced internal error returns the errorResponse shape, not a crash', async () => {
    signInAs(OWNER_CLERK_ID);
    vi.spyOn(Product.prototype, 'save').mockRejectedValueOnce(
      new Error('secret driver detail')
    );

    const response = await post(productoValido);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ message: 'Error interno del servidor' });
  });

  it('the 500 never leaks the underlying driver/Mongoose message', async () => {
    signInAs(OWNER_CLERK_ID);
    vi.spyOn(Product.prototype, 'save').mockRejectedValueOnce(
      new Error('secret driver detail')
    );

    const response = await post(productoValido);
    notLeaked(await response.json());
  });
});

describe('GET /api/sellers/availability', () => {
  const get = () =>
    availabilityRoute.GET(
      new Request('http://localhost/api/sellers/availability', {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      })
    );

  it('a forced internal error returns the errorResponse shape, not a crash', async () => {
    vi.spyOn(Seller, 'find').mockRejectedValueOnce(new Error('secret driver detail'));

    const response = await get();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ message: 'Error interno del servidor' });
  });

  it('the 500 never leaks the underlying driver/Mongoose message', async () => {
    vi.spyOn(Seller, 'find').mockRejectedValueOnce(new Error('secret driver detail'));

    const response = await get();
    notLeaked(await response.json());
  });
});
