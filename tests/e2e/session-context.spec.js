import { clerk } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

// T-125. Signing in or out without a full page load left the seller context
// describing the previous visitor. The human hit it on a preview on
// 2026-09-14: signed in through the form, the sidebar still offered "Quiero
// ser vendedor", and the register screen bounced to /auth/login.
//
// Why: the root layout resolves user and seller on the server and hands them
// to SellerProvider, which kept them in useState. Clerk calls router.refresh()
// after setActive(), so the layout does re-render with the new values - but
// useState only reads its argument on mount, and a root layout is not
// remounted by a client-side navigation. T-12d had checked the refresh and
// concluded it was safe; it is, for SideBar's `userId` prop, not for state.
//
// The signed-in project never saw this: auth.setup.js signs in and then
// page.goto()s, a full load. Here clerk.signIn/signOut run inside the page
// (Clerk.setActive / Clerk.signOut), the same in-page switch the login form
// and the sign-out button make, and nothing reloads afterwards.
//
// The sidebar is the probe. "Gestionar" needs `userId` (a server prop, always
// fresh) AND `seller.approved` (the context): it only shows when the context
// followed the session. The session resolves to the seeded owner of "Arepas
// El Parche", an approved seller (see scripts/e2e.mjs).

const openSidebar = page => page.locator('label[for="my-dibujador"]').first().click();

test.describe('seller context follows the session without a reload (T-125)', () => {
  test('after signing in, the sidebar shows the seller section', async ({ page }) => {
    const emailAddress = process.env.E2E_CLERK_EMAIL;
    expect(emailAddress, 'run through `npm run test:e2e`').toBeTruthy();

    await page.goto('/antojos');
    await clerk.loaded({ page });
    await openSidebar(page);
    await expect(page.getByText('Quiero ser vendedor')).toBeVisible();

    await clerk.signIn({ page, emailAddress });

    await expect(page.getByRole('link', { name: 'Editar mis productos' })).toBeVisible();
    await expect(page.getByText('Quiero ser vendedor')).toHaveCount(0);

    // And the seller screen opens instead of bouncing to the login page,
    // which is the symptom the human reported.
    await page.getByRole('link', { name: 'Editar mis productos' }).click();
    await expect(page).toHaveURL(/\/antojos\/sellers\/products\/edit$/);
    await expect(page.getByRole('button', { name: 'Añadir Producto' })).toBeVisible();
  });

  test('after signing out, the sidebar stops showing it', async ({ page }) => {
    const emailAddress = process.env.E2E_CLERK_EMAIL;
    expect(emailAddress, 'run through `npm run test:e2e`').toBeTruthy();

    // Signed in with a full load first, so the context starts out right.
    await page.goto('/antojos');
    await clerk.loaded({ page });
    await clerk.signIn({ page, emailAddress });
    await page.reload();
    await openSidebar(page);
    await expect(page.getByRole('link', { name: 'Editar mis productos' })).toBeVisible();

    await clerk.signOut({ page });

    await expect(page.getByText('Quiero ser vendedor')).toBeVisible();
    await expect(page.getByText('Solicitud en proceso')).toHaveCount(0);
  });
});
