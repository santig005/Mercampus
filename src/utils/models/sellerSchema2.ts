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
    availability: {
      type: Boolean,
      default: true,
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
