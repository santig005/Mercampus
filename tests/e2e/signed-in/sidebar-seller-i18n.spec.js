import { expect, test } from '@playwright/test';

// The seller-only "Gestionar" section of SideBar, in both locales. Runs with
// the T-84 session (the seeded, approved owner of "Arepas El Parche"), the
// only way that section renders at all. The signed-out half of the sidebar
// is covered in tests/e2e/sidebar-i18n.spec.js.
const COPY = {
  es: {
    heading: 'Gestionar',
    links: ['Panel de ventas', 'Agregar productos', 'Editar mis productos', 'Editar mi perfil', 'Mis horarios'],
    signOut: 'Cerrar Sesión',
    becomeSeller: 'Quiero ser vendedor',
  },
  en: {
    heading: 'Manage',
    links: ['Sales dashboard', 'Add products', 'Edit my products', 'Edit my profile', 'My schedules'],
    signOut: 'Sign Out',
    becomeSeller: 'Become a seller',
  },
};

test.describe('the seller section of the sidebar follows the page locale', () => {
  for (const [locale, path] of [
    ['es', '/antojos'],
    ['en', '/en/antojos'],
  ]) {
    test(`${locale}: ${path}`, async ({ page }) => {
      const copy = COPY[locale];
      await page.goto(path);
      await page.locator('label.btn-circle[for="my-dibujador"]').click();
      const drawer = page.locator('.drawer-side');

      await expect(drawer.getByText(copy.heading, { exact: true })).toBeVisible();
      for (const name of copy.links) {
        await expect(drawer.getByRole('link', { name, exact: true })).toBeVisible();
      }
      await expect(drawer.getByText(copy.signOut, { exact: true })).toBeVisible();
      // Approved seller: the onboarding link must not show in either locale.
      await expect(drawer.getByText(copy.becomeSeller)).toHaveCount(0);

      await page.screenshot({ path: `test-results/sidebar-seller-i18n-${locale}.png` });
    });
  }
});
