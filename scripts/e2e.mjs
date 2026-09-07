#!/usr/bin/env node
// Orquesta el e2e: Mongo en memoria + seed, build con el entorno de prueba, y
// Playwright encima.
//
// Tres cosas que no son negociables aqui:
//  - MONGO_URI SIEMPRE se sobreescribe con la base en memoria. El .env local
//    apunta a una base real y el e2e no debe tocarla jamas.
//  - El build tiene que llevar NEXT_PUBLIC_URL con el mismo puerto en el que
//    va a arrancar: las NEXT_PUBLIC_* se inyectan al compilar, no en runtime.
//  - Clerk necesita una publishable key de verdad. Su middleware hace un
//    handshake contra los servidores de Clerk y con una clave falsa devuelve
//    400 en TODAS las rutas, asi que la app entera queda inalcanzable.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { seedDatabase } from './seed.mjs';
import { Product } from '@/utils/models/productSchema';

const PORT = Number(process.env.E2E_PORT || 3100);

// Next carga .env por su cuenta, pero este script tambien necesita leerlo para
// validar la clave de Clerk antes de gastar dos minutos en un build inutil.
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
// process.env manda sobre .env, igual que hace Next.
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

  // T-23: el scroll infinito necesita mas de una pagina (PAGE_SIZE=12 en
  // ProductGrid.jsx) para poder probarse, y seedDatabase() solo deja 3
  // antojos visibles - sembrar mas ahi rompe otros tests que verifican
  // exactamente esos 3 por nombre. Se agregan aqui, solo para el e2e, con
  // availability:false y un createdAt viejo para que ordenen DESPUES de los
  // 3 originales (availability desc, createdAt desc) y no les quiten su
  // lugar en la primera pagina.
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
  // .collection.updateMany (driver nativo), no Product.updateMany: el
  // middleware de timestamps de Mongoose pisa createdAt con la hora actual
  // en cualquier update, incluso viniendo en un $set explicito - confirmado
  // corriendo esto con Product.updateMany, que dejaba a los filler con
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
