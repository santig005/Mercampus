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

/** Clerk de mentira: la lista de cuentas que devolveria la API. */
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

describe('backfill de clerkId', () => {
  it('no escribe nada sin --apply', async () => {
    await crearUsuario('ana@example.test');

    const informe = await backfillClerkIds({
      listarUsuariosDeClerk: clerkCon(cuenta('user_ana', 'ana@example.test')),
      apply: false,
    });

    expect(informe.pendientes).toBe(1);
    expect(informe.resumen).toEqual({ enlazado: 1 });
    expect((await User.findOne({})).clerkId).toBeUndefined();
  });

  it('enlaza la cuenta con su usuario con --apply', async () => {
    await crearUsuario('ana@example.test');

    const informe = await backfillClerkIds({
      listarUsuariosDeClerk: clerkCon(cuenta('user_ana', 'ana@example.test')),
      apply: true,
    });

    expect(informe.pendientes).toBe(1); // uno enlazado en esta pasada
    expect((await User.findOne({})).clerkId).toBe('user_ana');
  });

  it('es idempotente: la segunda pasada no deja nada pendiente', async () => {
    await crearUsuario('ana@example.test');
    const listarUsuariosDeClerk = clerkCon(cuenta('user_ana', 'ana@example.test'));

    await backfillClerkIds({ listarUsuariosDeClerk, apply: true });
    const segunda = await backfillClerkIds({ listarUsuariosDeClerk, apply: true });

    expect(segunda.pendientes).toBe(0);
    expect(segunda.resumen).toEqual({ 'ya-enlazado': 1 });
    expect(await User.countDocuments({ clerkId: 'user_ana' })).toBe(1);
  });

  it('con el email duplicado se queda con el que tiene perfil de vendedor', async () => {
    // El caso real de producción: la misma persona dos veces, una copia con
    // vendedor y otra vacía, porque el viejo POST /api/register creaba usuarios
    // sin autenticación y el unique del email sigue comentado (T-11).
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

  it('crea el usuario si la cuenta de Clerk no tiene ninguno', async () => {
    const informe = await backfillClerkIds({
      listarUsuariosDeClerk: clerkCon(cuenta('user_nuevo', 'nuevo@example.test')),
      apply: true,
    });

    expect(informe.resumen).toEqual({ creado: 1 });
    const creado = await User.findOne({ clerkId: 'user_nuevo' });
    expect(creado.email).toBe('nuevo@example.test');
    expect(creado.role).toBe('buyer');
  });

  it('no toca ni cuenta como pendientes los documentos sin cuenta en Clerk', async () => {
    // 65 de estos hay en producción. No estan bloqueados: sin cuenta en Clerk
    // no pueden ni iniciar sesion, asi que no son trabajo de esta migracion.
    await crearUsuario('fantasma1@example.test');
    await crearUsuario('fantasma2@example.test');
    await crearUsuario('ana@example.test');

    const informe = await backfillClerkIds({
      listarUsuariosDeClerk: clerkCon(cuenta('user_ana', 'ana@example.test')),
      apply: true,
    });

    expect(informe.huerfanos).toBe(2);
    expect(informe.pendientes).toBe(1); // solo la cuenta de Clerk
    expect((await User.findOne({ email: 'fantasma1@example.test' })).clerkId).toBeUndefined();
  });

  it('no roba el usuario de otra cuenta ya enlazada', async () => {
    // Si el documento ya tiene otro clerkId es otra persona: pisarlo mezclaria
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

  it('deja al usuario pudiendo operar otra vez', async () => {
    // El recorrido entero: bloqueado como estaria en produccion, backfill, y
    // vuelve a poder registrarse como vendedor.
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

describe('guarda de instancia', () => {
  const desarrollo = async () => ({ id: 'ins_dev', environment_type: 'development' });
  const produccion = async () => ({ id: 'ins_prod', environment_type: 'production' });

  it('se planta si las claves son de una instancia de desarrollo', async () => {
    await expect(
      comprobarInstancia({ describirInstancia: desarrollo })
    ).rejects.toThrow(/no es la de producción|"development"/);
  });

  it('deja pasar si se pide explícitamente', async () => {
    const instancia = await comprobarInstancia({
      describirInstancia: desarrollo,
      permitirDesarrollo: true,
    });
    expect(instancia.id).toBe('ins_dev');
  });

  it('deja pasar una instancia de producción', async () => {
    expect(
      (await comprobarInstancia({ describirInstancia: produccion })).id
    ).toBe('ins_prod');
  });

  it('se planta si la base ya está enlazada a otra instancia', async () => {
    await crearUsuario('ana@example.test', { clerkId: 'user_de_otra_instancia' });

    await expect(
      comprobarInstancia({
        describirInstancia: produccion,
        comprobarClerkId: async () => false, // esta instancia no lo conoce
      })
    ).rejects.toThrow(/otra instancia/);
  });

  it('no se planta si los enlaces existentes son de esta instancia', async () => {
    await crearUsuario('ana@example.test', { clerkId: 'user_de_esta' });

    const instancia = await comprobarInstancia({
      describirInstancia: produccion,
      comprobarClerkId: async () => true,
    });
    expect(instancia.id).toBe('ins_prod');
  });
});
