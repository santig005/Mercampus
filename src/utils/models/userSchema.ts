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
      required: false, // los usuarios anteriores al webhook no lo tienen
      unique: true,
      sparse: true, // necesario con unique para permitir varios sin el campo
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
      required: false, // un usuario no tiene por que ser vendedor
      unique: true, // pero solo puede tener un perfil de vendedor
      sparse: true, // necesario con unique para permitir varios sin el campo
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
