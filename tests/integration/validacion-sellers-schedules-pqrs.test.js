import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedDatabase } from '../../scripts/seed.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

const session = vi.hoisted(() => ({ email: null }));

// `POST /api/sellers` resuelve la sesión con currentUser(); `PUT
// /api/sellers/[id]` lo hace con auth() + clerkClient(). Las tres salen del
// mismo `session.email` para que un solo `session.email = OWNER` valga para
// cualquiera de las dos rutas.
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: async () =>
    session.email
      ? { id: `user_${session.email}`, emailAddresses: [{ emailAddress: session.email }] }
      : null,
  auth: async () => ({ userId: session.email ? `user_${session.email}` : null }),
  clerkClient: async () => ({
    users: {
      getUser: async () => ({
        emailAddresses: [{ emailAddress: session.email }],
      }),
    },
  }),
}));

const BUYER = 'ana.restrepo@example.test'; // sin sellerId, role: buyer
const OWNER = 'carlos.mesa@example.test'; // ya es vendedor

const post = body =>
  new Request('http://localhost/api', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

const put = body =>
  new Request('http://localhost/api', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

let sellersRoute;
let sellerByIdRoute;
let schedulesRoute;
let pqrsRoute;
let Seller;
let Schedule;
let User;
let Pqrs;
let ids;

// Una sola conexión para todo el archivo: stopTestDb() la cierra, así que si
// cada describe abre y cierra la suya, el segundo describe se queda sin base.
beforeAll(async () => {
  process.env.MONGO_URI = await startTestDb();
  sellersRoute = await import('@/app/api/sellers/route.js');
  sellerByIdRoute = await import('@/app/api/sellers/[id]/route.js');
  schedulesRoute = await import('@/app/api/schedules/route.js');
  pqrsRoute = await import('@/app/api/pqrs/route.js');
  ({ Seller } = await import('@/utils/models/sellerSchema2'));
  ({ Schedule } = await import('@/utils/models/scheduleSchema'));
  ({ User } = await import('@/utils/models/userSchema'));
  ({ Pqrs } = await import('@/utils/models/pqrsSchema'));
}, 120_000);

afterAll(async () => {
  await stopTestDb();
});

describe('POST /api/sellers · validación y registro', () => {
  beforeEach(async () => {
    ({ ids } = await seedDatabase());
    session.email = null;
  });

  it('401 sin sesión', async () => {
    const response = await sellersRoute.POST(post({ businessName: 'Nuevo negocio' }));
    expect(response.status).toBe(401);
  });

  it('404 si la sesión no tiene un User asociado', async () => {
    session.email = 'nadie@example.test';

    const response = await sellersRoute.POST(post({ businessName: 'Nuevo negocio' }));

    expect(response.status).toBe(404);
  });

  it('400 si falta el nombre del negocio', async () => {
    session.email = BUYER;

    const response = await sellersRoute.POST(post({ phoneNumber: 3000000000 }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.fields.map(f => f.field)).toContain('businessName');
  });

  it('400 si el teléfono está incompleto', async () => {
    session.email = BUYER;

    const response = await sellersRoute.POST(
      post({ businessName: 'Arepas Ana', phoneNumber: '300-000' })
    );

    expect(response.status).toBe(400);
  });

  it('no deja que el cliente se autoapruebe al crearse', async () => {
    session.email = BUYER;

    const response = await sellersRoute.POST(
      post({
        businessName: 'Postres Ana',
        phoneNumber: 3000000001,
        approved: true, // no está declarado en el schema
      })
    );

    expect(response.status).toBe(201);
    const { seller } = await response.json();
    expect((await Seller.findById(seller._id)).approved).toBe(false);
  });

  it('201 con un payload válido: crea el Seller y actualiza el User', async () => {
    session.email = BUYER;

    const response = await sellersRoute.POST(
      post({
        businessName: 'Postres Ana',
        phoneNumber: 3000000002,
        university: 'Universidad Nacional',
      })
    );

    expect(response.status).toBe(201);
    const { seller } = await response.json();

    const created = await Seller.findById(seller._id);
    expect(created.businessName).toBe('Postres Ana');
    expect(created.university).toBe('Universidad Nacional');

    const buyer = await User.findOne({ email: BUYER });
    expect(buyer.role).toBe('seller');
    expect(buyer.sellerId.toString()).toBe(seller._id.toString());
  });
});

// T-13c. Los formularios mandan el teléfono como string y el schema pedía
// `z.number()`, así que el alta de vendedor respondía 400 siempre. Estos casos
// usan el payload que construyen las páginas de verdad, no uno escrito a mano
// con un number: por eso los tests de T-13b no atraparon el bug.
describe('teléfono del vendedor · el payload real del formulario', () => {
  beforeEach(async () => {
    ({ ids } = await seedDatabase());
    session.email = null;
  });

  it('201 con el string de digitos que manda el alta de vendedor', async () => {
    session.email = BUYER;

    const response = await sellersRoute.POST(
      post({ businessName: 'Postres Ana', phoneNumber: '3001234567' })
    );

    expect(response.status).toBe(201);
    const { seller } = await response.json();

    const created = await Seller.findById(seller._id);
    expect(created.phoneNumber).toBe(3001234567);
    expect(typeof created.phoneNumber).toBe('number');
  });

  it('descarta el indicativo de pais al crear', async () => {
    session.email = BUYER;

    const response = await sellersRoute.POST(
      post({ businessName: 'Postres Ana', phoneNumber: '+57 300 123 4567' })
    );

    expect(response.status).toBe(201);
    const { seller } = await response.json();
    expect((await Seller.findById(seller._id)).phoneNumber).toBe(3001234567);
  });

  it('200 con el telefono ya formateado que manda la edicion de perfil', async () => {
    session.email = OWNER;

    const response = await sellerByIdRoute.PUT(
      put({ phoneNumber: '(300) 765-4321' }),
      { params: { id: ids.approvedSeller } }
    );

    expect(response.status).toBe(200);
    const seller = await Seller.findById(ids.approvedSeller);
    expect(seller.phoneNumber).toBe(3007654321);
    expect(typeof seller.phoneNumber).toBe('number');
  });

  it('400 si el telefono no llega a 10 digitos, y no crea nada', async () => {
    session.email = BUYER;
    const antes = await Seller.countDocuments();

    const response = await sellersRoute.POST(
      post({ businessName: 'Postres Ana', phoneNumber: '300 12' })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.fields.map(f => f.field)).toContain('phoneNumber');
    expect(await Seller.countDocuments()).toBe(antes);
  });

  it('400 si el telefono empieza por cero', async () => {
    // Se guarda como Number: '0300123456' se convertiria en 300123456 y
    // perderia un digito sin que nadie se entere.
    session.email = BUYER;

    const response = await sellersRoute.POST(
      post({ businessName: 'Postres Ana', phoneNumber: '0300123456' })
    );

    expect(response.status).toBe(400);
  });
});

describe('POST /api/schedules · reemplazo de horario', () => {
  beforeEach(async () => {
    ({ ids } = await seedDatabase());
    // Desde T-10b la ruta exige sesión y propiedad. Estos casos son sobre la
    // validación del cuerpo, así que entran ya como el dueño del vendedor; el
    // 401 y el 403 se comprueban en `autorizacion.test.js`.
    session.email = OWNER;
  });

  it('400 si sellerId no es un ObjectId', async () => {
    const response = await schedulesRoute.POST(
      post({ sellerId: 'no-es-un-id', schedules: [] })
    );

    expect(response.status).toBe(400);
  });

  it('400 si el día no es uno de los nombres válidos, en vez de guardar day: 0', async () => {
    const response = await schedulesRoute.POST(
      post({
        sellerId: ids.approvedSeller,
        schedules: [{ day: 'Lunfardo', startTime: '08:00', endTime: '10:00' }],
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.fields.map(f => f.field)).toContain('schedules.0.day');
  });

  it('400 si la hora no tiene formato HH:MM', async () => {
    const response = await schedulesRoute.POST(
      post({
        sellerId: ids.approvedSeller,
        schedules: [{ day: 'Lunes', startTime: '8am', endTime: '10:00' }],
      })
    );

    expect(response.status).toBe(400);
  });

  it('200 con un payload válido: reemplaza el horario completo', async () => {
    const antes = await Schedule.countDocuments({ sellerId: ids.approvedSeller });
    expect(antes).toBeGreaterThan(0); // el seed ya sembró horarios

    const response = await schedulesRoute.POST(
      post({
        sellerId: ids.approvedSeller,
        schedules: [{ day: 'Martes', startTime: '09:00', endTime: '17:00' }],
      })
    );

    expect(response.status).toBe(200);
    const schedules = await Schedule.find({ sellerId: ids.approvedSeller });
    expect(schedules).toHaveLength(1);
    expect(schedules[0].day).toBe(2); // Martes = indice 2 en daysES
  });

  it('un array vacío borra el horario del vendedor', async () => {
    const response = await schedulesRoute.POST(
      post({ sellerId: ids.approvedSeller, schedules: [] })
    );

    expect(response.status).toBe(200);
    expect(await Schedule.countDocuments({ sellerId: ids.approvedSeller })).toBe(0);
  });
});

describe('POST /api/pqrs · validación', () => {
  beforeEach(async () => {
    await Pqrs.deleteMany({});
  });

  it('400 si falta la descripción', async () => {
    const response = await pqrsRoute.POST(post({ type: 'Queja', email: '' }));

    expect(response.status).toBe(400);
    expect(await Pqrs.countDocuments()).toBe(0);
  });

  it('400 si el tipo no es uno de los válidos', async () => {
    const response = await pqrsRoute.POST(
      post({ type: 'Denuncia', description: 'algo', email: '' })
    );

    expect(response.status).toBe(400);
  });

  it('400 si el email no está vacío pero tampoco es válido', async () => {
    const response = await pqrsRoute.POST(
      post({ type: 'Queja', description: 'algo', email: 'no-es-un-email' })
    );

    expect(response.status).toBe(400);
  });

  it('201 y status HTTP real (no solo en el cuerpo) con un envío anónimo válido', async () => {
    const response = await pqrsRoute.POST(
      post({ type: 'Sugerencia', description: 'Pongan más opciones veganas', email: '' })
    );

    // El handler original devolvía NextResponse.json({ status: 201 }) sin
    // segundo argumento: el status HTTP real quedaba en 200 y el 201 era solo
    // un campo suelto en el cuerpo de la respuesta.
    expect(response.status).toBe(201);
    expect(await Pqrs.countDocuments()).toBe(1);
  });
});
