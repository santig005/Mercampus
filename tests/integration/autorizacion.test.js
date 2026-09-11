import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// A stubbed Clerk session. vi.hoisted because vi.mock is hoisted above
// everything else and needs to read this object.
//
// Since T-12c only `auth()` is needed: identity is resolved from the
// clerkId the token already carries. clerkClient() had to be stubbed too,
// because every mutation used to ask Clerk's Backend API for the email.
//
// T-104: `publicMetadata` is stubbed too, because admin-ness is now read from
// Clerk (the source of truth T-12 chose) instead of from Mongo's `role`.
const session = vi.hoisted(() => ({ userId: null, publicMetadata: {} }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId }),
  clerkClient: () => ({
    users: {
      getUser: async id => {
        if (id !== session.userId) {
          throw new Error(`getUser called with ${id}, not the session's id.`);
        }
        return { publicMetadata: session.publicMetadata };
      },
    },
  }),
}));

const signInAs = (usuario, { admin = false } = {}) => {
  session.userId = usuario.clerkId;
  session.publicMetadata = admin ? { role: 'admin' } : {};
};
const signOut = () => {
  session.userId = null;
  session.publicMetadata = {};
};

// From the seed.
const OWNER = {
  clerkId: 'user_seed_carlos',
  email: 'carlos.mesa@example.test',
}; // owner of the approved seller
const OTHER_SELLER = {
  clerkId: 'user_seed_laura',
  email: 'laura.gomez@example.test',
}; // a different seller
const BUYER = {
  clerkId: 'user_seed_ana',
  email: 'ana.restrepo@example.test',
}; // a user with no seller profile

const jsonRequest = body =>
  new Request('http://localhost/api', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

const postRequest = body =>
  new Request('http://localhost/api', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

let productRoute;
let sellerRoute;
let schedulesRoute;
let productsRoute;
let Product;
let Seller;
let Schedule;
let User;
let ids;

describe('autorizacion en mutaciones', () => {
  beforeAll(async () => {
    // connectDB reads MONGO_URI when imported, so it has to be set before
    // loading the handlers, and with the same string startTestDb used.
    process.env.MONGO_URI = await startTestDb();

    productRoute = await import('@/app/api/products/[id]/route.js');
    sellerRoute = await import('@/app/api/sellers/[id]/route.js');
    schedulesRoute = await import('@/app/api/schedules/route.js');
    productsRoute = await import('@/app/api/products/route.js');
    ({ Product } = await import('@/utils/models/productSchema'));
    ({ Seller } = await import('@/utils/models/sellerSchema2'));
    ({ Schedule } = await import('@/utils/models/scheduleSchema'));
    ({ User } = await import('@/utils/models/userSchema'));
  }, 120_000);

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    ({ ids } = await seedDatabase());
    signOut();
  });

  describe('PUT /api/products/[id]', () => {
    it('401 sin sesion, y no toca el producto', async () => {
      const response = await productRoute.PUT(jsonRequest({ name: 'Hackeado' }), {
        params: { id: ids.approvedProduct },
      });

      expect(response.status).toBe(401);
      const product = await Product.findById(ids.approvedProduct);
      expect(product.name).toBe('Arepa de queso');
    });

    it('403 con la sesion de otro vendedor, y no toca el producto', async () => {
      signInAs(OTHER_SELLER);

      const response = await productRoute.PUT(jsonRequest({ name: 'Hackeado' }), {
        params: { id: ids.approvedProduct },
      });

      expect(response.status).toBe(403);
      const product = await Product.findById(ids.approvedProduct);
      expect(product.name).toBe('Arepa de queso');
    });

    it('403 con un comprador sin perfil de vendedor', async () => {
      signInAs(BUYER);

      const response = await productRoute.PUT(jsonRequest({ name: 'Hackeado' }), {
        params: { id: ids.approvedProduct },
      });

      expect(response.status).toBe(403);
    });

    it('200 con el dueño, y el cambio se aplica', async () => {
      signInAs(OWNER);

      const response = await productRoute.PUT(
        jsonRequest({ name: 'Arepa de queso y jamón' }),
        { params: { id: ids.approvedProduct } }
      );

      expect(response.status).toBe(200);
      const product = await Product.findById(ids.approvedProduct);
      expect(product.name).toBe('Arepa de queso y jamón');
    });
  });

  describe('DELETE /api/products/[id]', () => {
    it('401 sin sesion, y el producto sigue existiendo', async () => {
      const response = await productRoute.DELETE(new Request('http://localhost/api'), {
        params: { id: ids.approvedProduct },
      });

      expect(response.status).toBe(401);
      expect(await Product.findById(ids.approvedProduct)).not.toBeNull();
    });

    it('403 con la sesion de otro vendedor, y el producto sigue existiendo', async () => {
      signInAs(OTHER_SELLER);

      const response = await productRoute.DELETE(new Request('http://localhost/api'), {
        params: { id: ids.approvedProduct },
      });

      expect(response.status).toBe(403);
      expect(await Product.findById(ids.approvedProduct)).not.toBeNull();
    });

    it('200 con el dueño, y el producto desaparece', async () => {
      signInAs(OWNER);

      const response = await productRoute.DELETE(new Request('http://localhost/api'), {
        params: { id: ids.approvedProduct },
      });

      expect(response.status).toBe(200);
      expect(await Product.findById(ids.approvedProduct)).toBeNull();
    });
  });

  describe('PUT /api/sellers/[id]', () => {
    it('401 sin sesion, y no toca el vendedor', async () => {
      const response = await sellerRoute.PUT(
        jsonRequest({ businessName: 'Robado' }),
        { params: { id: ids.approvedSeller } }
      );

      expect(response.status).toBe(401);
      const seller = await Seller.findById(ids.approvedSeller);
      expect(seller.businessName).toBe('Arepas El Parche');
    });

    it('403 con la sesion de otro vendedor, y no toca el vendedor', async () => {
      signInAs(OTHER_SELLER);

      const response = await sellerRoute.PUT(
        jsonRequest({ businessName: 'Robado' }),
        { params: { id: ids.approvedSeller } }
      );

      expect(response.status).toBe(403);
      const seller = await Seller.findById(ids.approvedSeller);
      expect(seller.businessName).toBe('Arepas El Parche');
    });

    it('200 con el dueño, y el cambio se aplica', async () => {
      signInAs(OWNER);

      const response = await sellerRoute.PUT(
        jsonRequest({ slogan: 'Recién hechas' }),
        { params: { id: ids.approvedSeller } }
      );

      expect(response.status).toBe(200);
      const seller = await Seller.findById(ids.approvedSeller);
      expect(seller.slogan).toBe('Recién hechas');
    });

    it('403 al editar por email ajeno', async () => {
      signInAs(OTHER_SELLER);

      const response = await sellerRoute.PUT(
        jsonRequest({ businessName: 'Robado' }),
        { params: { id: OWNER.email } }
      );

      expect(response.status).toBe(403);
    });

    it('200 al editarse a sí mismo por email', async () => {
      signInAs(OWNER);

      const response = await sellerRoute.PUT(
        jsonRequest({ slogan: 'Con mi propio email' }),
        { params: { id: OWNER.email } }
      );

      expect(response.status).toBe(200);
      expect((await Seller.findById(ids.approvedSeller)).slogan).toBe(
        'Con mi propio email'
      );
    });

    // T-104. These two are the whole point of the task: they pin *which*
    // store the admin exception is read from. This route is the only gate on
    // approving a seller - it does not match the middleware's
    // `/api/(.*)/admin(.*)`, so nothing else checks admin-ness here.
    it('lets an admin edit a seller they do not own', async () => {
      // A buyer with no seller profile at all: the only thing authorising
      // this is the admin role in Clerk.
      signInAs(BUYER, { admin: true });

      const response = await sellerRoute.PUT(
        jsonRequest({ slogan: 'Aprobado por un admin' }),
        { params: { id: ids.approvedSeller } }
      );

      expect(response.status).toBe(200);
      expect((await Seller.findById(ids.approvedSeller)).slogan).toBe(
        'Aprobado por un admin'
      );
    });

    it('refuses a Mongo-only admin whose Clerk account has no role', async () => {
      // The exact shape of the T-104 incident: the `role: admin` field sits in
      // Mongo (here, on the session's own User) and Clerk knows nothing about
      // it. Before T-104 this returned 200 - Mongo's field was what the gate
      // read, so a stray document could grant or deny admin on its own.
      await User.findOneAndUpdate({ clerkId: BUYER.clerkId }, { role: 'admin' });
      signInAs(BUYER);

      const response = await sellerRoute.PUT(
        jsonRequest({ slogan: 'Robado' }),
        { params: { id: ids.approvedSeller } }
      );

      expect(response.status).toBe(403);
      expect((await Seller.findById(ids.approvedSeller)).slogan).not.toBe(
        'Robado'
      );
    });
  });

  // T-12c. This route had no test at all and got two things wrong: the whole
  // body lived inside an `if (clerkUser)` with no `else`, so a request
  // without a session left the handler **returning no Response at all**
  // (checked by calling it: it returned `undefined`, i.e. a framework error
  // rather than a 401); and `user._id` on a user missing from Mongo blew up
  // with a TypeError before ever reaching the seller check.
  describe('POST /api/products', () => {
    const productoValido = {
      name: 'Arepa nueva',
      price: 5000,
      description: 'Recién hecha',
      images: ['https://img.test/arepa.png'],
      category: ['Panadería'],
    };

    it('401 sin sesion, y no crea el producto', async () => {
      const antes = await Product.countDocuments();

      const response = await productsRoute.POST(postRequest(productoValido));

      expect(response.status).toBe(401);
      expect(await Product.countDocuments()).toBe(antes);
    });

    it('403 con un comprador sin perfil de vendedor', async () => {
      signInAs(BUYER);
      const antes = await Product.countDocuments();

      const response = await productsRoute.POST(postRequest(productoValido));

      expect(response.status).toBe(403);
      expect(await Product.countDocuments()).toBe(antes);
    });

    it('201 con un vendedor, y el producto queda a su nombre', async () => {
      signInAs(OWNER);

      const response = await productsRoute.POST(postRequest(productoValido));

      expect(response.status).toBe(201);
      const creado = await Product.findOne({ name: 'Arepa nueva' });
      expect(creado.sellerId.toString()).toBe(ids.approvedSeller);
    });
  });

  // T-10b. The route replaces (deletes and re-inserts) the entire schedule of
  // whatever sellerId arrives in the body, so without an ownership check
  // anyone with a session could wipe another business's schedule.
  describe('POST /api/schedules', () => {
    // The seed leaves 3 slots per seller.
    const HORARIO_SEMBRADO = 3;

    const reemplazo = sellerId =>
      postRequest({
        sellerId,
        schedules: [{ day: 'Martes', startTime: '09:00', endTime: '13:00' }],
      });

    const vaciado = sellerId => postRequest({ sellerId, schedules: [] });

    it('401 sin sesion, y el horario sigue intacto', async () => {
      const response = await schedulesRoute.POST(reemplazo(ids.approvedSeller));

      expect(response.status).toBe(401);
      expect(
        await Schedule.countDocuments({ sellerId: ids.approvedSeller })
      ).toBe(HORARIO_SEMBRADO);
    });

    it('403 con la sesion de otro vendedor, y el horario sigue intacto', async () => {
      signInAs(OTHER_SELLER);

      const response = await schedulesRoute.POST(reemplazo(ids.approvedSeller));

      expect(response.status).toBe(403);
      expect(
        await Schedule.countDocuments({ sellerId: ids.approvedSeller })
      ).toBe(HORARIO_SEMBRADO);
    });

    it('403 con un comprador sin perfil de vendedor', async () => {
      signInAs(BUYER);

      const response = await schedulesRoute.POST(reemplazo(ids.approvedSeller));

      expect(response.status).toBe(403);
      expect(
        await Schedule.countDocuments({ sellerId: ids.approvedSeller })
      ).toBe(HORARIO_SEMBRADO);
    });

    it('no deja vaciar el horario de un vendedor ajeno', async () => {
      signInAs(OTHER_SELLER);

      const response = await schedulesRoute.POST(vaciado(ids.approvedSeller));

      expect(response.status).toBe(403);
      expect(
        await Schedule.countDocuments({ sellerId: ids.approvedSeller })
      ).toBe(HORARIO_SEMBRADO);
    });

    it('200 con el dueño, y el horario se reemplaza', async () => {
      signInAs(OWNER);

      const response = await schedulesRoute.POST(reemplazo(ids.approvedSeller));

      expect(response.status).toBe(200);
      const schedules = await Schedule.find({ sellerId: ids.approvedSeller });
      expect(schedules).toHaveLength(1);
      expect(schedules[0].day).toBe(2); // Martes
      expect(schedules[0].startTime).toBe('09:00');
    });

    it('el dueño no toca el horario del otro vendedor', async () => {
      signInAs(OWNER);

      await schedulesRoute.POST(reemplazo(ids.approvedSeller));

      expect(
        await Schedule.countDocuments({ sellerId: ids.pendingSeller })
      ).toBe(HORARIO_SEMBRADO);
    });
  });
});
