import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

import { pqrsTypes } from '@/utils/resources/pqrs';

const pqrsSchema = new Schema({
  email: {
    type: String,
    required: false,
  },
  description: {
    type: String,
    required: false,
  },
  type: {
    type: String,
    enum: pqrsTypes,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export type PqrsDoc = InferSchemaType<typeof pqrsSchema>;

export const Pqrs: Model<PqrsDoc> =
  (mongoose.models.Pqrs as Model<PqrsDoc>) ||
  mongoose.model<PqrsDoc>('Pqrs', pqrsSchema);
