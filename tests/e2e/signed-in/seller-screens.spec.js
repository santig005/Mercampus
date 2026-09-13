import { expect, test } from '@playwright/test';

// T-84. The first specs to run with a session, and the thing T-67 could not do:
// its own "Done when" asked for the seller screens and Playwright had no way in,
// so registration, profile edit, product CRUD and schedules were never audited.
//
// The session belongs to a Clerk account scripts/e2e.mjs creates for the run,
// whose id was written onto the seeded owner of "Arepas El Parche". Asserting
// on that business name is deliberate: it is the difference between "somebody
// is signed in" and "the session resolves to the seller we seeded". A fixture
// that only checked for the absence of a redirect would pass with a Clerk
// account that has no Mongo document at all.
test.describe('seller screens with a session (T-84)', () => {
  test('the profile edit form is prefilled with the seeded business', async ({
    page,
  }) => {
    await page.goto('/antojos/sellers/profile/edit');

    await expect(page).not.toHaveURL(/auth\/login/);
    // By its label, which only became addressable in T-93 - before that the
    // field's visible text was a <p> associated with nothing.
    await expect(page.getByLabel('Nombre del Negocio')).toHaveValue(
      'Arepas El Parche'
    );
  });

  test('T-72 profile checklist renders for a real seller', async ({ page }) => {
    await page.goto('/antojos/sellers/profile/edit');

    // getProfileChecklist() resolves the seller from auth() on the server and
    // returns null for anyone without a profile, so this rendering at all is
    // server-side proof of the link. T-72 shipped with unit tests and a probe;
    // this is the first time a browser has seen it.
    await expect(page.getByLabel(/Perfil completado al \d+ por ciento/)).toBeVisible();
  });

  test('the schedules screen loads for its owner', async ({ page }) => {
    await page.goto('/antojos/sellers/schedules');

    await expect(page).not.toHaveURL(/auth\/login/);
    await expect(page.getByRole('heading', { name: 'Tus horarios' })).toBeVisible();
  });

  test('the sidebar shows the seller-only section', async ({ page }) => {
    await page.goto('/antojos');
    await page.locator('label[for="my-dibujador"]').first().click();

    // SideBar renders "Gestionar" only when seller?.approved is true, which
    // comes from the Mongo seller the session resolves to - not from Clerk.
    await expect(page.getByText('Gestionar')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Editar mis productos' })
    ).toBeVisible();
  });
});
