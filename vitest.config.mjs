import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // T-134: the project's tsconfig.json sets `"jsx": "preserve"` for Next's own
  // compiler (it has its own JSX transform). Vite reads that same tsconfig
  // for its oxc transform and otherwise leaves JSX untouched, so any .jsx
  // file - including existing ones under src/ - fails to parse under
  // Vitest. This forces Vite's own transform regardless of what Next needs
  // from tsconfig.
  oxc: { jsx: 'automatic' },
  test: {
    // Los tests unitarios son funciones puras y validacion de schemas de
    // Mongoose en memoria: no hay DOM que emular ni base de datos que levantar.
    environment: 'node',
    // .jsx: component/hook tests under tests/unit that need the
    // `@vitest-environment jsdom` pragma to render JSX (T-134) - everything
    // else here stays plain .js and the 'node' environment above.
    include: ['tests/unit/**/*.test.{js,jsx}', 'tests/integration/**/*.test.js'],
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
      '@public': fileURLToPath(new URL('./public', import.meta.url)),
    },
  },
});
