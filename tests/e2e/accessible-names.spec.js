import { expect, test } from '@playwright/test';

// T-93 (audit findings F7 and F8). Icon-only controls announced as "button",
// and form fields whose visible label text was a <p> associated with nothing -
// the fields leaned on `placeholder`, which disappears as soon as you type.

// A control is named if it has aria-label/aria-labelledby, a <label for> that
// points at it, or a <label> wrapping it. Placeholder and title do not count:
// that is the whole finding.
const unnamedControls = page =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('input, select, textarea'))
      .filter(element => element.type !== 'hidden' && element.offsetParent !== null)
      .filter(
        element =>
          !element.getAttribute('aria-label') &&
          !element.getAttribute('aria-labelledby') &&
          !(element.id && document.querySelector(`label[for="${element.id}"]`)) &&
          !element.closest('label')
      )
      .map(element => element.name || element.type || element.tagName)
  );

test.describe('accessible names (T-93)', () => {
  for (const path of ['/auth/login', '/auth/register', '/antojos/pqrs', '/antojos']) {
    test(`every visible field on ${path} has a label`, async ({ page }) => {
      await page.goto(path);
      // The fields are what the page is for, so if none are found the sweep
      // would pass on an empty list.
      await expect(page.locator('input:visible').first()).toBeVisible();

      expect(await unnamedControls(page)).toEqual([]);
    });
  }

  test('login: the fields are reachable by their visible label', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
  });

  test('pqrs: the select and the anonymous checkbox are labelled too', async ({
    page,
  }) => {
    await page.goto('/antojos/pqrs');

    await expect(page.getByLabel('Tipo de Solicitud')).toBeVisible();
    await expect(page.getByLabel('Anónimo')).toBeVisible();
    await expect(page.getByLabel('Descripción')).toBeVisible();
  });

  test('the icon-only controls announce what they do', async ({ page }) => {
    await page.goto('/antojos');
    // Signed out, the header shows the account icon as a bare link. exact:true
    // because the sidebar has a text link to the same page, "Iniciar Sesión",
    // which differs only in case.
    await expect(
      page.getByRole('link', { name: 'Iniciar sesión', exact: true })
    ).toBeVisible();

    await page.goto('/auth/login');
    await expect(page.getByRole('link', { name: 'Volver al inicio' })).toBeVisible();
  });
});
