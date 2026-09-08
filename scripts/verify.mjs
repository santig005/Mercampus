#!/usr/bin/env node
// The single quality gate: the same command locally and in CI.
//
// Running the steps separately invites trimming them by personal judgement
// ("this PR doesn't touch code, I'll skip the build"), which is exactly how
// failures slip through. Here the scope is not negotiable: all of them pass,

import { spawn } from 'node:child_process';

const STEPS = [
  { name: 'lint', command: 'npm run lint' },
  // Only fails on dead files. Unused dependencies belong to T-35 and unused
  // exports to T-30: they stay as warnings until their turn comes.
  { name: 'deadcode', command: 'npx knip' },
  { name: 'typecheck', command: 'npm run typecheck' },
  { name: 'test', command: 'npm run test' },
  { name: 'build', command: 'npm run build' },
];

const env = { ...process.env };

const runStep = step =>
  new Promise(resolve => {
    const startedAt = Date.now();
    console.log(`\n──── ${step.name} ────`);
    // shell: true because on Windows npm is npm.cmd, which Node cannot run
    // directly. The commands are constants in this file.
    const child = spawn(step.command, { shell: true, stdio: 'inherit', env });
    child.on('error', () => resolve({ ...step, code: 1, ms: Date.now() - startedAt }));
    child.on('close', code =>
      resolve({ ...step, code: code ?? 1, ms: Date.now() - startedAt })
    );
  });

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
