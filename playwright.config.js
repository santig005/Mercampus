import { defineConfig } from '@playwright/test';

// El puerto no es libre: NEXT_PUBLIC_URL se hornea en el build y los
// componentes de cliente piden datos a esa URL. Si el servidor arranca en otro
// puerto, la app carga pero las peticiones van al vacio y el listado muestra
// "Algo salio mal". scripts/e2e.mjs compila y arranca con el mismo puerto.
const PORT = Number(process.env.E2E_PORT || 3100);

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/antojos`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
