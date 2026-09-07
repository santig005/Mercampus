import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

import { antojosCategories } from '@/utils/resources/categories';
import { marketplaceCategories } from '@/utils/resources/marketplaceCategories';

const productSchema = new Schema(
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
      type: Schema.Types.ObjectId,
      // OJO: el valor real es un id de Seller, no de User. Las rutas lo pueblan
      // con `model: 'Seller'` explicito. Corregir el ref sin migrar los datos
      // romperia el populate; hay un test de T-03 que fija el comportamiento.
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
      type: [String],
      required: true,
    },
    section: {
      type: String,
      required: true,
      default: 'antojos',
      enum: ['antojos', 'marketplace'],
    },
    category: {
      type: [String],
      required: true,
      validate: {
        // `this` es el documento que se valida. Hay que anotarlo: bajo strict
        // seria un any implicito, y de ese `this.section` depende contra que
        // lista se comprueban las categorias.
        validator: function (this: { section?: string }, categories: string[]) {
          const validCategories =
            this.section === 'marketplace'
              ? marketplaceCategories
              : antojosCategories;
          return categories.every(category =>
            validCategories.includes(category)
          );
        },
        message: 'Las categorías deben pertenecer a la sección del producto',
      },
    },
    stock: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// El listado filtra siempre por section y, cuando se pide un vendedor, por
// sellerId. Sin indices ambos eran collection scan.
productSchema.index({ sellerId: 1 });
productSchema.index({ section: 1 });
// T-23: el listado pagina con un cursor que sigue este mismo orden
// (availability desc, createdAt desc, _id como desempate). Sin este indice,
// ordenar la coleccion completa para cada pagina es un sort en memoria que
// crece con el tamaño de la coleccion, no con el tamaño de la pagina.
productSchema.index({ section: 1, availability: -1, createdAt: -1 });

export type ProductDoc = InferSchemaType<typeof productSchema>;

export const Product: Model<ProductDoc> =
  (mongoose.models.Product as Model<ProductDoc>) ||
  mongoose.model<ProductDoc>('Product', productSchema);
