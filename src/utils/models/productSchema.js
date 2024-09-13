import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
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
    images: [
      {
      type: String,
      required: true,
      },
    ],
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },   
    createdAt: {
      type: Date,
      default: Date.now
  }
  },
);

export const Product =
  mongoose.models.Product || mongoose.model('Product', productSchema);
