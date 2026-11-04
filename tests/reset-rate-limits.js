// T-154: the route handlers now count every write against a rate limit
// stored in Mongo. Tests that exercise a route's logic (validation,
// authorization) call it more times per identity than a real user would, and
// they shouldn't fail because an earlier test filled the bucket. So before
// every test, if a file has a database open, its counters are emptied.
//
// It starts nothing: unit tests, which never connect, skip it. The limiter's
// own behaviour is tested in tests/integration/rate-limit.test.js, which
// fills buckets inside a single test.
import mongoose from 'mongoose';
import { beforeEach } from 'vitest';

beforeEach(async () => {
  if (mongoose.connection.readyState !== 1) return;
  await mongoose.connection.collection('ratelimits').deleteMany({});
});
