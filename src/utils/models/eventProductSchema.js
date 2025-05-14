// src/utils/models/eventProductSchema.js
import mongoose from 'mongoose';

const eventProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product', // Referencia al modelo Product
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller', // Asumiendo que tienes un modelo Seller, si no, ajústalo a User
      required: true,
    },
    source: {
      type: String,
      required: true,
      enum: ['whatsapp', 'phone_call', 'email_contact'], // Para futura expansión
      default: 'whatsapp',
    },
    eventTimestamp: { // Un timestamp específico para el evento, diferente de createdAt/updatedAt del documento
      type: Date,
      default: Date.now,
      required: true,
    },
    // Otros campos que podrían ser útiles:
    // userAgent: { type: String }, // Para saber desde qué dispositivo/navegador
    // ipAddress: { type: String }, // Con consideraciones de privacidad (GDPR)
    // pageUrl: { type: String } // Desde qué URL específica se hizo el clic
  },
  {
    timestamps: true, // Esto añade createdAt y updatedAt automáticamente para el registro del evento en la BD
  }
);

export const EventProduct =
  mongoose.models.EventProduct ||
  mongoose.model('EventProduct', eventProductSchema);
