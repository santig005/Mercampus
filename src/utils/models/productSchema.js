import { antojosCategories } from '@/utils/resources/categories';
import { marketplaceCategories } from '@/utils/resources/marketplaceCategories';
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
    section: {
      type: String,
      required: true,
      default: 'antojos',
      enum: ['antojos', 'marketplace']
    },
    category: {
      type: [String],
      required: true,
      validate: {
        validator: function(categories) {
          // Validar que las categorías pertenezcan a la sección correcta
          const validCategories = this.section === 'marketplace' 
            ? marketplaceCategories 
            : antojosCategories;
          return categories.every(cat => validCategories.includes(cat));
        },
        message: 'Las categorías deben pertenecer a la sección del producto'
      }
    },
    stock:{
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

export const Product =
  mongoose.models.Product || mongoose.model('Product', productSchema);
