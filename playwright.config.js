import { defineConfig } from '@playwright/test';

import { AUTH_STATE_PATH } from './tests/e2e/auth-state.js';

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
  // T-84: gets Clerk's Testing Token before any worker starts.
  globalSetup: './tests/global-setup.mjs',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  // T-84: three projects instead of one flat run.
  //
  // `public` is everything that was here before T-84 and stays signed out - the
  // buyer's view is most of this app, and a spec that accidentally ran with a
  // seller session would be testing a screen no visitor sees.
  //
  // `signed-in` opts in by living in tests/e2e/signed-in/, and gets the session
  // `setup` leaves behind. Adding one is a matter of putting a file there.
  projects: [
    {
      name: 'setup',
      // auth.setup.js does not match Playwright's default test file pattern, so
      // only this project ever picks it up.
      testMatch: 'auth.setup.js',
    },
    {
      name: 'public',
      testIgnore: ['signed-in/**'],
    },
    {
      name: 'signed-in',
      testMatch: 'signed-in/**/*.spec.js',
      dependencies: ['setup'],
      use: { storageState: AUTH_STATE_PATH },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/antojos`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
