/**
 * Copia de seguridad de la base a la que apunte `MONGO_URI`.
 *
 * Solo lee. Vuelca cada colección a `backups/<fecha>/<coleccion>.json`, que está
 * en `.gitignore` porque son datos reales de personas y no deben acabar en el
 * repositorio.
 *
 *   npm run backup:db
 *
 * Imprime el host y el nombre de la base, nunca la URI: lleva usuario y
 * contraseña. Si algún día hace falta restaurar, los ficheros son JSON con los
 * documentos tal cual salen de Mongo (`insertMany` los admite de vuelta).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import mongoose from 'mongoose';

const describeTarget = uri => {
  const { host, pathname } = new URL(uri.replace(/^mongodb\+srv:/, 'mongodb:'));
  return { host, database: pathname.replace(/^\//, '') || '(por defecto)' };
};

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('backup: falta MONGO_URI.');
    process.exit(1);
  }

  const { host, database } = describeTarget(uri);
  const marca = new Date().toISOString().replace(/[:.]/g, '-');
  const destino = path.join('backups', marca);

  console.log(`backup: origen ${host}/${database}`);
  console.log(`backup: destino ${destino}`);

  await mongoose.connect(uri);

  try {
    const db = mongoose.connection.db;
    const colecciones = await db.listCollections().toArray();
    await mkdir(destino, { recursive: true });

    const resumen = {};
    for (const { name } of colecciones) {
      const documentos = await db.collection(name).find({}).toArray();
      await writeFile(
        path.join(destino, `${name}.json`),
        JSON.stringify(documentos, null, 2),
        'utf8'
      );
      resumen[name] = documentos.length;
      console.log(`  ${String(documentos.length).padStart(6)}  ${name}`);
    }

    await writeFile(
      path.join(destino, '_meta.json'),
      JSON.stringify({ host, database, fecha: new Date().toISOString(), resumen }, null, 2),
      'utf8'
    );

    console.log('\nbackup: listo.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
