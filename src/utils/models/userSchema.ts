import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const userSchema = new Schema(
  {
    // The user's Clerk id (`user_...`). It is the key joining Clerk and
    // Mongo: immutable, unlike the email, and available without calling
    // Clerk's API because `auth()` already returns it.
    //
    // The webhook always looked it up by this field, but the field did not
    // exist in the schema, so Mongoose threw StrictModeError on every
    // `user.created` and the try/catch swallowed it: not a single user was
    // ever created through that path.
    clerkId: {
      type: String,
      required: false, // users created before the webhook do not have it
      unique: true,
      sparse: true, // needed alongside unique so several documents may lack the field
    },
    name: {
      type: String,
      required: true,
      unique: false,
    },
    lastName: {
      type: String,
      unique: false,
    },
    email: {
      type: String,
      required: true,
      // unique: true,  // waiting on T-11: duplicates must be migrated first
    },
    role: {
      type: String,
      default: 'buyer',
      enum: ['buyer', 'seller', 'admin'],
    },
    imageProfile: {
      type: String,
      default: '',
    },
    // Reference to the Seller document tied to this user, if there is one.
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'Seller',
      required: false, // a user is not necessarily a seller
      unique: true, // but can only have one seller profile
      sparse: true, // needed alongside unique so several documents may lack the field
    },
  },
  {
    timestamps: true,
  }
);

// Email is the key the user is looked up by on every authorisation check. No
// unique: that comes with T-11, which first has to migrate the duplicates
// already in the database.
userSchema.index({ email: 1 });

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ||
  mongoose.model<UserDoc>('User', userSchema);
