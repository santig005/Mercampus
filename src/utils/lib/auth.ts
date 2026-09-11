import { auth } from '@clerk/nextjs/server';

import { connectDB } from '@/utils/connectDB';
import { AppError } from '@/utils/lib/errors';
import { isClerkAdmin } from '@/utils/lib/isClerkAdmin';
import { Product } from '@/utils/models/productSchema';
import { User } from '@/utils/models/userSchema';
// Not used by name, but the import registers the model with Mongoose:
// getSellerContextData's populate('sellerId') needs it registered, or it
// blows up with MissingSchemaError (same pattern as api/products/route.js).
import { Seller } from '@/utils/models/sellerSchema2'; // eslint-disable-line no-unused-vars

/**
 * The user's Clerk id (`user_...`).
 *
 * `auth()` resolves it from the token the request already carries: it makes no
 * network call. This used to be `getEmailFromToken`, which on top of that
 * asked Clerk's Backend API for the whole user just to turn the id into an
 * email, and then looked that email up in Mongo. Email is mutable and is not
 * even unique in this database (T-11), so it was a bad join key; `clerkId`
 * never changes.
 */
export async function getClerkUserId(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new AppError('No autenticado.', 401);
  }

  return userId;
}

/**
 * The current session's Mongo `User`, in a single indexed query.
 *
 * It selects `sellerId` directly instead of populating it: `User` already
 * records which seller it belongs to, so checking ownership is comparing two
 * ids.
 */
export async function getAuthenticatedUser() {
  const clerkId = await getClerkUserId();

  await connectDB();
  const user = await User.findOne({ clerkId })
    .select('email role sellerId')
    .lean();

  if (!user) {
    // There is a Clerk session but no user in the database. With the webhook
    // fixed (T-12b) this only happens if its event was lost.
    throw new AppError('No eres usuario registrado.', 403);
  }

  return user;
}

type SellerContextValue = false | 'None' | Record<string, unknown>;

/**
 * The current session's user and seller, ready to hand to a Client Component
 * (`SellerContext`). Unlike `getAuthenticatedUser()`, this never throws: no
 * session is a valid result (an anonymous visitor), not an error, because
 * this is called from the root layout on every request.
 *
 * It replaces `GET /api/users/user-with-seller/[email]` (T-12d), which had no
 * authentication whatsoever and answered with the User/Seller of any email
 * somebody cared to try. Here the identity comes from the session's `clerkId`
 * (T-12c), never from an email arriving from the client.
 *
 * Returns `false` for "no session" and `'None'` for "there is a session but
 * no seller profile", the same sentinels `SellerContext`'s consumers already
 * expected.
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
    // There is a Clerk session but no user in the database (a lost webhook
    // event, see T-12b). Treated the same as "no session": there is nothing
    // to show SellerContext.
    return { user: false, seller: false };
  }

  const { sellerId, ...rest } = user;
  const seller: SellerContextValue = sellerId
    ? JSON.parse(JSON.stringify(sellerId))
    : 'None';

  // JSON.parse(JSON.stringify(...)) rather than passing the Mongoose object
  // as-is: it crosses the Server -> Client Component boundary, and a Mongoose
  // ObjectId/Date is not a plain object React can serialise.
  return { user: JSON.parse(JSON.stringify(rest)), seller };
}

/**
 * Checks that the authenticated user owns the product. Returns the product's
 * sellerId.
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
 * Checks that the authenticated user owns the given seller, or is an admin.
 * Returns the user.
 *
 * T-104: admin-ness is read from Clerk, not from Mongo's `user.role`. This is
 * the gate on approving and rejecting a seller, and it is the *only* one:
 * `PUT /api/sellers/[id]` does not match the middleware's `/api/(.*)/admin(.*)`
 * pattern, so the one place that already checked Clerk correctly never runs
 * here. Reading Mongo meant a person with two `User` documents - one per Clerk
 * instance, which the webhook creates unprompted (T-12h) - was authorised by
 * whichever document the session's `clerkId` happened to resolve to, and was
 * refused with a 403 on their own admin panel.
 */
export const verifySellerId = async (sellerId: string) => {
  const user = await getAuthenticatedUser();
  const isOwner = user.sellerId?.toString() === sellerId;

  // Ownership first, and Clerk only if that fails: comparing two ids the User
  // document already carries costs nothing and covers the common case (a
  // seller editing their own profile), while isClerkAdmin() is a roundtrip to
  // Clerk's Backend API. So the request that pays for it is the rarer one: an
  // admin acting on somebody else's seller.
  if (!isOwner) {
    const isAdmin = await isClerkAdmin(await getClerkUserId());

    if (!isAdmin) {
      throw new AppError('No autorizado para este vendedor.', 403);
    }
  }

  return user;
};

/**
 * Variant for the routes that identify the seller by email instead of by id.
 * No admin exception, same as before.
 */
export const verifySellerEmail = async (sellerEmail: string) => {
  const user = await getAuthenticatedUser();

  if (user.email !== sellerEmail) {
    throw new AppError('No tienes permiso para modificar este vendedor.', 403);
  }

  return user;
};
