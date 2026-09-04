import { auth } from '@clerk/nextjs/server';

import { connectDB } from '@/utils/connectDB';
import { AppError } from '@/utils/lib/errors';
import { Product } from '@/utils/models/productSchema';
import { User } from '@/utils/models/userSchema';

/**
 * Id del usuario en Clerk (`user_...`).
 *
 * `auth()` lo resuelve con el token que ya trae la peticion: no sale a la red.
 * Antes esto era `getEmailFromToken`, que ademas pedia el usuario completo a la
 * Backend API de Clerk solo para traducir el id a un email, y despues buscaba
 * en Mongo por ese email. El email es mutable y ni siquiera es unico en la
 * base (T-11), asi que era mala clave de union; `clerkId` no cambia nunca.
 */
export async function getClerkUserId(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new AppError('No autenticado.', 401);
  }

  return userId;
}

/**
 * El `User` de Mongo de la sesion actual, en una sola consulta indexada.
 *
 * Trae `sellerId` directamente en vez de poblarlo: `User` ya guarda a que
 * vendedor pertenece, asi que comprobar propiedad es comparar dos ids.
 */
export async function getAuthenticatedUser() {
  const clerkId = await getClerkUserId();

  await connectDB();
  const user = await User.findOne({ clerkId })
    .select('email role sellerId')
    .lean();

  if (!user) {
    // Hay sesion en Clerk pero no hay usuario en la base. Con el webhook
    // arreglado (T-12b) esto solo pasa si el evento se perdio.
    throw new AppError('No eres usuario registrado.', 403);
  }

  return user;
}

/**
 * Comprueba que el usuario autenticado sea el dueño del producto. Devuelve el
 * sellerId del producto.
 */
export const verifyOwnershipAndGetSellerId = async (productId: string) => {
  const user = await getAuthenticatedUser();

  if (!user.sellerId) {
    throw new AppError('No eres vendedor registrado.', 403);
  }

  const product = await Product.findById(productId).select('sellerId').lean();
  if (!product) {
    throw new AppError('Producto no encontrado.', 404);
  }

  const prodSellerId = product.sellerId?.toString();
  if (prodSellerId !== user.sellerId.toString()) {
    throw new AppError('No tienes permiso para modificar este producto.', 403);
  }

  return prodSellerId;
};

/**
 * Comprueba que el usuario autenticado sea el dueño del vendedor indicado, o
 * un admin. Devuelve el usuario.
 */
export const verifySellerId = async (sellerId: string) => {
  const user = await getAuthenticatedUser();

  const isAdmin = user.role === 'admin';
  const isOwner = user.sellerId?.toString() === sellerId;

  if (!isAdmin && !isOwner) {
    throw new AppError('No autorizado para este vendedor.', 403);
  }

  return user;
};

/**
 * Variante para las rutas que identifican al vendedor por email en vez de por
 * id. Sin excepcion para admin, igual que antes.
 */
export const verifySellerEmail = async (sellerEmail: string) => {
  const user = await getAuthenticatedUser();

  if (user.email !== sellerEmail) {
    throw new AppError('No tienes permiso para modificar este vendedor.', 403);
  }

  return user;
};
