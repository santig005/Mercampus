import { expect, test } from '@playwright/test';

// SideBar, ThemeToggle and Navbar are global chrome: no T-81 zone owned them,
// so they stayed Spanish on every English page. These walk the signed-out
// sidebar in both locales and read the rendered text - and screenshot it -
// rather than any string in the source (CLAUDE.md rule 3).
//
// The Spanish copy is kept literal on purpose: sidebar-nav, session-context,
// accessible-names and dark-mode all pin it by name on the default locale.
const openSidebar = page => page.locator('label.btn-circle[for="my-dibujador"]').click();
const drawer = page => page.locator('.drawer-side');

const COPY = {
  es: {
    links: ['Antojitos', 'Marketplace', 'Lista de vendedores', 'Quiero ser vendedor', 'Ayuda', 'Sobre Mercampus', 'Iniciar Sesión', 'Regístrate'],
    sellers: 'Vendedores',
    darkMode: 'Modo oscuro',
    darkModeAria: 'Alternar modo oscuro',
    navbarSignIn: 'Iniciar sesión',
    closeSidebar: 'Cerrar menú lateral',
  },
  en: {
    links: ['Cravings', 'Marketplace', 'Seller list', 'Become a seller', 'Help', 'About Mercampus', 'Sign In', 'Sign Up'],
    sellers: 'Sellers',
    darkMode: 'Dark mode',
    darkModeAria: 'Toggle dark mode',
    navbarSignIn: 'Sign in',
    closeSidebar: 'Close sidebar',
  },
};

test.describe('the sidebar and navbar follow the page locale', () => {
  for (const [locale, path] of [
    ['es', '/antojos'],
    ['en', '/en/antojos'],
  ]) {
    test(`${locale}: ${path}`, async ({ page }) => {
      const copy = COPY[locale];
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);

      // The header's icon-only account link. exact: the sidebar's own
      // sign-in link differs only in case.
      await expect(
        page.getByRole('link', { name: copy.navbarSignIn, exact: true })
      ).toBeVisible();

      await openSidebar(page);
      for (const name of copy.links) {
        await expect(
          drawer(page).getByRole('link', { name, exact: true })
        ).toBeVisible();
      }
      await expect(drawer(page).getByText(copy.sellers, { exact: true })).toBeVisible();
      await expect(drawer(page).getByText(copy.darkMode, { exact: true })).toBeVisible();
      await expect(drawer(page).getByLabel(copy.darkModeAria)).toBeVisible();
      await expect(page.getByLabel(copy.closeSidebar)).toHaveCount(1);

      await page.screenshot({ path: `test-results/sidebar-i18n-${locale}.png` });
    });
  }

  test('an unmigrated page (no [locale] twin) keeps the Spanish sidebar', async ({
    page,
  }) => {
    // /antojos/game is served by src/app/antojos/layout.jsx, outside
    // [locale]: the root NextIntlClientProvider resolves it to the default.
    await page.goto('/antojos/game');
    await openSidebar(page);
    for (const name of COPY.es.links) {
      await expect(drawer(page).getByRole('link', { name, exact: true })).toBeVisible();
    }
    await expect(drawer(page).getByRole('link', { name: 'Cravings' })).toHaveCount(0);
  });
});
