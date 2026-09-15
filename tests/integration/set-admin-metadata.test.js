import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { syncAdminMetadata } from '../../scripts/set-admin-metadata.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

let User;

/** A fake Clerk: publicMetadata by clerkId, mutable like the real one. */
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
  it('writes nothing without --apply', async () => {
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

  it('with --apply sets role: admin in publicMetadata', async () => {
    await crearUsuario('admin@example.test', { role: 'admin', clerkId: 'user_admin' });
    const clerk = clerkDeMentira();

    await syncAdminMetadata({ obtenerAdminsDeMongo, ...clerk, apply: true });

    expect(clerk.leer('user_admin')).toEqual({ role: 'admin' });
  });

  it('preserves other keys already in publicMetadata', async () => {
    await crearUsuario('admin@example.test', { role: 'admin', clerkId: 'user_admin' });
    const clerk = clerkDeMentira({ user_admin: { theme: 'dark' } });

    await syncAdminMetadata({ obtenerAdminsDeMongo, ...clerk, apply: true });

    expect(clerk.leer('user_admin')).toEqual({ theme: 'dark', role: 'admin' });
  });

  it('is idempotent: touches nothing if it already has the role', async () => {
    await crearUsuario('admin@example.test', { role: 'admin', clerkId: 'user_admin' });
    const clerk = clerkDeMentira({ user_admin: { role: 'admin' } });

    const informe = await syncAdminMetadata({ obtenerAdminsDeMongo, ...clerk, apply: true });

    expect(informe.pendientes).toBe(0);
    expect(informe.resumen).toEqual({ 'ya-tiene-rol': 1 });
  });

  it('a Mongo admin with no clerkId does not count as pending', async () => {
    // They can't sign in (T-12c), so there is nobody to write publicMetadata
    // to: that is migrate:clerk-id's job, not this script's.
    await crearUsuario('admin-sin-enlazar@example.test', { role: 'admin' });
    const clerk = clerkDeMentira();

    const informe = await syncAdminMetadata({ obtenerAdminsDeMongo, ...clerk, apply: true });

    expect(informe.pendientes).toBe(0);
    expect(informe.resumen).toEqual({ 'sin-clerk-id': 1 });
  });

  it('does not touch users who are not admin', async () => {
    await crearUsuario('buyer@example.test', { role: 'buyer', clerkId: 'user_buyer' });
    const clerk = clerkDeMentira();

    const informe = await syncAdminMetadata({ obtenerAdminsDeMongo, ...clerk, apply: true });

    expect(informe.admins).toBe(0);
    expect(clerk.leer('user_buyer')).toBeUndefined();
  });
});
