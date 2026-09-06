import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

import { ORDER_STATUSES } from '@/server/orders/stateMachine';

const lineItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    // Copiados al crear el pedido: si el vendedor edita el precio o borra el
    // producto despues, el pedido ya hecho no debe cambiar retroactivamente.
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const historyEntrySchema = new Schema(
  {
    status: {
      type: String,
      required: true,
      enum: ORDER_STATUSES,
    },
    at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Un pedido es siempre de un solo vendedor. Hoy no existe carrito
    // multi-vendedor (el contacto es un link de WhatsApp por producto), asi
    // que partir por vendedor desde ya evita rediseñar el schema si mas
    // adelante se agrega un carrito de verdad.
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
    },
    lineItems: {
      type: [lineItemSchema],
      required: true,
      validate: {
        validator: (items: unknown[]) => items.length > 0,
        message: 'El pedido debe tener al menos un producto.',
      },
    },
    status: {
      type: String,
      required: true,
      enum: ORDER_STATUSES,
      default: 'pending',
    },
    // Se escribe exclusivamente a traves de transitionOrder() (stateMachine.ts).
    // Embebido en el mismo documento -y no en una coleccion aparte- porque
    // mongodb-memory-server corre en modo standalone (sin replica set, ver
    // T-10b): una escritura en dos colecciones necesitaria una transaccion que
    // hoy no se puede probar con el arnes que existe.
    history: {
      type: [historyEntrySchema],
      required: true,
      default: () => [{ status: 'pending', at: new Date() }],
    },
  },
  { timestamps: true }
);

orderSchema.index({ buyerId: 1 });
orderSchema.index({ sellerId: 1 });

export type OrderDoc = InferSchemaType<typeof orderSchema>;

export const Order: Model<OrderDoc> =
  (mongoose.models.Order as Model<OrderDoc>) ||
  mongoose.model<OrderDoc>('Order', orderSchema);
