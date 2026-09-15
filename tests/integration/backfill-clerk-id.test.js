import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  backfillClerkIds,
  comprobarInstancia,
} from '../../scripts/backfill-clerk-id.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

const session = vi.hoisted(() => ({ userId: null }));

vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: session.userId }),
}));

let User;
let sellersRoute;

/** A fake Clerk: the list of accounts the API would return. */
const clerkCon =
  (...cuentas) =>
  async () =>
    cuentas;

const cuenta = (id, email, extra = {}) => ({
  id,
  emails: [email],
  nombre: 'Ana',
  ...extra,
});

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

describe('clerkId backfill', () => {
  it('writes nothing without --apply', async () => {
    await crearUsuario('ana@example.test');

    const informe = await backfillClerkIds({
      listarUsuariosDeClerk: clerkCon(cuenta('user_ana', 'ana@example.test')),
      apply: false,
    });

    expect(informe.pendientes).toBe(1);
    expect(informe.resumen).toEqual({ enlazado: 1 });
    expect((await User.findOne({})).clerkId).toBeUndefined();
  });

  it('links the account to its user with --apply', async () => {
    await crearUsuario('ana@example.test');

    const informe = await backfillClerkIds({
      listarUsuariosDeClerk: clerkCon(cuenta('user_ana', 'ana@example.test')),
      apply: true,
    });

    expect(informe.pendientes).toBe(1); // one linked in this run
    expect((await User.findOne({})).clerkId).toBe('user_ana');
  });

  it('is idempotent: the second pass leaves nothing pending', async () => {
    await crearUsuario('ana@example.test');
    const listarUsuariosDeClerk = clerkCon(cuenta('user_ana', 'ana@example.test'));

    await backfillClerkIds({ listarUsuariosDeClerk, apply: true });
    const segunda = await backfillClerkIds({ listarUsuariosDeClerk, apply: true });

    expect(segunda.pendientes).toBe(0);
    expect(segunda.resumen).toEqual({ 'ya-enlazado': 1 });
    expect(await User.countDocuments({ clerkId: 'user_ana' })).toBe(1);
  });

  it('with a duplicate email, keeps the one with a seller profile', async () => {
    // The real production case: the same person twice, one copy with a seller
    // and one empty, because the old POST /api/register created users with no
    // authentication and the email's unique is still commented out (T-11).
    const vacio = await crearUsuario('ana@example.test');
    const conVendedor = await crearUsuario('ana@example.test', {
      role: 'seller',
      sellerId: '507f1f77bcf86cd799439011',
    });

    const informe = await backfillClerkIds({
      listarUsuariosDeClerk: clerkCon(cuenta('user_ana', 'ana@example.test')),
      apply: true,
    });

    expect(informe.resumen).toEqual({ 'enlazado-con-desempate': 1 });
    expect((await User.findById(conVendedor._id)).clerkId).toBe('user_ana');
    expect((await User.findById(vacio._id)).clerkId).toBeUndefined();
  });

  it('creates the user if the Clerk account has none', async () => {
    const informe = await backfillClerkIds({
      listarUsuariosDeClerk: clerkCon(cuenta('user_nuevo', 'nuevo@example.test')),
      apply: true,
    });

    expect(informe.resumen).toEqual({ creado: 1 });
    const creado = await User.findOne({ clerkId: 'user_nuevo' });
    expect(creado.email).toBe('nuevo@example.test');
    expect(creado.role).toBe('buyer');
  });

  it('does not touch or count as pending the documents with no Clerk account', async () => {
    // There are 65 of these in production. They are not locked out: with no
    // Clerk account they can't sign in, so they aren't this migration's job.
    await crearUsuario('fantasma1@example.test');
    await crearUsuario('fantasma2@example.test');
    await crearUsuario('ana@example.test');

    const informe = await backfillClerkIds({
      listarUsuariosDeClerk: clerkCon(cuenta('user_ana', 'ana@example.test')),
      apply: true,
    });

    expect(informe.huerfanos).toBe(2);
    expect(informe.pendientes).toBe(1); // the Clerk account only
    expect((await User.findOne({ email: 'fantasma1@example.test' })).clerkId).toBeUndefined();
  });

  it('does not steal the user from another account already linked', async () => {
    // If the document already has a different clerkId it is another person:
    // dos cuentas y ademas reventaria el indice unique.
    await crearUsuario('compartido@example.test', { clerkId: 'user_primero' });

    const informe = await backfillClerkIds({
      listarUsuariosDeClerk: clerkCon(cuenta('user_segundo', 'compartido@example.test')),
      apply: true,
    });

    expect(informe.resumen).toEqual({ creado: 1 });
    expect((await User.findOne({ clerkId: 'user_primero' })).email).toBe(
      'compartido@example.test'
    );
    expect(await User.countDocuments({ clerkId: 'user_segundo' })).toBe(1);
  });

  it('leaves the user able to operate again', async () => {
    // El recorrido entero: bloqueado como estaria en produccion, backfill, y
    // can register as a seller again.
    await crearUsuario('ana@example.test');
    session.userId = 'user_ana';

    const alta = () =>
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({ businessName: 'Postres Ana', phoneNumber: 3001234567 }),
        headers: { 'content-type': 'application/json' },
      });

    expect((await sellersRoute.POST(alta())).status).toBe(404);

    await backfillClerkIds({
      listarUsuariosDeClerk: clerkCon(cuenta('user_ana', 'ana@example.test')),
      apply: true,
    });

    expect((await sellersRoute.POST(alta())).status).toBe(201);
  });
});

describe('instance guard', () => {
  const desarrollo = async () => ({ id: 'ins_dev', environment_type: 'development' });
  const produccion = async () => ({ id: 'ins_prod', environment_type: 'production' });

  it('bails if the keys are from a development instance', async () => {
    await expect(
      comprobarInstancia({ describirInstancia: desarrollo })
    ).rejects.toThrow(/no es la de producción|"development"/);
  });

  it('lets it through when explicitly requested', async () => {
    const instancia = await comprobarInstancia({
      describirInstancia: desarrollo,
      permitirDesarrollo: true,
    });
    expect(instancia.id).toBe('ins_dev');
  });

  it('lets a production instance through', async () => {
    expect(
      (await comprobarInstancia({ describirInstancia: produccion })).id
    ).toBe('ins_prod');
  });

  it('bails if the database is already linked to another instance', async () => {
    await crearUsuario('ana@example.test', { clerkId: 'user_de_otra_instancia' });

    await expect(
      comprobarInstancia({
        describirInstancia: produccion,
        comprobarClerkId: async () => false, // this instance doesn't know it
      })
    ).rejects.toThrow(/otra instancia/);
  });

  it('does not bail if the existing links are from this instance', async () => {
    await crearUsuario('ana@example.test', { clerkId: 'user_de_esta' });

    const instancia = await comprobarInstancia({
      describirInstancia: produccion,
      comprobarClerkId: async () => true,
    });
    expect(instancia.id).toBe('ins_prod');
  });
});
