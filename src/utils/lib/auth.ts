import { auth } from '@clerk/nextjs/server';

import { connectDB } from '@/utils/connectDB';
import { AppError } from '@/utils/lib/errors';
import { Product } from '@/utils/models/productSchema';
import { User } from '@/utils/models/userSchema';
// No se usa por nombre, pero el import registra el modelo en Mongoose: el
// populate('sellerId') de getSellerContextData lo necesita registrado, si no
// revienta con MissingSchemaError (mismo patron que api/products/route.js).
import { Seller } from '@/utils/models/sellerSchema2'; // eslint-disable-line no-unused-vars

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

type SellerContextValue = false | 'None' | Record<string, unknown>;

/**
 * Usuario y vendedor de la sesion actual, listos para pasar a un Client
 * Component (`SellerContext`). A diferencia de `getAuthenticatedUser()`,
 * nunca lanza: no hay sesion es un resultado valido (visitante anonimo), no
 * un error, porque esto se llama en el layout raiz en cada request.
 *
 * Reemplaza a `GET /api/users/user-with-seller/[email]` (T-12d), que no
 * tenia ninguna autenticacion y respondia con el User/Seller de cualquier
 * email que se probara. Aqui la identidad sale del `clerkId` de la sesion
 * (T-12c), nunca de un email que llegue del cliente.
 *
 * Devuelve `false` para "no hay sesion" y `'None'` para "hay sesion pero sin
 * perfil de vendedor", los mismos sentinels que ya esperaban los consumidores
 * de `SellerContext`.
 */
export async function getSellerContextData(): Promise<{
  user: SellerContextValue;
  seller: SellerContextValue;
}> {
  const { userId } = await auth();
  if (!userId) {
    return { user: false, seller: false };
  }

  await connectDB();
  const user = await User.findOne({ clerkId: userId }).populate('sellerId').lean();
  if (!user) {
    // Hay sesion en Clerk pero no hay usuario en la base (evento de webhook
    // perdido, ver T-12b). Se trata igual que "no hay sesion": no hay nada
    // que mostrarle a SellerContext.
    return { user: false, seller: false };
  }

  const { sellerId, ...rest } = user;
  const seller: SellerContextValue = sellerId
    ? JSON.parse(JSON.stringify(sellerId))
    : 'None';

  // JSON.parse(JSON.stringify(...)) en vez de pasar el objeto de Mongoose tal
  // cual: cruza la frontera Server -> Client Component, y un ObjectId/Date de
  // Mongoose no es un objeto plano serializable por React.
  return { user: JSON.parse(JSON.stringify(rest)), seller };
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
