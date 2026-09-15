import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Next injects every NEXT_PUBLIC_* variable into the client bundle at the
// point where it is used. Today only server code imports imagekit.js, so its
// keys never leave the server - but one 'use client' component importing it
// would publish those keys with no warning. (cloudinary.js was checked here
// too until T-116 deleted it along with its only importer, a route with no
// caller.)
// This test keeps the naming from lending itself to that again.

const walk = dir =>
  readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const sourceFiles = walk('src').filter(file => /\.(js|jsx|ts|tsx)$/.test(file));

const publicEnvVars = new Set(
  sourceFiles.flatMap(file =>
    [...readFileSync(file, 'utf8').matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)].map(
      match => match[1]
    )
  )
);

describe('variables exposed to the client', () => {
  it('no NEXT_PUBLIC_ is named SECRET or PRIVATE', () => {
    const sospechosas = [...publicEnvVars].filter(name =>
      /SECRET|PRIVATE/.test(name)
    );

    expect(sospechosas).toEqual([]);
  });

  it('image SDKs do not read NEXT_PUBLIC_ variables', () => {
    // Busca el uso, no la cadena: estos archivos mencionan el prefijo en sus
    // comments to explain why they do NOT carry it.
    for (const file of ['src/utils/imagekit.js']) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/process\.\s*env\.\s*NEXT_PUBLIC_/);
    }
  });

  it('the ones that remain are legitimately public', () => {
    // If a new one shows up, deciding whether it belongs in the bundle is a
    // T-112b removed NEXT_PUBLIC_URL from this list: its only readers were
    // services/api.js and apiToken.js, deleted along with the self-fetch.
    expect([...publicEnvVars].sort()).toEqual([
      'NEXT_PUBLIC_GA_ID',
      'NEXT_PUBLIC_GTM_ID',
    ]);
  });
});

// T-113: two things broke production on 2026-09-13, both because a required
// env var was renamed/added in code but never set in Vercel, and nothing in
// the repo would have caught it before the fact. This can't catch a missing
// Vercel value - nothing in the repo can - but it catches the repo-side half
// of both incidents: T-11b renamed six ImageKit variables in code and never
// in .env.example; T-14 added CRON_SECRET without documenting it anywhere.
// It compares both directions and makes .env.example trustworthy as *the*
// list to check a dashboard against.
describe('.env.example matches what the code actually reads', () => {
  const sourceEnvVars = new Set(
    sourceFiles.flatMap(file =>
      [...readFileSync(file, 'utf8').matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)].map(
        match => match[1]
      )
    )
  );

  const envExampleContent = readFileSync('.env.example', 'utf8');
  const envExampleVars = new Set(
    [...envExampleContent.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map(match => match[1])
  );

  // Never referenced via `process.env.X` in src/ because an SDK reads them
  // straight from the environment: @clerk/nextjs picks up its publishable
  // key, its secret key, and the sign-in/sign-up URL overrides on its own.
  // This already applied informally to the two URLs before T-113; the other
  // two Clerk keys turn out to be the same case, confirmed by grepping all
  // of src/ for their names and finding nothing.
  const READ_DIRECTLY_BY_LIBRARY = new Set([
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
    'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
  ]);

  // Set by the runtime itself, never by a human copying .env.example to
  // .env: NODE_ENV comes from the npm script / `next build` / `next start`,
  // VITEST is set by the Vitest runner. Neither belongs in .env.example.
  const SET_BY_RUNTIME = new Set(['NODE_ENV', 'VITEST']);

  // Documented in .env.example, genuinely unread anywhere under src/ today,
  // and kept on purpose rather than silently dropped by this test - CLAUDE.md
  // rule 5 says not to delete what you don't fully own the history of. Each
  // has a comment in .env.example explaining why it's still there; see the
  // T-113 PR body for the evidence behind each one.
  const KNOWN_ORPHANS = new Set([
    // T-112b deleted services/api.js and apiToken.js, its only src/ readers.
    // scripts/e2e.mjs and scripts/lighthouse.mjs still set it for their own
    // builds, outside src/.
    'NEXT_PUBLIC_URL',
    // T-116 deleted src/utils/cloudinary.js and its only importer (a route
    // with no caller). .env.example still says "T-35 decide con cual
    // quedarse" - that decision never happened, so these three stay
    // documented pending it instead of being deleted here.
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ]);

  it('every env var read under src/ is documented in .env.example', () => {
    const undocumented = [...sourceEnvVars]
      .filter(name => !SET_BY_RUNTIME.has(name))
      .filter(name => !envExampleVars.has(name));

    expect(undocumented).toEqual([]);
  });

  it('every .env.example entry is read somewhere, or explicitly accounted for', () => {
    const unaccounted = [...envExampleVars].filter(
      name =>
        !sourceEnvVars.has(name) &&
        !READ_DIRECTLY_BY_LIBRARY.has(name) &&
        !KNOWN_ORPHANS.has(name)
    );

    expect(unaccounted).toEqual([]);
  });
});
