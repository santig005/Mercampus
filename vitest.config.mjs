import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Los tests unitarios son funciones puras y validacion de schemas de
    // Mongoose en memoria: no hay DOM que emular ni base de datos que levantar.
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
  },
  resolve: {
    // Mismo alias que jsconfig.json, para que los modulos bajo prueba
    // resuelvan sus imports '@/...' igual que en la app.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
