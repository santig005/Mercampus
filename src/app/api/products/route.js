import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Product } from '@/utils/models/productSchema';
import { User } from '@/utils/models/userSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';
import { getSchedulesBySeller, withDayNames } from '@/utils/lib/schedules';
import {
  createProductSchema,
  encodeProductCursor,
  productQuerySchema,
} from '@/lib/validators/product';
import { SORT_CONFIGS } from '@/lib/sorting/product-sort';
import { invalidPayload } from '@/lib/api-response';
import { publicSellerFilter } from '@/lib/public-visibility';
import { buildAccentInsensitiveRegex } from '@/utils/lib/search';
// Not used by name, but the import registers the model with Mongoose and the
// GET's populate({ model: 'Seller' }) needs it registered. Delete it and the
// listing blows up with MissingSchemaError.
import { Seller } from '@/utils/models/sellerSchema2'; // eslint-disable-line no-unused-vars
import { logger } from '@/lib/logger';

export async function GET(req) {
  await connectDB();

  const url = new URL(req.url);
  const parsedQuery = productQuerySchema.safeParse(
    Object.fromEntries(url.searchParams)
  );
  if (!parsedQuery.success) {
    return invalidPayload(parsedQuery.error);
  }
  const { product, category, sellerId, university, section, sort, limit, cursor } =
    parsedQuery.data;
  const sortConfig = SORT_CONFIGS[sort];

  // This used to be a populate({match: {approved, university}}) that pulled
  // the WHOLE collection, populated it, and only then dropped in JS the
  // products of unapproved sellers or sellers from another university. That
  // breaks any pagination in Mongo: a limit()/skip() over the unfiltered
  // query has no idea how many of those items will survive the later filter.
  // Resolving it up front, as eligible ids, lets Product.find paginate over
  // exactly the products that are going to be shown.
  //
  // T-71: `paused` belongs right here next to `approved`, not in a filter over
  // the page Mongo already returned - a paused seller has to be gone before
  // the limit is counted, for the same reason.
  //
  // It has to be `$ne: true`, never `paused: false`: none of the 54 sellers
  // already in the database carry the field (measured read-only against the
  // real one), and an equality filter doesn't match a missing field, so
  // `false` would have emptied the listing for everybody instead of hiding
  // the paused ones. `$ne: true` matches the old field-less documents too,
  // which is why the schema default is enough and no migration is needed.
  const eligibleSellerIds = await Seller.find({
    ...publicSellerFilter(),
    university: { $regex: university, $options: 'i' },
  }).distinct('_id');

  if (sellerId) {
    const isEligible = eligibleSellerIds.some(id => id.toString() === sellerId);
    if (!isEligible) {
      return NextResponse.json({ products: [], nextCursor: null }, { status: 200 });
    }
  }

  const filter = {
    sellerId: sellerId || { $in: eligibleSellerIds },
  };

  if (category) {
    filter.category = { $in: [category] };
  }

  if (product) {
    // Our own regex rather than a $text index: the search runs live from 2
    // characters (SearchBox.jsx), and $text doesn't match by prefix ("bro"
    // doesn't find "Brownie" until it is almost fully typed, measured
    // against real data) - that would have broken search-as-you-type. This
    // keeps the substring/prefix behaviour there has always been and only
    // adds accent tolerance.
    filter.name = buildAccentInsensitiveRegex(product);
  }

  if (section) {
    filter.section = section;
  }

  // T-70: each sort brings its own Mongo order and its own
  // "next page" filter (see SORT_CONFIGS) - a per-request random order, as
  // this had before, can't be paginated with a stable cursor (page 2 could
  // repeat or skip products from page 1).
  if (cursor) {
    Object.assign(filter, sortConfig.buildCursorFilter(cursor));
  }

  // One extra item is requested to know whether there is a next page without
  // a second countDocuments query.
  const products = await Product.find(filter)
    .sort(sortConfig.mongoSort)
    .limit(limit + 1)
    .populate({ path: 'sellerId', model: 'Seller' })
    .lean();

  const hasMore = products.length > limit;
  const page = hasMore ? products.slice(0, limit) : products;

  const populated = await getPopulatedProducts(page);

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeProductCursor(sortConfig.encodeCursorPayload(last))
      : null;

  return NextResponse.json({ products: populated, nextCursor }, { status: 200 });
}

const getPopulatedProducts = async approvedProducts => {
  // A single query for every seller in the listing, instead of one per
  // product.
  const schedulesBySeller = await getSchedulesBySeller(
    approvedProducts.map(product => product.sellerId._id)
  );

  // .lean() already returns plain objects, not Mongoose documents: calling
  // .toObject() here is unnecessary (and wrong).
  return approvedProducts.map(product => ({
    ...product,
    schedules: withDayNames(
      schedulesBySeller.get(product.sellerId._id.toString()) ?? []
    ),
  }));
};

export async function POST(req) {
  try {
    await connectDB();
    // This used to be `if (clerkUser) { ... }` with no `else`: a request
    // without a session left the handler returning no Response at all, so it
    // produced a framework error rather than a 401. And `user._id` on a user
    // that didn't exist in Mongo blew up with a TypeError.
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }

    // The User already records which seller it belongs to: looking the
    // Seller up by userId separately is redundant.
    const user = await User.findOne({ clerkId }).select('sellerId').lean();
    if (!user?.sellerId) {
      return NextResponse.json(
        { mensaje: 'El usuario no es un vendedor' },
        { status: 403 }
      );
    }

    const parsed = createProductSchema.safeParse(await req.json());
    if (!parsed.success) {
      return invalidPayload(parsed.error);
    }

    // sellerId comes from the session, never from the body: the schema drops
    // whatever it doesn't declare, so the client can't sneak it in.
    const newProduct = new Product({
      ...parsed.data,
      sellerId: user.sellerId,
    });
    await newProduct.save();

    return NextResponse.json(
      { message: 'Product created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating product', error);
    return NextResponse.json(
      { message: 'Error creating product', error: error.message },
      { status: 500 }
    );
  }
}
