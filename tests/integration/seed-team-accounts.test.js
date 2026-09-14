import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { startTestDb, stopTestDb } from '../setup.js';

// Imported after MONGO_URI is set: connectDB reads it when its module loads.
let User;
let script;

beforeAll(async () => {
  process.env.MONGO_URI = await startTestDb();
  ({ User } = await import('@/utils/models/userSchema'));
  script = await import('../../scripts/seed-team-accounts.mjs');
}, 120_000);

afterAll(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await User.deleteMany({});
});

const clerkUser = (id, email, extra = {}) => ({
  id,
  first_name: 'Ana',
  last_name: 'Ruiz',
  email_addresses: [{ email_address: email }],
  image_url: 'https://img.clerk.com/ana.png',
  ...extra,
});

describe('seed team accounts', () => {
  it('dry run reports what it would create and writes nothing', async () => {
    const results = await script.syncTeamAccounts({
      emails: ['ana@example.test'],
      clerkUsers: [clerkUser('user_dev_ana', 'ana@example.test')],
    });

    expect(results).toEqual([
      { email: 'ana@example.test', clerkId: 'user_dev_ana', status: script.CREATE },
    ]);
    expect(await User.countDocuments()).toBe(0);
  });

  it('with apply, creates the User the webhook would have, and a second run finds it', async () => {
    const args = {
      emails: ['ana@example.test'],
      clerkUsers: [clerkUser('user_dev_ana', 'ana@example.test')],
      apply: true,
    };

    await script.syncTeamAccounts(args);
    const user = await User.findOne({ clerkId: 'user_dev_ana' }).lean();
    expect(user).toMatchObject({
      name: 'Ana',
      lastName: 'Ruiz',
      email: 'ana@example.test',
      role: 'buyer',
    });

    const again = await script.syncTeamAccounts(args);
    expect(again[0].status).toBe(script.EXISTS);
    expect(await User.countDocuments()).toBe(1);
  });

  it('keeps role and sellerId on a User that already exists', async () => {
    const sellerId = new mongoose.Types.ObjectId();
    await User.create({
      clerkId: 'user_dev_ana',
      name: 'Old name',
      email: 'ana@example.test',
      role: 'seller',
      sellerId,
    });

    await script.syncTeamAccounts({
      emails: ['ana@example.test'],
      clerkUsers: [clerkUser('user_dev_ana', 'ana@example.test')],
      apply: true,
    });

    const user = await User.findOne({ clerkId: 'user_dev_ana' }).lean();
    expect(user.role).toBe('seller');
    expect(user.sellerId.toString()).toBe(sellerId.toString());
    expect(user.name).toBe('Ana');
  });

  it('reports an email Clerk does not know, and writes nothing for it', async () => {
    const results = await script.syncTeamAccounts({
      emails: ['ana@example.test', 'ghost@example.test'],
      clerkUsers: [clerkUser('user_dev_ana', 'ana@example.test')],
      apply: true,
    });

    expect(results.map(r => r.status)).toEqual([script.CREATE, script.NOT_IN_CLERK]);
    expect(await User.countDocuments()).toBe(1);
  });

  it('never copies an account that was not asked for', async () => {
    await script.syncTeamAccounts({
      emails: ['ana@example.test'],
      clerkUsers: [
        clerkUser('user_dev_ana', 'ana@example.test'),
        clerkUser('user_dev_student', 'student@example.test'),
      ],
      apply: true,
    });

    expect(await User.exists({ clerkId: 'user_dev_student' })).toBeNull();
  });

  it('matches emails regardless of case', async () => {
    const results = await script.syncTeamAccounts({
      emails: ['Ana@Example.test'],
      clerkUsers: [clerkUser('user_dev_ana', 'ana@example.test')],
    });

    expect(results[0]).toMatchObject({ email: 'ana@example.test', status: script.CREATE });
  });
});

describe('production database guard', () => {
  it('refuses the production database name, in srv and replica-set URIs', () => {
    expect(() =>
      script.assertNotProductionDatabase('mongodb+srv://u:p@cluster0.x.mongodb.net/mercampus_products?retryWrites=true')
    ).toThrow(/production database/);
    expect(() =>
      script.assertNotProductionDatabase('mongodb://u:p@a:27017,b:27017/mercampus_products')
    ).toThrow(/production database/);
  });

  it('lets the development database through and returns its name', () => {
    expect(
      script.assertNotProductionDatabase('mongodb+srv://u:p@cluster0.y.mongodb.net/mercampus_dev?appName=Cluster0')
    ).toBe('mercampus_dev');
    expect(script.databaseName('mongodb://localhost:27017')).toBe('test');
  });
});
