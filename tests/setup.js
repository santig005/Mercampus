// Mongo en memoria para los tests que necesitan base de datos.
//
// No es un setupFile global a propósito: los tests de tests/unit/ son funciones
// puras y validación de schemas en memoria, y arrancar un mongod para ellos los
// volvería lentos sin ganar nada. Solo lo usan los tests que de verdad
// consultan la base.

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let server;

export async function startTestDb() {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri());
  return mongoose.connection;
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
