import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { syncAdminMetadata } from '../../scripts/set-admin-metadata.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

let User;

/** Clerk de mentira: publicMetadata por clerkId, mutable como el real. */
const clerkDeMentira = (inicial = {}) => {
  const metadata = new Map(Object.entries(inicial));
  return {
    obtenerMetadataDeClerk: async clerkId => metadata.get(clerkId) ?? {},
    actualizarMetadataDeClerk: async (clerkId, nueva) => {
      metadata.set(clerkId, nueva);
    },
    leer: clerkId => metadata.get(clerkId),
  };
};

const crearUsuario = (email, extra = {}) =>
  User.create({ name: 'Alguien', email, ...extra });

beforeAll(async () => {
  process.env.MONGO_URI = await startTestDb();
  ({ User } = await import('@/utils/models/userSchema'));
}, 120_000);

afterAll(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await User.deleteMany({});
});

const obtenerAdminsDeMongo = () =>
  User.find({ role: 'admin' }).select('email clerkId').lean();

describe('syncAdminMetadata', () => {
  it('no escribe nada sin --apply', async () => {
    await crearUsuario('admin@example.test', { role: 'admin', clerkId: 'user_admin' });
    const clerk = clerkDeMentira();

    const informe = await syncAdminMetadata({
      obtenerAdminsDeMongo,
      ...clerk,
      apply: false,
    });

    expect(informe.pendientes).toBe(1);
    expect(informe.resumen).toEqual({ actualizado: 1 });
    expect(clerk.leer('user_admin')).toBeUndefined();
  });

  it('con --apply pone role: admin en publicMetadata', async () => {
    await crearUsuario('admin@example.test', { role: 'admin', clerkId: 'user_admin' });
    const clerk = clerkDeMentira();

    await syncAdminMetadata({ obtenerAdminsDeMongo, ...clerk, apply: true });

    expect(clerk.leer('user_admin')).toEqual({ role: 'admin' });
  });

  it('conserva otras claves que ya hubiera en publicMetadata', async () => {
    await crearUsuario('admin@example.test', { role: 'admin', clerkId: 'user_admin' });
    const clerk = clerkDeMentira({ user_admin: { theme: 'dark' } });

    await syncAdminMetadata({ obtenerAdminsDeMongo, ...clerk, apply: true });

    expect(clerk.leer('user_admin')).toEqual({ theme: 'dark', role: 'admin' });
  });

  it('es idempotente: no toca nada si ya tiene el rol', async () => {
    await crearUsuario('admin@example.test', { role: 'admin', clerkId: 'user_admin' });
    const clerk = clerkDeMentira({ user_admin: { role: 'admin' } });

    const informe = await syncAdminMetadata({ obtenerAdminsDeMongo, ...clerk, apply: true });

    expect(informe.pendientes).toBe(0);
    expect(informe.resumen).toEqual({ 'ya-tiene-rol': 1 });
  });

  it('un admin de Mongo sin clerkId no cuenta como pendiente', async () => {
    // No puede iniciar sesion (T-12c), asi que no hay a quien escribirle
    // publicMetadata: es trabajo de migrate:clerk-id, no de este script.
    await crearUsuario('admin-sin-enlazar@example.test', { role: 'admin' });
    const clerk = clerkDeMentira();

    const informe = await syncAdminMetadata({ obtenerAdminsDeMongo, ...clerk, apply: true });

    expect(informe.pendientes).toBe(0);
    expect(informe.resumen).toEqual({ 'sin-clerk-id': 1 });
  });

  it('no toca a los usuarios que no son admin', async () => {
    await crearUsuario('buyer@example.test', { role: 'buyer', clerkId: 'user_buyer' });
    const clerk = clerkDeMentira();

    const informe = await syncAdminMetadata({ obtenerAdminsDeMongo, ...clerk, apply: true });

    expect(informe.admins).toBe(0);
    expect(clerk.leer('user_buyer')).toBeUndefined();
  });
});
