import { expect, test } from '@playwright/test';

// T-84. The control for the signed-in project. Without it, every assertion in
// tests/e2e/signed-in/ could equally be explained by "the gate is open to
// everyone", and the fixture would be proving nothing.
//
// This spec runs in the `public` project, so it has no session.
const gatedRoutes = [
  '/antojos/sellers/schedules',
  '/antojos/sellers/profile/edit',
  '/antojos/product/add',
  '/antojos/sellers/products/edit',
];

test.describe('the seller screens are gated (T-84)', () => {
  for (const route of gatedRoutes) {
    test(`${route} sends a visitor to the login`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/auth\/login/);
    });
  }
});
