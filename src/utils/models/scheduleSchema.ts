import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const scheduleSchema = new Schema({
  sellerId: {
    type: Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  day: {
    type: Number,
    required: true,
  },
});

// Todas las consultas de horarios son por vendedor.
scheduleSchema.index({ sellerId: 1 });

export type ScheduleDoc = InferSchemaType<typeof scheduleSchema>;

export const Schedule: Model<ScheduleDoc> =
  (mongoose.models.Schedule as Model<ScheduleDoc>) ||
  mongoose.model<ScheduleDoc>('Schedule', scheduleSchema);
