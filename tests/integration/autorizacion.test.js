import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

// Sesion de Clerk simulada. vi.hoisted porque vi.mock se eleva por encima de
// todo lo demas y necesita leer este objeto.
const session = vi.hoisted(() => ({ userId: null, email: null }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId }),
  clerkClient: async () => ({
    users: {
      getUser: async () => ({
        emailAddresses: [{ emailAddress: session.email }],
      }),
    },
  }),
}));

const signInAs = email => {
  session.userId = `user_${email}`;
  session.email = email;
};
const signOut = () => {
  session.userId = null;
  session.email = null;
};

// Del seed.
const OWNER = 'carlos.mesa@example.test'; // dueño del vendedor aprobado
const OTHER_SELLER = 'laura.gomez@example.test'; // otro vendedor
const BUYER = 'ana.restrepo@example.test'; // usuario sin perfil de vendedor

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
let Product;
let Seller;
let Schedule;
let ids;

describe('autorizacion en mutaciones', () => {
  beforeAll(async () => {
    // connectDB lee MONGO_URI al importarse, asi que hay que fijarla antes de
    // cargar los handlers, y con la misma cadena que ya uso startTestDb.
    process.env.MONGO_URI = await startTestDb();

    productRoute = await import('@/app/api/products/[id]/route.js');
    sellerRoute = await import('@/app/api/sellers/[id]/route.js');
    schedulesRoute = await import('@/app/api/schedules/route.js');
    ({ Product } = await import('@/utils/models/productSchema'));
    ({ Seller } = await import('@/utils/models/sellerSchema2'));
    ({ Schedule } = await import('@/utils/models/scheduleSchema'));
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
        { params: { id: OWNER } }
      );

      expect(response.status).toBe(403);
    });
  });

  // T-10b. La ruta reemplaza (borra e inserta) el horario completo del
  // sellerId que venga en el cuerpo, asi que sin comprobar propiedad
  // cualquiera con sesion podia vaciar el horario de un negocio ajeno.
  describe('POST /api/schedules', () => {
    // El seed deja 3 franjas por vendedor.
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
