import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

// T-154: one document per fixed window of one rate-limit bucket. `key` is
// `<scope>:<identity>:<windowStart>`, so a new window is a new document and
// the old one is never rewritten - it just ages out through the TTL index.
const rateLimitSchema = new Schema({
  key: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    required: true,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// The atomic upsert filters by `key`; unique so two concurrent upserts of the
// same window can't create two counters (the loser gets E11000 and retries).
rateLimitSchema.index({ key: 1 }, { unique: true });
// TTL: Mongo deletes a window once it has ended. The TTL monitor runs about
// once a minute, which is fine - an expired window is never read again
// because the next request computes a different key.
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RateLimitDoc = InferSchemaType<typeof rateLimitSchema>;

export const RateLimit: Model<RateLimitDoc> =
  (mongoose.models.RateLimit as Model<RateLimitDoc>) ||
  mongoose.model<RateLimitDoc>('RateLimit', rateLimitSchema);
