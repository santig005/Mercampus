import { auth, clerkClient } from '@clerk/nextjs/server';

import { getUserWithSellerByEmail } from '@/services/server/userService';
import { AppError } from '@/utils/lib/errors';
import { Product } from '@/utils/models/productSchema';

/**
 * Email del usuario autenticado, a partir de la sesion de Clerk.
 *
 * `auth()` y `clerkClient()` devuelven promesas. Sin el await, `userId` salia
 * undefined y la comprobacion de sesion pasaba siempre: cualquier peticion se
 * daba por autenticada.
 */
export async function getEmailFromToken(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new AppError('No autenticado.', 401);
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email = user.emailAddresses?.[0]?.emailAddress;

  if (!email) {
    throw new AppError('No se encontró email en Clerk.', 500);
  }

  return email;
}

/**
 * Comprueba que el email autenticado sea el del vendedor propietario del
 * producto. Devuelve el sellerId del producto.
 */
export const verifyOwnershipAndGetSellerId = async (
  productId: string,
  email: string
) => {
  const { user, seller, error } = await getUserWithSellerByEmail(email);

  if (error) {
    throw new AppError('Error interno obteniendo datos de usuario.', 500);
  }
  if (!user) {
    throw new AppError('No eres usuario registrado.', 403);
  }
  if (!seller) {
    throw new AppError('No eres vendedor registrado.', 403);
  }

  const product = await Product.findById(productId).select('sellerId').lean();
  if (!product) {
    throw new AppError('Producto no encontrado.', 404);
  }

  const prodSellerId = product.sellerId?.toString();
  if (prodSellerId !== seller._id.toString()) {
    throw new AppError('No tienes permiso para modificar este producto.', 403);
  }

  return prodSellerId;
};

/**
 * Comprueba que el usuario autenticado sea el dueño del vendedor indicado, o
 * un admin. Devuelve { user, seller }.
 */
export const verifySellerId = async (sellerId: string, email: string) => {
  const { user, seller, error } = await getUserWithSellerByEmail(email);

  if (error) {
    throw new AppError('Error interno obteniendo datos de usuario.', 500);
  }
  if (!user) {
    throw new AppError('Usuario no encontrado.', 403);
  }
  if (!seller) {
    throw new AppError('Vendedor no encontrado.', 403);
  }

  const isAdmin = user.role === 'admin';
  const isOwner = seller._id.toString() === sellerId;

  if (!isAdmin && !isOwner) {
    throw new AppError('No autorizado para este vendedor.', 403);
  }

  return { user, seller };
};

/**
 * Variante para las rutas que identifican al vendedor por email en vez de por
 * id. Recibe el email autenticado en lugar de volver a pedirselo a Clerk.
 */
export const verifySellerEmail = async (
  sellerEmail: string,
  authenticatedEmail: string
) => {
  if (sellerEmail !== authenticatedEmail) {
    throw new AppError('No tienes permiso para modificar este vendedor.', 403);
  }
};
