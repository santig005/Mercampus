import { NextResponse } from 'next/server';
import { z } from 'zod';

import { errorResponse, invalidPayload } from '@/lib/api-response';
import { productAvailability } from '@/lib/store-availability';
import { sellerIdSchema } from '@/lib/validators/seller';
import { connectDB } from '@/utils/connectDB';
import { getSchedulesBySeller, withDayNames } from '@/utils/lib/schedules';
import { Product } from '@/utils/models/productSchema';
// Not used by name, but the import registers the model with Mongoose: the
// populate({ model: 'Seller' }) below needs it registered (same pattern as
// api/products/route.js).
import { Seller } from '@/utils/models/sellerSchema'; // eslint-disable-line no-unused-vars

const querySchema = z.object({
  section: z.enum(['antojos', 'marketplace']).optional(),
});

// T-165: every product of one seller - the "all products of this seller" list
// in SellerModal and SellerPage, and the seller's own edit screen.
//
// Each product now comes in the same shape as the listing (GET /api/products)
// and the product detail (GET /api/products/[id]): `sellerId` populated, the
// seller's `schedules` with day names, and `availabilityStatus`. This used to
// be a bare Product.find(): `sellerId` was just an id and there were no
// schedules, so a product opened from a seller's list (product -> seller ->
// product) showed no seller name, logo or schedule, and its WhatsApp button
// pointed at `wa.me/+57?text=...` - no number, on the product's only
// conversion button. ProductModal reads `product.sellerId` and
// `product.schedules` and could not tell the two shapes apart.
//
// Not changed here, on purpose: visibility. This still returns the products
// of any seller id, approved or not, because the seller's own edit screen
// reads it too and must keep seeing its products while paused. Splitting the
// owner's read from the public one is its own task (see ROADMAP.md T-165).
export async function GET(req, { params }) {
  const parsedId = sellerIdSchema.safeParse(params.id);
  if (!parsedId.success) {
    return invalidPayload(parsedId.error);
  }

  const url = new URL(req.url);
  const parsedQuery = querySchema.safeParse({
    section: url.searchParams.get('section') || undefined,
  });
  if (!parsedQuery.success) {
    return invalidPayload(parsedQuery.error);
  }

  try {
    await connectDB();

    // Lowercase: getSchedulesBySeller keys its map by ObjectId.toString(),
    // which is always lowercase hex, and the regex accepts either case.
    const sellerId = parsedId.data.toLowerCase();
    const filter = { sellerId };
    if (parsedQuery.data.section) {
      filter.section = parsedQuery.data.section;
    }

    const [products, schedulesBySeller] = await Promise.all([
      Product.find(filter).populate({ path: 'sellerId', model: 'Seller' }).lean(),
      getSchedulesBySeller([sellerId]),
    ]);

    // One seller, so one set of schedules for every product.
    const schedules = schedulesBySeller.get(sellerId) ?? [];
    const now = new Date();

    return NextResponse.json(
      {
        products: products.map(product => ({
          ...product,
          schedules: withDayNames(schedules),
          // Same definition as the listing and the detail (T-122, T-83),
          // from the numeric days, before withDayNames swaps them.
          availabilityStatus: productAvailability(
            product.availability,
            schedules,
            now,
            product.sellerId?.availabilityOverrideUntil
          ),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error, '[GET /api/products/seller/[id]]', { bodyKey: 'message' });
  }
}
