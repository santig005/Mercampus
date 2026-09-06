#!/usr/bin/env node
// T-61. Performance/accessibility budget.
//
// Same recipe as e2e.mjs: seed an in-memory Mongo, build with the test
// MONGO_URI and NEXT_PUBLIC_URL baked in, start the server, and this time
// point Lighthouse CI at it instead of Playwright. Needs a real Clerk
// publishable key for the same reason e2e does — its middleware rejects
// every route, public ones included, without one.
//
//   npm run budget:lighthouse
//
// Thresholds live in lighthouserc.json. `lhci autorun` exits non-zero (and
// so does this script) when a page misses its budget.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { seedDatabase } from './seed.mjs';

const PORT = Number(process.env.LIGHTHOUSE_PORT || 3100);

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
    'lighthouse: falta NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.\n' +
      '            Igual que en el e2e, Clerk rechaza toda peticion sin una\n' +
      '            publishable key valida, asi que ni las rutas publicas responden.'
  );
  process.exit(1);
}

const run = (command, env) =>
  new Promise(resolve => {
    const child = spawn(command, { shell: true, stdio: 'inherit', env });
    child.on('close', code => resolve(code ?? 1));
  });

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // el servidor todavia no acepta conexiones
    }
    if (Date.now() > deadline) {
      throw new Error(`lighthouse: ${url} no respondio a tiempo`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

let mongo;
let server;
try {
  console.log('\n──── base de datos en memoria ────');
  mongo = await MongoMemoryServer.create();
  const uri = `${mongo.getUri()}mercampus_lighthouse`;
  await mongoose.connect(uri);
  const summary = await seedDatabase();
  await mongoose.disconnect();

  const env = {
    ...baseEnv,
    MONGO_URI: uri,
    NEXT_PUBLIC_URL: `http://localhost:${PORT}`,
  };

  console.log('\n──── build ────');
  const buildCode = await run('npx next build', env);
  if (buildCode !== 0) process.exit(buildCode);

  console.log('\n──── servidor ────');
  server = spawn(`npx next start -p ${PORT}`, { shell: true, stdio: 'inherit', env });
  await waitForServer(`http://localhost:${PORT}/antojos`);

  // Pantallas principales: listado, detalle de producto, perfil de vendedor,
  // el grid de vendedores, marketplace (seccion aparte) y una pagina de
  // marketing. Cubren server components con datos reales del seed y estatico
  // puro.
  //
  // /antojos/sellers/list no siempre produce un Largest Contentful Paint
  // (NO_LCP intermitente, visto tanto en local como en CI): lighthouserc.json
  // apaga solo su assertion de performance con assertMatrix, sin dejarla
  // fuera del presupuesto de accesibilidad/best-practices/seo.
  const paths = [
    '/antojos',
    `/antojos/${summary.ids.approvedProduct}`,
    `/antojos/sellers/${summary.ids.approvedSeller}`,
    '/antojos/sellers/list',
    '/marketplace',
    '/about',
  ];
  const urls = paths.map(path => `http://localhost:${PORT}${path}`);

  console.log('\n──── lighthouse ────');
  // npx en vez de una dependencia instalada: @lhci/cli arrastra ~240 paquetes
  // transitivos (puppeteer, lighthouse-core viejo) con docenas de CVEs, para
  // algo que corre una vez por PR. Version fija para reproducibilidad.
  const lhciArgs = [
    '--yes',
    '@lhci/cli@0.15.1',
    'autorun',
    '--config=lighthouserc.json',
    ...urls.map(url => `--collect.url=${url}`),
  ];
  process.exitCode = await run(`npx ${lhciArgs.join(' ')}`, env);
} finally {
  server?.kill();
  await mongo?.stop();
}
