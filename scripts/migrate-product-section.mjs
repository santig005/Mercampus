#!/usr/bin/env node
// One-off migration: sets section: 'antojos' on the products that lack the
// field.
//
// It used to live inside `GET /api/products` and ran on EVERY request. A
// one-off migration had been running on every page load for a year.
//
// Unlike the seed, this one IS meant to run against the production
// database: that is its natural target. So it does not refuse to run there,
// but it always demands --yes, because it writes.

import { pathToFileURL } from 'node:url';

import mongoose from 'mongoose';

import { Product } from '@/utils/models/productSchema';

export async function migrateProductSection() {
  const filter = { section: { $exists: false } };

  const pending = await Product.countDocuments(filter);
  if (pending === 0) {
    return { pending: 0, updated: 0 };
  }

  const result = await Product.updateMany(filter, {
    $set: { section: 'antojos' },
  });

  return { pending, updated: result.modifiedCount };
}

function describeTarget(uri) {
  // Without printing the URI: it carries a username and password.
  const { host, pathname } = new URL(uri.replace(/^mongodb\+srv:/, 'mongodb:'));
  return { host, database: pathname.replace(/^\//, '') || '(por defecto)' };
}

async function main() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('migrate: falta MONGO_URI.');
    process.exit(1);
  }

  const { host, database } = describeTarget(uri);
  console.log(`migrate: destino ${host}/${database}`);

  if (!process.argv.includes('--yes')) {
    console.error(
      'migrate: esta migracion escribe en la base. Repite con --yes para\n' +
        '         confirmar que es el destino que quieres.'
    );
    process.exit(1);
  }

  await mongoose.connect(uri);
  try {
    const { pending, updated } = await migrateProductSection();
    console.log(
      pending === 0
        ? 'migrate: no habia productos sin section, nada que hacer'
        : `migrate: ${updated} de ${pending} productos actualizados`
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
