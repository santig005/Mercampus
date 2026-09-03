// Hooks de resolución para el alias '@/' de jsconfig.json.
//
// Los modelos de Mongoose importan '@/utils/resources/...' (productSchema y
// sellerSchema2). Next y Vitest resuelven ese alias por su cuenta, pero Node
// plano no, así que cualquier script de scripts/ que importe un modelo falla
// sin esto. Las migraciones futuras (T-11, T-20) van a necesitarlo igual.
//
// Node tampoco añade extensiones en ESM, cosa que los bundlers sí hacen: hay
// que probar los candidatos a mano o '@/utils/models/x' no resuelve a 'x.js'.

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../src/', import.meta.url);
const CANDIDATE_SUFFIXES = ['', '.js', '.mjs', '/index.js'];

export function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith('@/')) {
    return nextResolve(specifier, context);
  }

  const base = new URL(specifier.slice(2), SRC);

  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = new URL(base.href + suffix);
    if (existsSync(fileURLToPath(candidate))) {
      // Declarar el formato evita que Node intente parsear estos .js como
      // CommonJS, falle y los reparse (MODULE_TYPELESS_PACKAGE_JSON). Todo
      // src/ es ESM. La alternativa sería "type": "module" en package.json,
      // que cambiaría la interpretación de todos los .js del repo.
      return { url: candidate.href, format: 'module', shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}
