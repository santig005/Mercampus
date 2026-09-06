import { describe, expect, it } from 'vitest';

/**
 * T-12d: GET /api/users/user-with-seller/[email] no tenia ninguna
 * autenticacion y respondia 200 con el User y el Seller completos a
 * cualquiera que probara un email - un oraculo de enumeracion de cuentas.
 * SellerContext ahora recibe user/seller resueltos en el servidor por
 * clerkId (getSellerContextData, T-12c), asi que la ruta ya no hace falta.
 * Confirma que el archivo no exista: sin `route.js`, Next responde 404 de
 * verdad.
 */
describe('GET /api/users/user-with-seller/[email]', () => {
  it('ya no existe', async () => {
    await expect(
      import('@/app/api/users/user-with-seller/[email]/route')
    ).rejects.toThrow();
  });
});
