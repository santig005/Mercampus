import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startTestDb, stopTestDb } from '../setup.js';

// Hotfix (2026-09-09): live on the agent/develop preview, GET /marketplace
// and any request to /antojos were intermittently answering 500 -
// `MissingSchemaError: Schema hasn't been registered for model "Seller"` -
// from getSellerContextData()'s populate('sellerId'), which the root layout
// calls on every request. ~15-18% of requests failed: a cold-start-dependent
// registration race, not a permanent break, which is why it wasn't 100%
// reproducible and slipped past three earlier file-by-file patches
// (api/products/route.js, api/products/[id]/route.js, utils/lib/auth.ts),
// each an `import { X } from '...models/...'; // eslint-disable-line
// no-unused-vars` that registers a model as a side effect but only protects
// the one file carrying it.
//
// connectDB() is the one function every Mongo-touching code path already
// calls before running a query, so it's now the single choke point that
// registers every model unconditionally - see the comment in
// src/utils/connectDB.js. This test is deliberately narrow: it imports
// *only* connectDB, never a model file by name, so a regression that removes
// one of its six side-effect imports fails here instead of shipping to
// production at some fraction of requests.
describe('connectDB registers every model (hotfix for the Seller populate crash)', () => {
  beforeAll(async () => {
    process.env.MONGO_URI = await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  it('registers Order, Pqrs, Product, Schedule, Seller and User just by being imported', async () => {
    // Dynamic, and the only import in this file that touches app code: static
    // imports are hoisted above any other test file's own imports, and this
    // one has to run after startTestDb() connects, so mongoose.connect()
    // inside connectDB() doesn't throw on a URI mismatch (tests/setup.js's
    // own contract).
    const { connectDB } = await import('@/utils/connectDB');
    await connectDB();

    for (const name of ['Order', 'Pqrs', 'Product', 'Schedule', 'Seller', 'User']) {
      expect(mongoose.models[name], `mongoose.models.${name}`).toBeDefined();
    }
  });

  it('a populate against Seller actually resolves, not just the registry check above', async () => {
    // The registry check alone wouldn't have caught the real bug: Mongoose's
    // MissingSchemaError comes specifically from .populate() resolving a ref
    // by model name, not from any direct use of the Seller export. This
    // exercises exactly that path - a Product populated by the string
    // 'Seller', the same way getSellerContextData and the product routes do.
    const { connectDB } = await import('@/utils/connectDB');
    await connectDB();
    const { Product } = await import('@/utils/models/productSchema');
    const { Seller } = await import('@/utils/models/sellerSchema2');
    const { User } = await import('@/utils/models/userSchema');

    const owner = await User.create({
      clerkId: 'user_test_registration',
      name: 'Test',
      email: 'registration-test@example.test',
    });
    const seller = await Seller.create({
      businessName: 'Registration Test Seller',
      phoneNumber: 3000000000,
      userId: owner._id,
      university: 'Universidad EAFIT',
    });
    const product = await Product.create({
      name: 'Registration test product',
      price: 1000,
      description: 'exists only to exercise the populate path',
      images: [],
      section: 'antojos',
      category: ['Otros'],
      sellerId: seller._id,
    });

    const populated = await Product.findById(product._id).populate({
      path: 'sellerId',
      model: 'Seller',
    });

    expect(populated.sellerId.businessName).toBe('Registration Test Seller');
  });
});
