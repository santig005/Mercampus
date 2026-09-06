import { describe, expect, it } from 'vitest';

/**
 * T-11: POST /api/register creaba usuarios sin autenticación ni validación.
 * El alta de usuario depende únicamente del webhook de Clerk (T-12b) — esta
 * ruta se borró en vez de protegerse. Confirma que el archivo no exista: en
 * el App Router de Next, sin `route.js` la petición real responde 404.
 */
describe('POST /api/register', () => {
  it('ya no existe', async () => {
    await expect(import('@/app/api/register/route')).rejects.toThrow();
  });
});
