import mongoose from 'mongoose';

import type {
  AvailabilityFilter,
  AvailabilityPhase,
  ProductCursor,
  ProductSort,
} from '@/lib/validators/product';

type ProductLike = {
  _id: mongoose.Types.ObjectId | string;
  price: number;
  createdAt: Date;
};

type CursorFor<S extends ProductSort> = Extract<ProductCursor, { sort: S }>;

// T-123: what the page was listed under. `phase` is the block the last product
// came from; only the 'default' order has blocks.
export type CursorContext = {
  filter: AvailabilityFilter;
  phase: AvailabilityPhase;
};

type SortConfig<S extends ProductSort> = {
  // The same sort spec Mongoose's .sort() receives.
  mongoSort: Record<string, 1 | -1>;
  // Turns the previous page's cursor into the filter that fetches "what
  // comes next" under this order.
  buildCursorFilter: (cursor: CursorFor<S>) => Record<string, unknown>;
  encodeCursorPayload: (last: ProductLike, context: CursorContext) => CursorFor<S>;
};

const objectId = (id: string) => new mongoose.Types.ObjectId(id);

// createdAt is a BSON Date in Mongo; the cursor carries it as an ISO string
// (that is how it travels in JSON), so it has to be converted back before
// comparing, or $lt/$eq match nothing on the type mismatch.
const afterCreatedAt = (cursor: { createdAt: string; id: string }) => {
  const cursorCreatedAt = new Date(cursor.createdAt);
  return {
    $or: [
      { createdAt: { $lt: cursorCreatedAt } },
      { createdAt: cursorCreatedAt, _id: { $lt: objectId(cursor.id) } },
    ],
  };
};

// T-70 adds 'newest' and both price directions on top of the pagination
// machinery T-23 built for 'default': each sort declares its own Mongo order,
// its "next page" filter built from the cursor, and how to build the cursor for
// the page it returns. The route indexes this map by the already-validated
// `sort`.
export const SORT_CONFIGS: { [S in ProductSort]: SortConfig<S> } = {
  // Available first, newest first. Until T-123 "available" was the product's
  // own switch, sorted as a field (availability desc). It now means what the
  // T-122 badge says, which spans Product and Schedule and cannot be a sort
  // key: the route walks two blocks, available then the rest, each in this
  // order, and the cursor records which block it stopped in.
  default: {
    mongoSort: { createdAt: -1, _id: -1 },
    buildCursorFilter: afterCreatedAt,
    encodeCursorPayload: (last, { filter, phase }) => ({
      sort: 'default',
      filter,
      phase,
      createdAt: last.createdAt.toISOString(),
      id: last._id.toString(),
    }),
  },
  newest: {
    mongoSort: { createdAt: -1, _id: -1 },
    buildCursorFilter: afterCreatedAt,
    encodeCursorPayload: (last, { filter }) => ({
      sort: 'newest',
      filter,
      createdAt: last.createdAt.toISOString(),
      id: last._id.toString(),
    }),
  },
  price_asc: {
    mongoSort: { price: 1, _id: 1 },
    buildCursorFilter: cursor => ({
      $or: [
        { price: { $gt: cursor.price } },
        { price: cursor.price, _id: { $gt: objectId(cursor.id) } },
      ],
    }),
    encodeCursorPayload: (last, { filter }) => ({
      sort: 'price_asc',
      filter,
      price: last.price,
      id: last._id.toString(),
    }),
  },
  price_desc: {
    mongoSort: { price: -1, _id: -1 },
    buildCursorFilter: cursor => ({
      $or: [
        { price: { $lt: cursor.price } },
        { price: cursor.price, _id: { $lt: objectId(cursor.id) } },
      ],
    }),
    encodeCursorPayload: (last, { filter }) => ({
      sort: 'price_desc',
      filter,
      price: last.price,
      id: last._id.toString(),
    }),
  },
};
