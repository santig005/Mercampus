// An in-memory Mongo for the tests that need a database.
//
// Deliberately not a global setupFile: the tests in tests/unit/ are pure
// functions and in-memory schema validation, and starting a mongod for them
// would only make them slow. Only the tests that really query the database
// use this.

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let server;

// Returns the exact URI it connected with. Tests that load app code have to
// put that same string in MONGO_URI: if connectDB calls mongoose.connect()
// with a URI different from the active one, Mongoose throws.
export async function startTestDb() {
  server = await MongoMemoryServer.create();
  const uri = server.getUri();
  await mongoose.connect(uri);
  return uri;
}

export async function stopTestDb() {
  await mongoose.disconnect();
  await server?.stop();
  server = undefined;
}

export async function clearTestDb() {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map(collection => collection.deleteMany({}))
  );
}
