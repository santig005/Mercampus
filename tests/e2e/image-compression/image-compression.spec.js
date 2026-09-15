import { randomFillSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';
import sharp from 'sharp';

// T-124a. Verifies `src/lib/compressImageForUpload.js` - the client-side
// shrink that keeps a phone photo under Vercel's hard 4.5 MB request-body
// limit - against a REAL Chromium page and REAL, decodable images, per
// CLAUDE.md rule 3: a test that only checked a mocked `file.size` would pass
// against a version of the code that never actually re-encoded anything -
// the same shape of gap T-100 hit for a CSS class.
//
// It does not drive the real add-product/edit-product form end to end: that
// needs a signed-in session, and this worktree has no `.env`/Clerk key (see
// the T-124 PR for details). What it verifies instead is the exact module
// the form calls, unmodified, loaded into a real browser as a real ES
// module (via a blob: URL, so no bundler or static server is needed) and
// run against images built with `sharp` - never a mocked byte count.
//
// Run with:
//   npx playwright test --config=tests/e2e/image-compression/playwright.config.js
//
// This file is loaded through Playwright's CJS require-hook transform (the
// repo's package.json has no "type": "module", and changing that is out of
// scope for T-124 - it would change how every other file in the project is
// loaded). That transform strips `import`/`export` but has no way to fill in
// `import.meta.url` - there is no CJS equivalent - so referencing it threw
// `SyntaxError: Cannot use 'import.meta' outside a module` before any test
// even ran, which Playwright then reported as "No tests found". The
// transform does inject CJS's own `__dirname`, so this uses that instead.
const MODULE_SOURCE = readFileSync(
  path.join(__dirname, '../../../src/lib/compressImageForUpload.js'),
  'utf8'
);

async function noiseJpeg(width, height, quality) {
  const raw = Buffer.alloc(width * height * 3);
  randomFillSync(raw); // real random pixels - noise is the hardest case to
  // compress, not an easy stand-in, and still a genuine decodable JPEG.
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality })
    .toBuffer();
}

// Loads the real module source, in-page, as an actual ES module (so
// `import`/`export` run as shipped) via a blob: URL - no bundler, no static
// file server - and returns the URL to `import()` it from in later calls.
async function loadModuleUrl(page) {
  return page.evaluate(source => {
    return URL.createObjectURL(
      new Blob([source], { type: 'text/javascript' })
    );
  }, MODULE_SOURCE);
}

test.describe('compressImageForUpload (T-124a)', () => {
  let moduleUrl;

  test.beforeEach(async ({ page }) => {
    await page.goto('about:blank');
    moduleUrl = await loadModuleUrl(page);
  });

  test('shrinks a real oversized photo under the 4.5 MB Vercel limit, and the result still decodes', async ({
    page,
  }) => {
    // Measured empirically before writing this test: a 3000x3000
    // random-noise JPEG at quality 95 comes out to ~8.7 MB - a real,
    // decodable image comfortably over the 4.5 MB the route would 413 on.
    const original = await noiseJpeg(3000, 3000, 95);
    expect(original.length).toBeGreaterThan(4.5 * 1024 * 1024);

    const result = await page.evaluate(
      async ({ url, base64 }) => {
        const mod = await import(/* webpackIgnore: true */ url);
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const file = new File([bytes], 'photo.jpg', { type: 'image/jpeg' });

        const compressed = await mod.compressImageForUpload(file);
        if (!compressed) return { isNull: true };

        const bitmap = await createImageBitmap(compressed);
        return {
          isNull: false,
          size: compressed.size,
          type: compressed.type,
          width: bitmap.width,
          height: bitmap.height,
          maxUploadBytes: mod.MAX_UPLOAD_BYTES,
        };
      },
      { url: moduleUrl, base64: original.toString('base64') }
    );

    expect(result.isNull).toBe(false);
    expect(result.maxUploadBytes).toBe(4 * 1024 * 1024);
    expect(result.size).toBeLessThanOrEqual(result.maxUploadBytes);
    expect(result.size).toBeLessThan(original.length);
    expect(result.type).toBe('image/jpeg');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);

    // eslint-disable-next-line no-console
    console.log(
      `[T-124a] ${original.length} bytes -> ${result.size} bytes ` +
        `(${result.width}x${result.height})`
    );
  });

  test('a file already under the limit is left untouched', async ({
    page,
  }) => {
    const original = await noiseJpeg(64, 64, 80);
    expect(original.length).toBeLessThan(4 * 1024 * 1024);

    const result = await page.evaluate(
      async ({ url, base64 }) => {
        const mod = await import(/* webpackIgnore: true */ url);
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const file = new File([bytes], 'small.jpg', { type: 'image/jpeg' });

        const returned = await mod.compressImageForUpload(file);
        return {
          isSameFile: returned === file,
          size: returned && returned.size,
        };
      },
      { url: moduleUrl, base64: original.toString('base64') }
    );

    // Identity, not just a size match: nothing re-encoded it.
    expect(result.isSameFile).toBe(true);
    expect(result.size).toBe(original.length);
  });

  test('an oversized file this browser cannot decode is rejected, not silently sent broken', async ({
    page,
  }) => {
    // Random bytes, not a JPEG structure at all (no SOI marker) - the
    // undecodable case createImageBitmap must actually fail on, so the form
    // can warn instead of uploading it.
    const garbage = Buffer.alloc(5 * 1024 * 1024);
    randomFillSync(garbage);

    const result = await page.evaluate(
      async ({ url, base64 }) => {
        const mod = await import(/* webpackIgnore: true */ url);
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const file = new File([bytes], 'broken.jpg', { type: 'image/jpeg' });

        const returned = await mod.compressImageForUpload(file);
        return { isNull: returned === null };
      },
      { url: moduleUrl, base64: garbage.toString('base64') }
    );

    expect(result.isNull).toBe(true);
  });
});
