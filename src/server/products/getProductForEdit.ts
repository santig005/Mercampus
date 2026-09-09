import { auth } from '@clerk/nextjs/server';

import { connectDB } from '@/utils/connectDB';
import { Product, type ProductDoc } from '@/utils/models/productSchema';
import { User } from '@/utils/models/userSchema';

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/** The product as the edit form consumes it: plain JSON, ids as strings. */
export type EditableProduct = Omit<ProductDoc, 'sellerId'> & {
  _id: string;
  sellerId: string;
};

export type ProductEditAccess =
  | { status: 'ok'; product: EditableProduct }
  | { status: 'not-found' }
  | { status: 'forbidden' };

/**
 * The product behind `/antojos/sellers/products/edit/[id]`, resolved on the
 * server together with the answer to "may this session edit it?".
 *
 * T-97 (audit findings F28/F29). The edit screen used to fetch
 * `GET /api/products/[id]` from the client and only then compare
 * `response.sellerId._id` with its own seller, which failed three ways:
 *
 * - an unknown id answered 404 and the client turned it into
 *   `Error al cargar los detalles del producto.` as a naked paragraph - no
 *   header, no form, no way back, and the URL still claiming to be an editor;
 * - a product whose owner is not publicly visible answered **500**, because
 *   that route populates the owner behind a filter and read `._id` off the
 *   null it got back. The ownership check below it was never reached;
 * - a malformed id answered 500 with Mongoose's CastError in the body.
 *
 * Deliberately **not** filtered by `approved` or `paused`, unlike the public
 * route: a seller's own product is theirs to edit whether or not an admin has
 * approved them and whether or not they have paused their store. Public
 * visibility is a different question from ownership, and conflating the two is
 * what F28 was.
 *
 * Returns a status rather than throwing, so the page decides what the visitor
 * sees (see the note there on why both failures render the same 404).
 */
export async function getProductForEdit(
  id: string
): Promise<ProductEditAccess> {
  // Before Mongo, so a malformed id is "no such product" and never a
  // CastError. Same guard as getProductForMetadata.
  if (!OBJECT_ID_RE.test(id)) return { status: 'not-found' };

  await connectDB();
  const product = await Product.findById(id).lean();
  if (!product) return { status: 'not-found' };

  // Identity from the session's clerkId, never from anything the client sent
  // (T-12c). `auth()` reads the token the request already carries.
  const { userId: clerkId } = await auth();
  if (!clerkId) return { status: 'forbidden' };

  const user = await User.findOne({ clerkId }).select('sellerId').lean();
  if (!user?.sellerId) return { status: 'forbidden' };

  if (product.sellerId?.toString() !== user.sellerId.toString()) {
    return { status: 'forbidden' };
  }

  // The product crosses the Server -> Client Component boundary, and a
  // Mongoose ObjectId/Date is not something React can serialise. Same
  // treatment getSellerContextData gives the seller.
  return { status: 'ok', product: JSON.parse(JSON.stringify(product)) };
}
