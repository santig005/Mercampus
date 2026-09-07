import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

import { universities } from '@/utils/resources/universities';

const sellerSchema = new Schema(
  {
    businessName: {
      type: String,
      required: true,
    },
    slogan: {
      type: String,
    },
    description: {
      type: String,
    },
    logo: {
      type: String,
      default:
        'https://ik.imagekit.io/iebk3hngu/sellerlogos/whisk1.png?updatedAt=1739224183820',
    },
    instagramUser: {
      type: String,
    },
    // Open right now, per the seller's Schedule. Recomputed for every seller
    // by the T-14 cron (GET /api/sellers/availability), so anything a human
    // writes here is overwritten on the next run: it can't hold a multi-day
    // absence. That's what `paused` below is for - see T-71.
    availability: {
      type: Boolean,
      default: true,
    },
    // T-71: the seller took their store off the public listings themselves
    // (exam week, illness, travel). Deliberately separate from `approved`
    // (an admin decision the seller can't undo) and from `availability`
    // (today's schedule): pausing keeps both the approval and the catalog.
    // Existing documents have no `paused` field at all, so every query that
    // filters on it must use `$ne: true`, never `false` - see the note in
    // api/products/route.js.
    paused: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      type: Number,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approved: {
      type: Boolean,
      default: false,
    },
    university: {
      type: String,
      default: 'Universidad EAFIT',
      enum: universities,
    },
  },
  {
    timestamps: true,
  }
);

// userId: para resolver el vendedor a partir del usuario autenticado.
// university: el listado publico filtra por universidad.
sellerSchema.index({ userId: 1 });
sellerSchema.index({ university: 1 });

export type SellerDoc = InferSchemaType<typeof sellerSchema>;

export const Seller: Model<SellerDoc> =
  (mongoose.models.Seller as Model<SellerDoc>) ||
  mongoose.model<SellerDoc>('Seller', sellerSchema);

export default Seller;
