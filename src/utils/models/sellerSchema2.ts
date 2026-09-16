import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

import { universities } from '@/utils/resources/universities';

// Exported because it is not just a default: it is the value that means "this
// seller never picked a logo". T-72's checklist has to compare against it -
// every seller has a `logo`, so a truthiness check would call all of them
// done. Measured read-only against the real database: of the 7 approved
// sellers without a real logo, 6 carry exactly this placeholder.
export const DEFAULT_SELLER_LOGO =
  'https://ik.imagekit.io/iebk3hngu/sellerlogos/whisk1.png?updatedAt=1739224183820';

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
      default: DEFAULT_SELLER_LOGO,
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
    // T-83: the seller opening outside their usual Schedule, for a bounded
    // window - the mirror image of `paused` above (that one hides an open
    // store; this one shows a closed one as open). A single nullable
    // timestamp rather than a boolean + expiry pair: there is no way to
    // represent "override on, no expiry" - the exact bug the task called
    // out - because the override IS the expiry. `isOpenAt()`
    // (src/lib/store-availability.ts) composes it with the schedule so both
    // the T-14 cron and the product routes see it the same way, and it
    // self-expires by comparison against `now`, so nothing has to clear it
    // when the window passes. Every existing document predates this field,
    // exactly like `paused` did at T-71 - reads must not assume it exists.
    availabilityOverrideUntil: {
      type: Date,
      default: null,
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

// userId: to resolve the seller from the authenticated user.
// university: the public listing filters by university.
sellerSchema.index({ userId: 1 });
sellerSchema.index({ university: 1 });

export type SellerDoc = InferSchemaType<typeof sellerSchema>;

export const Seller: Model<SellerDoc> =
  (mongoose.models.Seller as Model<SellerDoc>) ||
  mongoose.model<SellerDoc>('Seller', sellerSchema);

export default Seller;
