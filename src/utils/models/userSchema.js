import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema(
  {
    clerkId: {
      type: String,
      required: false,
      unique: true,
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
      // unique: true,
    },
    role: {
      type: String,
      default: 'buyer',
      enum: ['buyer', 'seller'],
    },
    imageProfile: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
