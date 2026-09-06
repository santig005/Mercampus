import { expect, test } from '@playwright/test';

// T-61. Lighthouse audita el DOM en estático (aria, contraste, etiquetas) pero
// no simula un usuario tabulando de verdad. Estas pruebas sí lo hacen, sobre
// los dos formularios públicos del sitio.

test.describe('navegacion por teclado', () => {
  test('pqrs: el tab recorre checkbox, email, tipo, descripcion, soporte y enviar en orden', async ({
    page,
  }) => {
    await page.goto('/antojos/pqrs');

    const anonimo = page.locator('form').getByRole('checkbox');
    const email = page.getByPlaceholder('Ingresa tu correo electrónico');
    const tipo = page.getByRole('combobox');
    const descripcion = page.getByPlaceholder('Escribe los detalles de tu solicitud');
    const soporte = page.getByRole('link', { name: /hablar con soporte/i });
    const enviar = page.getByRole('button', { name: 'Enviar' });

    await anonimo.focus();
    await expect(anonimo).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(email).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(tipo).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(descripcion).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(soporte).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(enviar).toBeFocused();
  });

  test('pqrs: la barra espaciadora marca "Anónimo" y oculta el campo de correo', async ({
    page,
  }) => {
    await page.goto('/antojos/pqrs');

    const anonimo = page.locator('form').getByRole('checkbox');
    const email = page.getByPlaceholder('Ingresa tu correo electrónico');

    await expect(email).toBeVisible();

    await anonimo.focus();
    await page.keyboard.press('Space');

    await expect(email).toBeHidden();
  });

  test('login: el tab llega a email, contraseña y el envio solo se habilita con ambos', async ({
    page,
  }) => {
    await page.goto('/auth/login');

    const email = page.getByPlaceholder('johndoe@gmail.com');
    const password = page.getByPlaceholder('********');
    const enviar = page.getByRole('button', { name: 'Iniciar Sesión' });

    // Deshabilitado con los campos vacios: no debe entrar al orden de
    // tabulacion hasta que haya algo que enviar.
    await expect(enviar).toBeDisabled();

    await email.focus();
    await page.keyboard.type('ana@example.test');

    await page.keyboard.press('Tab');
    await expect(password).toBeFocused();
    await page.keyboard.type('unaClaveSegura123');

    await page.keyboard.press('Tab');
    await expect(enviar).toBeFocused();
    await expect(enviar).toBeEnabled();
  });
});
