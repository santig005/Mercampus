import { expect, test } from '@playwright/test';
import mongoose from 'mongoose';

// T-134: /antojos/sellers/register used to drop a rejected submit on the
// floor - `errorCode` was set but nothing rendered it (FormErrorModal did
// not exist yet; the page imported the icons for a modal that was never in
// the JSX). This reuses the same signed-in fixture as T-81's onboarding spec
// (tests/e2e/signed-in/seller-onboarding-i18n.spec.js): the seeded owner of
// an approved seller, unlinked for the duration of the test so
// useCheckSeller('userNotSeller', '') lets them reach /register instead of
// bouncing them to /approving.
//
// Same contrast-ratio technique as T-127's product-add-errors.spec.js (read
// the actual painted pixels through a 1x1 canvas, not the CSS string) so a
// fix that changes the class but not the render can't pass this the way
// T-100 did with a string-only assertion.
function relativeLuminance([r, g, b]) {
  const channel = c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [r, g, b].map(channel);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(rgbA, rgbB) {
  const lA = relativeLuminance(rgbA);
  const lB = relativeLuminance(rgbB);
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA];
  return (lighter + 0.05) / (darker + 0.05);
}

function readBoxColorsInPage(selector) {
  const el = document.querySelector(selector);
  const style = getComputedStyle(el);
  const toRgb = css => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
  };
  return {
    background: toRgb(style.backgroundColor),
    text: toRgb(style.color),
  };
}

const SELLER_ID = process.env.E2E_SELLER_ID;

let users;
let ownerId;

test.describe('register shows a rejected submit instead of hiding it (T-134)', () => {
  test.beforeAll(async () => {
    expect(SELLER_ID, 'E2E_SELLER_ID is set by scripts/e2e.mjs').toBeTruthy();
    await mongoose.connect(process.env.MONGO_URI);
    users = mongoose.connection.collection('users');
    const owner = await users.findOne({
      sellerId: new mongoose.Types.ObjectId(SELLER_ID),
    });
    expect(owner, 'the seeded owner of the approved seller').toBeTruthy();
    ownerId = owner._id;
    await users.updateOne({ _id: ownerId }, { $unset: { sellerId: '' } });
  });

  test.afterAll(async () => {
    await users.updateOne(
      { _id: ownerId },
      { $set: { sellerId: new mongoose.Types.ObjectId(SELLER_ID) } }
    );
    await mongoose.disconnect();
  });

  for (const theme of ['light', 'dark']) {
    test(`the error dialog shows the rejected field, not nothing (${theme})`, async ({
      page,
    }) => {
      if (theme === 'dark') {
        await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      }

      await page.goto('/antojos/sellers/register');
      await expect(page).not.toHaveURL(/auth\/login/);
      await expect(page.getByRole('heading', { name: 'Registra tu Negocio' })).toBeVisible();

      // businessName passes the browser's own `required` check (any
      // non-empty string does) but fails the server's
      // `.trim().min(1, ...)` (see src/lib/validators/seller.ts) - the same
      // trick as leaving category/images empty in product-add-errors.spec.js:
      // it reaches the real API instead of being blocked client-side, and
      // the 400 that comes back is genuine, not mocked.
      await page.getByPlaceholder('Nombre del negocio').fill('   ');
      await page.getByPlaceholder('Describe tu negocio').fill('Las mejores arepas del campus');
      await page.getByPlaceholder('Número de teléfono').fill('3001234567');

      await page.getByRole('button', { name: 'Registrar Negocio' }).click();

      const dialog = page.locator('#errors');
      await expect(dialog).toHaveClass(/modal-open/);
      await expect(dialog.getByText('¡Atención!')).toBeVisible();
      await expect(dialog.locator('li')).not.toHaveCount(0);
      await expect(dialog.getByText('businessName:', { exact: false })).toBeVisible();

      // The textarea must still show exactly what was typed - not wrapped in
      // quotes by a payload-builder bug that mutated `sellerData` (T-134).
      await expect(page.getByPlaceholder('Describe tu negocio')).toHaveValue(
        'Las mejores arepas del campus'
      );

      const colors = await page.evaluate(readBoxColorsInPage, '#errors .alert-error');
      const ratio = contrastRatio(colors.background, colors.text);
      expect(ratio, `background ${colors.background} vs text ${colors.text} in ${theme} theme`).toBeGreaterThanOrEqual(4.5);

      await page.mouse.move(0, 0);
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      });

      await page.screenshot({
        path: `docs/audits/t-134/register-error-state__${theme}.png`,
        fullPage: true,
      });
    });
  }
});
