import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Los tests unitarios son funciones puras y validacion de schemas de
    // Mongoose en memoria: no hay DOM que emular ni base de datos que levantar.
    environment: 'node',
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    // Los de integracion levantan un mongod en memoria; la primera vez ademas
    // se descarga el binario.
    testTimeout: 30_000,
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
