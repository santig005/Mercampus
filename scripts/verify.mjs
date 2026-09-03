#!/usr/bin/env node
// Puerta única de calidad: el mismo comando en local y en CI.
//
// Correr los pasos por separado invita a recortarlos por criterio propio
// ("este PR no toca código, me salto el build"), que es justo como se cuelan
// los fallos. Aquí el alcance no es negociable: o pasan todos, o falla.

import { spawn } from 'node:child_process';

// Los SDK de ImageKit se instancian a nivel de módulo en src/utils/imagekit.js,
// así que `next build` revienta al recolectar los route handlers si estas
// variables no existen. Son valores falsos a propósito: en build esos módulos
// solo se cargan, nunca se ejecutan. Si el entorno ya trae valores reales,
// mandan los reales.
const PLACEHOLDER_ENV = {
  NEXT_PUBLIC_IMAGEKIT_KEY: 'public_ci_placeholder',
  NEXT_PUBLIC_PRIVATE_KEY_IMAGEKIT: 'private_ci_placeholder',
  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: 'https://ik.imagekit.io/ci-placeholder',
};

const STEPS = [
  { name: 'lint', command: 'npm run lint' },
  // Solo rompe por archivos muertos. Las dependencias sin usar son de T-35 y
  // los exports sin usar de T-30: quedan como avisos hasta que toque.
  { name: 'deadcode', command: 'npx knip' },
  { name: 'typecheck', command: 'npm run typecheck' },
  { name: 'test', command: 'npm run test' },
  { name: 'build', command: 'npm run build' },
];

const env = { ...process.env };
const injected = [];
for (const [key, value] of Object.entries(PLACEHOLDER_ENV)) {
  if (!env[key]) {
    env[key] = value;
    injected.push(key);
  }
}

const runStep = step =>
  new Promise(resolve => {
    const startedAt = Date.now();
    console.log(`\n──── ${step.name} ────`);
    // shell: true porque en Windows npm es npm.cmd, que Node no ejecuta
    // directamente. Los comandos son constantes de este archivo.
    const child = spawn(step.command, { shell: true, stdio: 'inherit', env });
    child.on('error', () => resolve({ ...step, code: 1, ms: Date.now() - startedAt }));
    child.on('close', code =>
      resolve({ ...step, code: code ?? 1, ms: Date.now() - startedAt })
    );
  });

if (injected.length > 0) {
  console.log(`verify: usando placeholders para ${injected.join(', ')}`);
}

const results = [];
for (const step of STEPS) {
  const result = await runStep(step);
  results.push(result);
  if (result.code !== 0) break;
}

const failed = results.find(result => result.code !== 0);
const skipped = STEPS.slice(results.length);

console.log('\n──── verify ────');
for (const result of results) {
  const mark = result.code === 0 ? 'ok  ' : 'FALL';
  console.log(`  ${mark} ${result.name} (${(result.ms / 1000).toFixed(1)}s)`);
}
for (const step of skipped) {
  console.log(`  --   ${step.name} (no ejecutado)`);
}

if (failed) {
  console.error(`\nverify: falló en "${failed.name}"`);
  process.exit(1);
}

console.log('\nverify: todo en verde');
