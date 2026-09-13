import mongoose from 'mongoose';

import type { ProductCursor, ProductSort } from '@/lib/validators/product';

type ProductLike = {
  _id: mongoose.Types.ObjectId | string;
  availability: boolean;
  price: number;
  createdAt: Date;
};

type CursorFor<S extends ProductSort> = Extract<ProductCursor, { sort: S }>;

type SortConfig<S extends ProductSort> = {
  // The same sort spec Mongoose's .sort() receives.
  mongoSort: Record<string, 1 | -1>;
  // Turns the previous page's cursor into the filter that fetches "what
  // comes next" under this order.
  buildCursorFilter: (cursor: CursorFor<S>) => Record<string, unknown>;
  encodeCursorPayload: (last: ProductLike) => CursorFor<S>;
};

const objectId = (id: string) => new mongoose.Types.ObjectId(id);

// T-23 pinned down 'default' (availability desc, createdAt desc, _id as the
// tie-breaker). T-70 adds 'newest' and both price directions on top of the
// same pagination machinery: each sort declares its own Mongo order, its
// "next page" filter built from the cursor, and how to build the cursor for
// the page it returns. The route knows none of these details, it just indexes
// this map by the already-validated `sort`.
export const SORT_CONFIGS: { [S in ProductSort]: SortConfig<S> } = {
  default: {
    mongoSort: { availability: -1, createdAt: -1, _id: -1 },
    buildCursorFilter: cursor => {
      // createdAt is a BSON Date in Mongo; the cursor carries it as an ISO
      // string (that is how it travels in JSON), so it has to be converted
      // back before comparing, or $lt/$eq match nothing on the type
      // mismatch.
      const cursorCreatedAt = new Date(cursor.createdAt);
      return {
        $or: [
          { availability: { $lt: cursor.availability } },
          { availability: cursor.availability, createdAt: { $lt: cursorCreatedAt } },
          {
            availability: cursor.availability,
            createdAt: cursorCreatedAt,
            _id: { $lt: objectId(cursor.id) },
          },
        ],
      };
    },
    encodeCursorPayload: last => ({
      sort: 'default',
      availability: last.availability,
      createdAt: last.createdAt.toISOString(),
      id: last._id.toString(),
    }),
  },
  newest: {
    mongoSort: { createdAt: -1, _id: -1 },
    buildCursorFilter: cursor => {
      const cursorCreatedAt = new Date(cursor.createdAt);
      return {
        $or: [
          { createdAt: { $lt: cursorCreatedAt } },
          { createdAt: cursorCreatedAt, _id: { $lt: objectId(cursor.id) } },
        ],
      };
    },
    encodeCursorPayload: last => ({
      sort: 'newest',
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
    encodeCursorPayload: last => ({
      sort: 'price_asc',
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
    encodeCursorPayload: last => ({
      sort: 'price_desc',
      price: last.price,
      id: last._id.toString(),
    }),
  },
};
