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
//   npm run budget:lighthouse:dark   (T-73 - mismas paginas, en modo oscuro)
//
// Thresholds live in lighthouserc.json. `lhci autorun` exits non-zero (and
// so does this script) when a page misses its budget. Con
// LIGHTHOUSE_THEME=dark, cada URL se visita con ?theme=dark - el script
// anti-FOUC de layout.jsx lo lee y aplica data-theme="dark" para esa carga
// sin depender de localStorage (Lighthouse arranca cada visita con un
// perfil de Chrome nuevo, sin nada guardado). Los resultados van a una
// carpeta separada para no pisar los de modo claro.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { seedDatabase } from './seed.mjs';

const PORT = Number(process.env.LIGHTHOUSE_PORT || 3100);
const DARK_THEME = process.env.LIGHTHOUSE_THEME === 'dark';

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
// process.env wins over .env, same as Next does.
const baseEnv = { ...dotEnv, ...process.env };

if (!baseEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  console.error(
    'lighthouse: missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.\n' +
      '            Same as e2e, Clerk rejects every request without a valid\n' +
      '            publishable key, so not even the public routes respond.'
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
      // server isn't accepting connections yet
    }
    if (Date.now() > deadline) {
      throw new Error(`lighthouse: ${url} did not respond in time`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

let mongo;
let server;
try {
  console.log('\n──── in-memory database ────');
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

  console.log('\n──── server ────');
  server = spawn(`npx next start -p ${PORT}`, { shell: true, stdio: 'inherit', env });
  await waitForServer(`http://localhost:${PORT}/antojos`);

  // Main screens: listing, product detail, seller profile, the seller
  // grid, marketplace (separate section), and one marketing page. Covers
  // server components with real seeded data and pure static content.
  //
  // /antojos/sellers/list doesn't always produce a Largest Contentful Paint
  // (intermittent NO_LCP, seen both locally and in CI): lighthouserc.json
  // gives it its own assertMatrix entry without categories:performance, and
  // excludes that URL from the general entry with a negative lookahead —
  // every assertMatrix entry that matches a URL gets evaluated in full, they
  // aren't merged by key, so a plain "off" in a second entry isn't enough if
  // the first one (whose pattern also matches) still requires the score.
  // Both patterns tolerate an optional `?...` suffix (`(\?.*)?$` instead of
  // a bare `$`) so they still match with `?theme=dark` appended below.
  const paths = [
    '/antojos',
    `/antojos/${summary.ids.approvedProduct}`,
    `/antojos/sellers/${summary.ids.approvedSeller}`,
    '/antojos/sellers/list',
    '/marketplace',
    '/about',
  ];
  const urls = paths.map(
    path => `http://localhost:${PORT}${path}${DARK_THEME ? '?theme=dark' : ''}`
  );

  console.log('\n──── lighthouse ────');
  // npx instead of an installed dependency: @lhci/cli pulls in ~240
  // transitive packages (puppeteer, an old lighthouse-core) with dozens of
  // CVEs, for something that runs once per PR. Pinned version for
  // reproducibility.
  const lhciArgs = [
    '--yes',
    '@lhci/cli@0.15.1',
    'autorun',
    '--config=lighthouserc.json',
    ...urls.map(url => `--collect.url=${url}`),
    ...(DARK_THEME ? ['--upload.outputDir=./lighthouse-results-dark'] : []),
  ];
  process.exitCode = await run(`npx ${lhciArgs.join(' ')}`, env);
} finally {
  server?.kill();
  await mongo?.stop();
}
