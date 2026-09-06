// Mongo en memoria para los tests que necesitan base de datos.
//
// No es un setupFile global a propósito: los tests de tests/unit/ son funciones
// puras y validación de schemas en memoria, y arrancar un mongod para ellos los
// volvería lentos sin ganar nada. Solo lo usan los tests que de verdad
// consultan la base.

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let server;

// Devuelve la URI exacta con la que conecto. Los tests que cargan codigo de la
// app tienen que poner esa misma cadena en MONGO_URI: si connectDB llama a
// mongoose.connect() con una URI distinta a la ya activa, Mongoose lanza.
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
