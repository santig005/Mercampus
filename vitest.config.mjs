import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // T-149: tsconfig.json sets "jsx": "preserve" for Next's own compiler
  // (SWC), which Vite's own transform (oxc, in this Vite version) otherwise
  // inherits by auto-discovering tsconfig.json - and leaving JSX unconverted
  // makes every .jsx file fail to parse the moment a test imports one.
  // Overridden here, for Vite's pipeline only; tsconfig.json (and the Next
  // build it configures) is untouched.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    // Los tests unitarios son funciones puras y validacion de schemas de
    // Mongoose en memoria: no hay DOM que emular ni base de datos que levantar.
    environment: 'node',
    // T-149: *.test.jsx, for the one component test (ReportDialog) that
    // needs jsdom - set per-file with a `// @vitest-environment jsdom`
    // docblock, so the `environment: 'node'` default above still holds for
    // every other test.
    include: [
      'tests/unit/**/*.test.js',
      'tests/unit/**/*.test.jsx',
      'tests/integration/**/*.test.js',
    ],
    // Los de integracion levantan un mongod en memoria; la primera vez ademas
    // se descarga el binario.
    testTimeout: 30_000,
    // T-154: empties the rate-limit counters between tests (see the file).
    setupFiles: ['./tests/reset-rate-limits.js'],
    hookTimeout: 120_000,
  },
  resolve: {
    // Mismo alias que jsconfig.json, para que los modulos bajo prueba
    // resuelvan sus imports '@/...' igual que en la app.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
