import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

import { AppError } from '@/utils/lib/errors';

/**
 * T-155: one record per admin state change on a seller (approve / reject via
 * `PATCH /api/sellers/admin/[id]`). Append-only: a record says who did what to
 * which seller, when and why, and nothing in the app may rewrite or remove it.
 *
 * `actorClerkId` is copied from the server session of the request that made
 * the change (`getClerkUserId()`), never from the request body. It is the id
 * of the Clerk instance that served that request, so no cross-instance
 * `clerkId` is ever written here (see T-12h / T-64).
 */
export const SELLER_AUDIT_ACTIONS = ['approve', 'reject'] as const;

// Bounded in the validator too (`approveSellerSchema`); repeated here so a
// future writer that skips Zod still cannot store an unbounded string.
export const SELLER_AUDIT_REASON_MAX = 500;

const stateSchema = new Schema(
  {
    approved: { type: Boolean, required: true },
  },
  { _id: false }
);

const sellerAuditSchema = new Schema(
  {
    actorClerkId: { type: String, required: true },
    action: { type: String, enum: SELLER_AUDIT_ACTIONS, required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
    previousState: { type: stateSchema, required: true },
    newState: { type: stateSchema, required: true },
    reason: { type: String, trim: true, maxlength: SELLER_AUDIT_REASON_MAX },
  },
  {
    // Only createdAt: a record is never updated, so an updatedAt would only
    // ever equal createdAt and suggest otherwise.
    timestamps: { createdAt: true, updatedAt: false },
    // Mongoose's default would be "selleraudits"; pinned so a model rename
    // cannot silently start a second, empty log.
    collection: 'seller_audit_logs',
  }
);

// The admin screen reads one seller's history, newest first.
sellerAuditSchema.index({ sellerId: 1, createdAt: -1 });

// --- Immutability -----------------------------------------------------------
//
// Every Mongoose path that would rewrite or remove an existing record throws
// before reaching Mongo. Creating (`create`, `insertMany`, `save` of a new
// document) is the only write allowed. This guards the app's own code; it
// does not stop someone with a database credential and the shell, which is a
// matter for Atlas permissions, not for the schema.

const immutable = () => new AppError('Seller audit records are append-only.', 500);

const BLOCKED_QUERY_OPS = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'replaceOne',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
] as const;

for (const op of BLOCKED_QUERY_OPS) {
  sellerAuditSchema.pre(op, { query: true, document: false }, function () {
    throw immutable();
  });
}

// doc.deleteOne() / doc.updateOne() are document middleware, not query.
sellerAuditSchema.pre(['deleteOne', 'updateOne'], { document: true, query: false }, function () {
  throw immutable();
});

// save() on an already-stored document is an update in disguise.
sellerAuditSchema.pre('save', function () {
  if (!this.isNew) throw immutable();
});

// Model.bulkWrite() bypasses query middleware: allow only inserts through it.
sellerAuditSchema.pre('bulkWrite', function (next, ops) {
  const list = Array.isArray(ops) ? ops : [];
  if (list.some(op => !('insertOne' in op))) {
    return next(immutable());
  }
  next();
});

export type SellerAuditDoc = InferSchemaType<typeof sellerAuditSchema>;

export const SellerAudit: Model<SellerAuditDoc> =
  (mongoose.models.SellerAudit as Model<SellerAuditDoc>) ||
  mongoose.model<SellerAuditDoc>('SellerAudit', sellerAuditSchema);
