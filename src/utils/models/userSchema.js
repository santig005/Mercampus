import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
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

//para no crear el modelo siempre
export const User = mongoose.models.User || mongoose.model('User', userSchema);
