import { defineConfig } from '@playwright/test';

// T-124a. `src/lib/compressImageForUpload.js` has no dependency on the app,
// Mongo or Clerk - it is a self-contained browser module. The main
// `playwright.config.js` still needs a full `next build` behind a REAL
// Clerk key just to answer any route at all (see scripts/e2e.mjs), which a
// worktree or CI run without that key cannot do at all. This config skips
// all of that: no `webServer`, no `globalSetup`, just a real Chromium page
// to run the module in.
//
// Run with: npx playwright test --config=tests/e2e/image-compression/playwright.config.js
export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
});
