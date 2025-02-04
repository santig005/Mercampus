import { categories } from '@/utils/resources/categories';
import mongoose from 'mongoose';
const productSchema = new mongoose.Schema(
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
    images: {
      type: [String], // URLs de las imágenes almacenadas en Cloudinary
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: categories, // Example categories
    },
  },
  {
    timestamps: true,
  }
);

export const Product =
  mongoose.models.Product || mongoose.model('Product', productSchema);
