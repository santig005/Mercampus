import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

import { ORDER_STATUSES } from '@/server/orders/stateMachine';

const lineItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    // Copied when the order is created: if the seller edits the price or
    // deletes the product later, an order already placed must not change
    // retroactively.
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
    // An order always belongs to a single seller. There is no multi-seller
    // cart today (contact is a WhatsApp link per product), so splitting by
    // seller from the start avoids redesigning the schema if a real cart
    // shows up later.
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
    // Written exclusively through transitionOrder() (stateMachine.ts).
    // Embedded in the same document -- not in a separate collection --
    // because mongodb-memory-server runs standalone (no replica set, see
    // T-10b): writing to two collections would need a transaction that the
    // current harness cannot test.
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
