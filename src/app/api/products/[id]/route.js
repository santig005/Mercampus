import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { AppError } from '@/utils/lib/errors';
import { productIdSchema, updateProductSchema } from '@/lib/validators/product';
import { errorResponse, invalidPayload } from '@/lib/api-response';
import { publicSellerFilter } from '@/lib/public-visibility';
import { verifyOwnershipAndGetSellerId } from '@/utils/lib/auth';
import { getSchedulesBySeller, withDayNames } from '@/utils/lib/schedules';
import { Product } from '@/utils/models/productSchema';
// Not used by name, but the import registers the model with Mongoose: the
// GET's populate({ model: 'Seller' }) needs it registered, or it blows up
// with MissingSchemaError (same pattern as api/products/route.js).
import { Seller } from '@/utils/models/sellerSchema2'; // eslint-disable-line no-unused-vars

const notFound = () =>
  NextResponse.json({ message: 'Product not found' }, { status: 404 });

// The public product detail. ProductPage (the buyer's screen) is its only
// caller: the seller's edit screen used to read it too, and since T-97 it
// resolves the product on the server instead - it needs its own product even
// when the public would not be shown it.
export async function GET(req, { params }) {
  // T-97 (audit finding F29): a malformed id went straight to Mongoose and
  // came back as a 500 carrying the CastError - internal model name included -
  // in the response body. Validated here, before connecting, like every other
  // param in this app.
  const parsedId = productIdSchema.safeParse(params.id);
  if (!parsedId.success) {
    return invalidPayload(parsedId.error);
  }

  try {
    await connectDB();

    // T-97 (audit finding F28): the owner is still populated behind a filter,
    // but the result is now checked before being dereferenced. This used to
    // populate with `match: { approved: true }` and then read
    // `product.sellerId._id` on the very next line, so every product whose
    // seller is not visible answered **500** with "Cannot read properties of
    // null". Measured read-only against the real database on 2026-09-08: 17
    // of 112 products - 14 belonging to 10 unapproved sellers, and 3 whose
    // sellerId points at a seller that no longer exists.
    //
    // publicSellerFilter() rather than a fourth hand-written copy of the rule
    // (T-74's note): this route disagreed with the listing, the seller list
    // and the sitemap by leaving `paused` out, so a paused seller's product
    // stayed reachable by direct link. No seller carries `paused` today (0 of
    // 54, measured), so that half of the change moves no existing row.
    const product = await Product.findById(parsedId.data)
      .populate({ path: 'sellerId', model: 'Seller', match: publicSellerFilter() })
      .lean();

    // Two different reasons, one answer on purpose: the product does not
    // exist, or its owner is not public. A 404 either way - telling them
    // apart would say "this product exists but you may not see it", and the
    // buyer has nothing to do with the difference.
    if (!product || !product.sellerId) {
      return notFound();
    }

    const schedules = withDayNames(
      (await getSchedulesBySeller([product.sellerId._id])).get(
        product.sellerId._id.toString()
      ) ?? []
    );

    // .lean() already returns plain objects: .toObject() (what this called
    // before) is unnecessary and would throw on them.
    return NextResponse.json({ ...product, schedules }, { status: 200 });
  } catch (error) {
    // errorResponse never returns a 500's message to the client, which is the
    // other half of F29: the body used to carry the driver's text verbatim.
    return errorResponse(error, 'GET /api/products/:id', { bodyKey: 'message' });
  }
}

export async function PUT(req, { params }) {
  // T-97: F29 named the GET, but the same malformed id reached Mongoose
  // through verifyOwnershipAndGetSellerId() here and in the DELETE, and came
  // back as a 500 with the CastError in the body. One validation, three
  // handlers.
  const parsedId = productIdSchema.safeParse(params.id);
  if (!parsedId.success) {
    return invalidPayload(parsedId.error);
  }

  try {
    await connectDB();

    // Identity and ownership before touching anything. They throw AppError
    // with its status: 401 without a session, 403 if the product belongs to
    // another seller.
    await verifyOwnershipAndGetSellerId(parsedId.data);

    const parsed = updateProductSchema.safeParse(await req.json());
    if (!parsed.success) {
      return invalidPayload(parsed.error);
    }

    const updated = await Product.findByIdAndUpdate(parsedId.data, parsed.data, {
      new: true,
    });
    if (!updated) {
      return NextResponse.json(
        { message: "Producto no encontrado al actualizar." },
        { status: 404 }
      );
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    // Same reason as the GET: an AppError's 401/403/404 message is meant for
    // the client, an unexpected error's is not.
    return errorResponse(err, 'PUT /api/products/:id');
  }
}

export async function DELETE(req, { params }) {
  const parsedId = productIdSchema.safeParse(params.id);
  if (!parsedId.success) {
    return invalidPayload(parsedId.error);
  }

  try {
    await connectDB();

    await verifyOwnershipAndGetSellerId(parsedId.data);

    const deleted = await Product.findByIdAndDelete(parsedId.data);
    if (!deleted) {
      throw new AppError("Producto no encontrado al eliminar.", 404);
    }
    return NextResponse.json({ message: "Producto eliminado" }, { status: 200 });
  } catch (err) {
    return errorResponse(err, 'DELETE /api/products/:id');
  }
}