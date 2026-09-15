import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  CONFLICTO,
  RECLAMADO,
  SIN_COINCIDENCIA,
  YA_RECLAMADO,
  reclaimAccount,
} from '../../scripts/reclaim-account.mjs';
import { startTestDb, stopTestDb } from '../setup.js';

let User;

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

describe('account reclaim', () => {
  it('happy path: reclaims the old User and deletes the webhook stub, with --apply', async () => {
    const sellerId = new mongoose.Types.ObjectId();
    const viejo = await User.create({
      name: 'Ana',
      email: 'ana@example.test',
      clerkId: 'user_prod_ana',
      sellerId,
    });
    const stub = await User.create({
      name: 'Ana',
      email: 'ana@example.test',
      clerkId: 'user_dev_ana',
    });

    const resultado = await reclaimAccount({
      email: 'ana@example.test',
      newClerkId: 'user_dev_ana',
      apply: true,
    });

    expect(resultado).toEqual({
      estado: RECLAMADO,
      email: 'ana@example.test',
      clerkIdAnterior: 'user_prod_ana',
      sellerId: sellerId.toString(),
      stubBorrado: true,
    });

    const restante = await User.findOne({ email: 'ana@example.test' }).lean();
    expect(restante._id.toString()).toBe(viejo._id.toString());
    expect(restante.clerkId).toBe('user_dev_ana');
    expect(restante.sellerId.toString()).toBe(sellerId.toString());
    expect(await User.findById(stub._id)).toBeNull();
  });

  it('without --apply writes nothing', async () => {
    await User.create({
      name: 'Ana',
      email: 'ana@example.test',
      clerkId: 'user_prod_ana',
      sellerId: new mongoose.Types.ObjectId(),
    });

    const resultado = await reclaimAccount({
      email: 'ana@example.test',
      newClerkId: 'user_dev_ana',
      apply: false,
    });

    expect(resultado.estado).toBe(RECLAMADO);
    const sigue = await User.findOne({ email: 'ana@example.test' }).lean();
    expect(sigue.clerkId).toBe('user_prod_ana');
  });

  it('no match: there is no old User with that email, touches nothing', async () => {
    const resultado = await reclaimAccount({
      email: 'nadie@example.test',
      newClerkId: 'user_dev_nadie',
      apply: true,
    });

    expect(resultado).toEqual({ estado: SIN_COINCIDENCIA, email: 'nadie@example.test' });
    expect(await User.countDocuments({})).toBe(0);
  });

  it('already claimed: the only User with that email already has the new clerkId', async () => {
    await User.create({ name: 'Ana', email: 'ana@example.test', clerkId: 'user_dev_ana' });

    const resultado = await reclaimAccount({
      email: 'ana@example.test',
      newClerkId: 'user_dev_ana',
      apply: true,
    });

    expect(resultado).toEqual({ estado: YA_RECLAMADO, email: 'ana@example.test' });
  });

  it('conflict: the new clerkId already belongs to another document with a different email', async () => {
    await User.create({ name: 'Ana', email: 'ana@example.test', clerkId: 'user_prod_ana' });
    await User.create({ name: 'Carlos', email: 'carlos@example.test', clerkId: 'user_dev_carlos' });

    const resultado = await reclaimAccount({
      email: 'ana@example.test',
      newClerkId: 'user_dev_carlos',
      apply: true,
    });

    expect(resultado.estado).toBe(CONFLICTO);
    // It must not have touched either of them.
    expect((await User.findOne({ email: 'ana@example.test' }).lean()).clerkId).toBe(
      'user_prod_ana'
    );
    expect((await User.findOne({ email: 'carlos@example.test' }).lean()).clerkId).toBe(
      'user_dev_carlos'
    );
  });

  it('the email is compared case-insensitively', async () => {
    const viejo = await User.create({
      name: 'Ana',
      email: 'Ana@Example.test',
      clerkId: 'user_prod_ana',
    });

    const resultado = await reclaimAccount({
      email: 'ana@example.test',
      newClerkId: 'user_dev_ana',
      apply: true,
    });

    expect(resultado.estado).toBe(RECLAMADO);
    expect((await User.findById(viejo._id)).clerkId).toBe('user_dev_ana');
  });
});
