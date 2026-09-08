import { Webhook } from 'svix';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { startTestDb, stopTestDb } from '../setup.js';

// A toy secret in the format svix requires (whsec_ + base64). It is not a
// real secret: it is generated here and only lives for the test.
const WEBHOOK_SECRET = `whsec_${Buffer.from('mercampus-test-secret-32bytes!!').toString('base64')}`;

// The handler reads the headers with next/headers' headers() rather than
// req.headers, so they have to be handed over that way.
const cabeceras = vi.hoisted(() => ({ actuales: new Map() }));

vi.mock('next/headers', () => ({
  headers: () => ({ get: name => cabeceras.actuales.get(name) ?? null }),
}));

let webhookRoute;
let User;

/** Signs the body the way Clerk would and builds the request. */
const eventoDeClerk = (payload, { firmaValida = true } = {}) => {
  const body = JSON.stringify(payload);
  const id = 'msg_2test';
  const timestamp = new Date();

  const firma = new Webhook(WEBHOOK_SECRET).sign(id, timestamp, body);

  cabeceras.actuales = new Map([
    ['svix-id', id],
    ['svix-timestamp', String(Math.floor(timestamp.getTime() / 1000))],
    ['svix-signature', firmaValida ? firma : 'v1,firmaInventada'],
  ]);

  return new Request('http://localhost/api/webhooks', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json' },
  });
};

const usuarioCreado = (id, email, extra = {}) => ({
  type: 'user.created',
  data: {
    id,
    first_name: 'Ana',
    last_name: 'Restrepo',
    email_addresses: [{ email_address: email }],
    image_url: 'https://img.test/ana.png',
    ...extra,
  },
});

beforeAll(async () => {
  process.env.MONGO_URI = await startTestDb();
  process.env.WEBHOOK_SECRET = WEBHOOK_SECRET;

  webhookRoute = await import('@/app/api/webhooks/route.js');
  ({ User } = await import('@/utils/models/userSchema'));
}, 120_000);

afterAll(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('POST /api/webhooks · alta de usuarios desde Clerk', () => {
  it('crea el usuario, con su clerkId', async () => {
    const response = await webhookRoute.POST(
      eventoDeClerk(usuarioCreado('user_2abc', 'ana@example.test'))
    );

    expect(response.status).toBe(200);

    const user = await User.findOne({ clerkId: 'user_2abc' });
    expect(user).not.toBeNull();
    expect(user.email).toBe('ana@example.test');
    expect(user.name).toBe('Ana');
    expect(user.role).toBe('buyer'); // el rol lo pone el schema, no Clerk
  });

  it('un segundo evento del mismo usuario actualiza en vez de duplicar', async () => {
    await webhookRoute.POST(
      eventoDeClerk(usuarioCreado('user_2abc', 'ana@example.test'))
    );
    await webhookRoute.POST(
      eventoDeClerk({
        ...usuarioCreado('user_2abc', 'ana@example.test'),
        type: 'user.updated',
        data: {
          ...usuarioCreado('user_2abc', 'ana@example.test').data,
          first_name: 'Anita',
        },
      })
    );

    expect(await User.countDocuments()).toBe(1);
    expect((await User.findOne({ clerkId: 'user_2abc' })).name).toBe('Anita');
  });

  it('si el usuario cambia de email en Clerk, sigue siendo el mismo documento', async () => {
    // This is the reason for joining by clerkId and not by email: email changes.
    await webhookRoute.POST(
      eventoDeClerk(usuarioCreado('user_2abc', 'ana@example.test'))
    );
    const antes = await User.findOne({ clerkId: 'user_2abc' });

    await webhookRoute.POST(
      eventoDeClerk({
        ...usuarioCreado('user_2abc', 'ana.nueva@example.test'),
        type: 'user.updated',
      })
    );

    expect(await User.countDocuments()).toBe(1);
    const despues = await User.findOne({ clerkId: 'user_2abc' });
    expect(despues._id.toString()).toBe(antes._id.toString());
    expect(despues.email).toBe('ana.nueva@example.test');
  });

  it('dos usuarios distintos de Clerk son dos documentos, aunque compartan email', async () => {
    // Email is not unique in this database (the unique is still commented out,
    // T-11), so joining by email could merge two accounts. By clerkId it can't.
    await webhookRoute.POST(
      eventoDeClerk(usuarioCreado('user_2abc', 'compartido@example.test'))
    );
    await webhookRoute.POST(
      eventoDeClerk(usuarioCreado('user_2xyz', 'compartido@example.test'))
    );

    expect(await User.countDocuments()).toBe(2);
  });

  it('rellena el nombre cuando Clerk no lo manda, que es lo normal al registrarse por email', async () => {
    const response = await webhookRoute.POST(
      eventoDeClerk(
        usuarioCreado('user_2sinnombre', 'sinnombre@example.test', {
          first_name: null,
          last_name: null,
        })
      )
    );

    expect(response.status).toBe(200);
    // `name` is required by the schema: with no fallback it would go in as null.
    expect((await User.findOne({ clerkId: 'user_2sinnombre' })).name).toBe(
      'sinnombre'
    );
  });

  it('borra el usuario en user.deleted', async () => {
    await webhookRoute.POST(
      eventoDeClerk(usuarioCreado('user_2abc', 'ana@example.test'))
    );

    const response = await webhookRoute.POST(
      eventoDeClerk({ type: 'user.deleted', data: { id: 'user_2abc' } })
    );

    expect(response.status).toBe(200);
    expect(await User.countDocuments()).toBe(0);
  });

  it('400 y no toca la base si la firma no es válida', async () => {
    const response = await webhookRoute.POST(
      eventoDeClerk(usuarioCreado('user_2abc', 'ana@example.test'), {
        firmaValida: false,
      })
    );

    expect(response.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
  });

  it('400 si el evento no trae email, en vez de responder 200 sin crear nada', async () => {
    // El try/catch de createOrUpdateUser se tragaba cualquier fallo y el
    // webhook answered 200: Clerk considered the event delivered and never
    // retried it.
    const response = await webhookRoute.POST(
      eventoDeClerk({
        type: 'user.created',
        data: { id: 'user_2vacio', email_addresses: [] },
      })
    );

    expect(response.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
  });
});
