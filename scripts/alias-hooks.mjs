// Resolution hooks for jsconfig.json's '@/' alias.
//
// The Mongoose models import '@/utils/resources/...' (productSchema and
// sellerSchema2). Next and Vitest resolve that alias on their own, plain
// Node does not, so any script in scripts/ that imports a model fails
// without this. Future migrations (T-11, T-20) will need it just the same.
//
// Node does not add extensions in ESM either, which bundlers do: the
// candidates have to be tried by hand or '@/utils/models/x' won't resolve.
// The same goes for relative imports inside src/ ('../connectDB' in
// utils/lib/createUser.ts): found in T-63, the first script to import app code
// beyond a model.

import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../src/', import.meta.url);
const CANDIDATE_SUFFIXES = ['', '.ts', '.js', '.mjs', '/index.js'];

const isFile = url => {
  const path = fileURLToPath(url);
  return existsSync(path) && statSync(path).isFile();
};

function resolveWithSuffixes(base) {
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = new URL(base.href + suffix);
    if (isFile(candidate)) {
      // Declaring the format keeps Node from parsing these files as CommonJS,
      // failing, and reparsing them (MODULE_TYPELESS_PACKAGE_JSON). All of src/
      // is ESM. The alternative would be "type": "module" in package.json,
      // which would change how every .js in the repo is interpreted. Node
      // itself strips the types from .ts (22.18+); hence the different format.
      return {
        url: candidate.href,
        format: candidate.href.endsWith('.ts') ? 'module-typescript' : 'module',
        shortCircuit: true,
      };
    }
  }
  return null;
}

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    return resolveWithSuffixes(new URL(specifier.slice(2), SRC)) ?? nextResolve(specifier, context);
  }

  const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
  if (isRelative && context.parentURL?.startsWith(SRC.href)) {
    const resolved = resolveWithSuffixes(new URL(specifier, context.parentURL));
    if (resolved) return resolved;
  }

  return nextResolve(specifier, context);
}
