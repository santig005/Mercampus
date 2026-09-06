import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Next inyecta toda variable NEXT_PUBLIC_* en el bundle del cliente en el punto
// donde se usa. Hoy imagekit.js y cloudinary.js solo los importan route
// handlers, asi que sus claves no salen del servidor — pero basta que alguien
// los importe desde un componente 'use client' para publicarlas sin aviso.
// Este test impide que el nombre vuelva a prestarse a ello.

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
    // comentarios para explicar por que NO lo llevan.
    for (const file of ['src/utils/imagekit.js', 'src/utils/cloudinary.js']) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/process\.\s*env\.\s*NEXT_PUBLIC_/);
    }
  });

  it('las que quedan son legitimamente publicas', () => {
    // Si aparece una nueva, hay que decidir a conciencia si debe ir al bundle.
    expect([...publicEnvVars].sort()).toEqual([
      'NEXT_PUBLIC_GA_ID',
      'NEXT_PUBLIC_GTM_ID',
      'NEXT_PUBLIC_URL',
    ]);
  });
});
