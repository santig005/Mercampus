import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Product } from '@/utils/models/productSchema';
import { User } from '@/utils/models/userSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';
import { getSchedulesBySeller, withDayNames } from '@/utils/lib/schedules';
import {
  AVAILABILITY_PHASES,
  createProductSchema,
  encodeProductCursor,
  productQuerySchema,
} from '@/lib/validators/product';
import { SORT_CONFIGS } from '@/lib/sorting/product-sort';
import { invalidPayload } from '@/lib/api-response';
import { publicSellerFilter } from '@/lib/public-visibility';
import { productAvailability } from '@/lib/store-availability';
import { getAvailableSellerIds } from '@/server/products/availableSellers';
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
  const {
    product,
    category,
    sellerId,
    university,
    section,
    sort,
    availability,
    limit,
    cursor,
  } = parsedQuery.data;
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

  // T-123: one clock for the whole request, so the filter, the order and every
  // badge on the page (getPopulatedProducts) agree on what "now" is.
  const now = new Date();

  // Only looked up when something uses it: 'newest' and the price sorts with
  // both options selected ignore availability entirely.
  const availableSellerIds =
    availability === 'all' && sort !== 'default'
      ? null
      : await getAvailableSellerIds(eligibleSellerIds, now);

  // "Available" is the T-122 badge's rule: the product switched on AND its
  // seller open now or without a schedule. `availability: true`, not
  // `$ne: false`: the badge reads a missing field as switched off, so the
  // filter has to as well.
  const phaseFilter = phase =>
    phase === 'available'
      ? { availability: true, sellerId: { $in: availableSellerIds } }
      : {
          $or: [
            { availability: { $ne: true } },
            { sellerId: { $nin: availableSellerIds } },
          ],
        };

  // $and rather than merging into `filter`: the phase and the cursor bring
  // their own `sellerId` and `$or`, and a merge would overwrite the listing's.
  // One extra item is requested to know whether there is a next page without a
  // second countDocuments query.
  const findPage = (conditions, pageLimit) =>
    Product.find({ $and: [filter, ...conditions.filter(Boolean)] })
      .sort(sortConfig.mongoSort)
      .limit(pageLimit + 1)
      .populate({ path: 'sellerId', model: 'Seller' })
      .lean();

  const page = [];
  let last = null; // the page's last product, and the block it came from
  let hasMore = false;

  if (sort === 'default') {
    // T-123: "available first" spans two collections, so it is not a sort key.
    // The listing is walked as two blocks, each newest first, and a page that
    // runs out of the first block is topped up from the second. With one
    // option selected there is only that block.
    const phases = availability === 'all' ? AVAILABILITY_PHASES : [availability];
    const start = cursor ? phases.indexOf(cursor.phase) : 0;

    for (let i = start; i < phases.length && !hasMore; i++) {
      const phase = phases[i];
      const remaining = limit - page.length;
      const after =
        cursor && cursor.phase === phase ? sortConfig.buildCursorFilter(cursor) : null;

      const found = await findPage([phaseFilter(phase), after], remaining);
      hasMore = found.length > remaining;

      const taken = found.slice(0, remaining);
      page.push(...taken);
      if (taken.length > 0) {
        last = { product: taken[taken.length - 1], phase };
      }
    }
  } else {
    // T-70: each sort brings its own Mongo order and its own "next page"
    // filter (see SORT_CONFIGS) - a per-request random order, as this had
    // before, can't be paginated with a stable cursor.
    const found = await findPage(
      [
        availability === 'all' ? null : phaseFilter(availability),
        cursor ? sortConfig.buildCursorFilter(cursor) : null,
      ],
      limit
    );
    hasMore = found.length > limit;
    page.push(...found.slice(0, limit));
    if (page.length > 0) {
      last = { product: page[page.length - 1], phase: 'available' };
    }
  }

  const populated = await getPopulatedProducts(page, now);

  const nextCursor =
    hasMore && last
      ? encodeProductCursor(
          sortConfig.encodeCursorPayload(last.product, {
            filter: availability,
            phase: last.phase,
          })
        )
      : null;

  return NextResponse.json({ products: populated, nextCursor }, { status: 200 });
}

const getPopulatedProducts = async (approvedProducts, now) => {
  // A single query for every seller in the listing, instead of one per
  // product.
  const schedulesBySeller = await getSchedulesBySeller(
    approvedProducts.map(product => product.sellerId._id)
  );

  // .lean() already returns plain objects, not Mongoose documents: calling
  // .toObject() here is unnecessary (and wrong).
  return approvedProducts.map(product => {
    const schedules = schedulesBySeller.get(product.sellerId._id.toString()) ?? [];
    return {
      ...product,
      schedules: withDayNames(schedules),
      // T-122: computed from the numeric days, before withDayNames swaps them.
      // T-123: with the request's own clock, so the badge matches the block.
      availabilityStatus: productAvailability(product.availability, schedules, now),
    };
  });
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
