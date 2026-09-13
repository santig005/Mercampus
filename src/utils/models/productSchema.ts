import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

import { antojosCategories } from '@/utils/resources/categories';
import { marketplaceCategories } from '@/utils/resources/marketplaceCategories';

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      // CAREFUL: the actual value is a Seller id, not a User id. The routes
      // populate it with an explicit `model: 'Seller'`. Fixing the ref
      // without migrating the data would break that populate; a T-03 test
      // pins the behaviour down.
      ref: 'User',
      required: true,
    },
    availability: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      required: true,
    },
    section: {
      type: String,
      required: true,
      default: 'antojos',
      enum: ['antojos', 'marketplace'],
    },
    category: {
      type: [String],
      required: true,
      validate: {
        // `this` is the document being validated. It has to be annotated:
        // under strict it would be an implicit any, and which list the
        // categories are checked against depends on that `this.section`.
        validator: function (this: { section?: string }, categories: string[]) {
          const validCategories =
            this.section === 'marketplace'
              ? marketplaceCategories
              : antojosCategories;
          return categories.every(category =>
            validCategories.includes(category)
          );
        },
        message: 'Las categorías deben pertenecer a la sección del producto',
      },
    },
    stock: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// The listing always filters by section and, when a seller is requested, by
// sellerId. Without indexes both were collection scans.
productSchema.index({ sellerId: 1 });
productSchema.index({ section: 1 });
// T-23: the listing paginates with a cursor that follows this same order
// (availability desc, createdAt desc, _id as the tie-breaker). Without this
// index, ordering the whole collection for each page is an in-memory sort
// that grows with the size of the collection, not the size of the page.
productSchema.index({ section: 1, availability: -1, createdAt: -1 });
// T-70: the 'newest' and 'price_asc'/'price_desc' sorts filter by section
// just like the default, but order by a different field - each one needs its
// own index to avoid falling back to an in-memory sort. price_desc reuses
// this same index by walking it backwards (Mongo can scan an index in either
// direction).
productSchema.index({ section: 1, createdAt: -1 });
productSchema.index({ section: 1, price: 1 });

export type ProductDoc = InferSchemaType<typeof productSchema>;

export const Product: Model<ProductDoc> =
  (mongoose.models.Product as Model<ProductDoc>) ||
  mongoose.model<ProductDoc>('Product', productSchema);
