#!/usr/bin/env node
// Orchestrates the e2e run: in-memory Mongo + seed, a build with the test
// environment, and Playwright on top.
//
// Three things are non-negotiable here:
//  - MONGO_URI is ALWAYS overwritten with the in-memory database. The local
//    .env points at a real database and the e2e must never touch it.
//  - The build has to carry NEXT_PUBLIC_URL with the same port it will
//    start on: NEXT_PUBLIC_* are injected at compile time, not at runtime.
//  - Clerk needs a real publishable key. Its middleware performs a
//    handshake against Clerk's servers and with a fake key returns 400 on
//    EVERY route, leaving the whole app unreachable.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { seedDatabase } from './seed.mjs';
import { Product } from '@/utils/models/productSchema';

const PORT = Number(process.env.E2E_PORT || 3100);

// Next loads .env on its own, but this script needs to read it too, to
// validate the Clerk key before spending two minutes on a useless build.
function readDotEnv() {
  if (!existsSync('.env')) return {};
  return Object.fromEntries(
    readFileSync('.env', 'utf8')
      .split('\n')
      .map(line => line.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^["']|["']$/g, '')])
  );
}

const dotEnv = readDotEnv();
// process.env wins over .env, the same way Next does it.
const baseEnv = { ...dotEnv, ...process.env };

if (!baseEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  console.error(
    'e2e: falta NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.\n' +
      '     Clerk rechaza toda peticion sin una publishable key valida, asi que\n' +
      '     la app no responde ni en las rutas publicas. En local sale del .env;\n' +
      '     en CI, de las variables del workflow.'
  );
  process.exit(1);
}

const run = (command, env) =>
  new Promise(resolve => {
    const child = spawn(command, { shell: true, stdio: 'inherit', env });
    child.on('close', code => resolve(code ?? 1));
  });

let server;
try {
  console.log('\n──── base de datos en memoria ────');
  server = await MongoMemoryServer.create();
  const uri = `${server.getUri()}mercampus_e2e`;
  await mongoose.connect(uri);
  const summary = await seedDatabase();

  // T-23: infinite scroll needs more than one page (PAGE_SIZE=12 in
  // ProductGrid.jsx) to be testable, and seedDatabase() only leaves 3 visible
  // antojos - seeding more there breaks other tests that check exactly those
  // 3 by name. They are added here, for the e2e only, with availability:false
  // and an old createdAt so they sort AFTER the original 3 (availability
  // desc, createdAt desc) and do not take their place on the first page.
  const scrollFillers = await Product.insertMany(
    Array.from({ length: 15 }, (_, i) => ({
      name: `Antojo de scroll ${i + 1}`,
      price: 3000,
      description: 'Producto de prueba para el e2e de scroll infinito.',
      images: ['https://ik.imagekit.io/seed/scroll.jpg'],
      section: 'antojos',
      category: ['Otros'],
      sellerId: summary.ids.approvedSeller,
      availability: false,
    }))
  );
  // .collection.updateMany (native driver), not Product.updateMany: the
  // Mongoose's timestamps middleware overwrites createdAt with the current
  // en cualquier update, incluso viniendo en un $set explicito - confirmado
  // running this with Product.updateMany, which left the filler with
  // createdAt "ahora" en vez de la fecha vieja pedida.
  await Product.collection.updateMany(
    { _id: { $in: scrollFillers.map(product => product._id) } },
    { $set: { createdAt: new Date('2000-01-01') } }
  );

  await mongoose.disconnect();
  console.log(
    `sembrado: ${summary.users} usuarios, ${summary.sellers} vendedores, ` +
      `${summary.products + scrollFillers.length} productos, ${summary.schedules} horarios`
  );

  const env = {
    ...baseEnv,
    MONGO_URI: uri,
    NEXT_PUBLIC_URL: `http://localhost:${PORT}`,
    E2E_PORT: String(PORT),
    E2E_PRODUCT_ID: summary.ids.approvedProduct,
    E2E_SELLER_ID: summary.ids.approvedSeller,
  };

  console.log('\n──── build ────');
  const buildCode = await run('npx next build', env);
  if (buildCode !== 0) process.exit(buildCode);

  console.log('\n──── playwright ────');
  process.exitCode = await run('npx playwright test', env);
} finally {
  await server?.stop();
}
