import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { backfillClerkIds } from '../../scripts/backfill-clerk-id.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

const session = vi.hoisted(() => ({ userId: null }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId }),
}));

let User;
let sellersRoute;

/** Clerk de mentira: un mapa de email a los ids que tendria esa cuenta. */
const clerkCon = mapa => async email => mapa[email] ?? [];

const crearUsuario = (email, extra = {}) =>
  User.create({ name: 'Alguien', email, ...extra });

beforeAll(async () => {
  process.env.MONGO_URI = await startTestDb();
  ({ User } = await import('@/utils/models/userSchema'));
  sellersRoute = await import('@/app/api/sellers/route.js');
}, 120_000);

afterAll(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await User.deleteMany({});
  session.userId = null;
});

describe('backfill de clerkId', () => {
  it('no escribe nada sin --apply', async () => {
    await crearUsuario('ana@example.test');

    const { pendientes, resumen } = await backfillClerkIds({
      buscarClerkIdsPorEmail: clerkCon({ 'ana@example.test': ['user_ana'] }),
      apply: false,
    });

    expect(pendientes).toBe(1);
    expect(resumen).toEqual({ rellenado: 1 });
    // El ensayo informa de lo que haria, pero la base sigue igual.
    expect((await User.findOne({ email: 'ana@example.test' })).clerkId).toBeUndefined();
  });

  it('rellena el clerkId con --apply', async () => {
    await crearUsuario('ana@example.test');

    await backfillClerkIds({
      buscarClerkIdsPorEmail: clerkCon({ 'ana@example.test': ['user_ana'] }),
      apply: true,
    });

    expect((await User.findOne({ email: 'ana@example.test' })).clerkId).toBe(
      'user_ana'
    );
  });

  it('no toca a quien ya lo tiene', async () => {
    await crearUsuario('ana@example.test', { clerkId: 'user_ya_estaba' });

    const { pendientes } = await backfillClerkIds({
      buscarClerkIdsPorEmail: clerkCon({ 'ana@example.test': ['user_otro'] }),
      apply: true,
    });

    expect(pendientes).toBe(0);
    expect((await User.findOne({ email: 'ana@example.test' })).clerkId).toBe(
      'user_ya_estaba'
    );
  });

  it('es idempotente: correrlo dos veces da lo mismo', async () => {
    await crearUsuario('ana@example.test');
    const buscarClerkIdsPorEmail = clerkCon({ 'ana@example.test': ['user_ana'] });

    await backfillClerkIds({ buscarClerkIdsPorEmail, apply: true });
    const segunda = await backfillClerkIds({ buscarClerkIdsPorEmail, apply: true });

    expect(segunda.pendientes).toBe(0);
    expect(await User.countDocuments({ clerkId: 'user_ana' })).toBe(1);
  });

  it('informa de quien no existe en Clerk, sin inventarse nada', async () => {
    await crearUsuario('fantasma@example.test');

    const { resumen } = await backfillClerkIds({
      buscarClerkIdsPorEmail: clerkCon({}),
      apply: true,
    });

    expect(resumen).toEqual({ 'sin-cuenta-en-clerk': 1 });
    expect((await User.findOne({})).clerkId).toBeUndefined();
  });

  it('no decide por su cuenta cuando el email tiene varias cuentas en Clerk', async () => {
    await crearUsuario('duplicado@example.test');

    const { resumen } = await backfillClerkIds({
      buscarClerkIdsPorEmail: clerkCon({
        'duplicado@example.test': ['user_uno', 'user_dos'],
      }),
      apply: true,
    });

    expect(resumen).toEqual({ 'varias-cuentas-en-clerk': 1 });
    expect((await User.findOne({})).clerkId).toBeUndefined();
  });

  it('no revienta el índice unique si el clerkId ya es de otro documento', async () => {
    // Pasa si el mismo email quedó duplicado en Mongo: el unique del email
    // sigue comentado (T-11).
    await crearUsuario('ana@example.test', { clerkId: 'user_ana' });
    await crearUsuario('ana@example.test');

    const { resumen } = await backfillClerkIds({
      buscarClerkIdsPorEmail: clerkCon({ 'ana@example.test': ['user_ana'] }),
      apply: true,
    });

    expect(resumen).toEqual({ 'clerkId-ya-usado-por-otro': 1 });
    expect(await User.countDocuments({ clerkId: 'user_ana' })).toBe(1);
  });

  it('deja al usuario pudiendo operar otra vez', async () => {
    // El caso completo: un usuario de antes de T-12b esta bloqueado, se corre
    // el backfill, y vuelve a poder registrarse como vendedor.
    await crearUsuario('ana@example.test');
    session.userId = 'user_ana';

    const alta = body =>
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
      });
    const payload = { businessName: 'Postres Ana', phoneNumber: 3001234567 };

    const antes = await sellersRoute.POST(alta(payload));
    expect(antes.status).toBe(404); // no hay ningun User con ese clerkId

    await backfillClerkIds({
      buscarClerkIdsPorEmail: clerkCon({ 'ana@example.test': ['user_ana'] }),
      apply: true,
    });

    const despues = await sellersRoute.POST(alta(payload));
    expect(despues.status).toBe(201);
  });
});
