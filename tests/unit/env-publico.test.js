import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Next injects every NEXT_PUBLIC_* variable into the client bundle at the
// point where it is used. Today only route handlers import imagekit.js and
// cloudinary.js, so their keys never leave the server - but one 'use client'
// component importing them would publish those keys with no warning.
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

describe('variables expuestas al cliente', () => {
  it('ninguna NEXT_PUBLIC_ se llama SECRET ni PRIVATE', () => {
    const sospechosas = [...publicEnvVars].filter(name =>
      /SECRET|PRIVATE/.test(name)
    );

    expect(sospechosas).toEqual([]);
  });

  it('los SDK de imagenes no leen variables NEXT_PUBLIC_', () => {
    // Busca el uso, no la cadena: estos archivos mencionan el prefijo en sus
    // comments to explain why they do NOT carry it.
    for (const file of ['src/utils/imagekit.js', 'src/utils/cloudinary.js']) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/process\.\s*env\.\s*NEXT_PUBLIC_/);
    }
  });

  it('las que quedan son legitimamente publicas', () => {
    // If a new one shows up, deciding whether it belongs in the bundle is a
    expect([...publicEnvVars].sort()).toEqual([
      'NEXT_PUBLIC_GA_ID',
      'NEXT_PUBLIC_GTM_ID',
      'NEXT_PUBLIC_URL',
    ]);
  });
});
