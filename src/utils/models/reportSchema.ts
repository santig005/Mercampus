import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

import {
  REPORT_DETAILS_MAX,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
} from '@/utils/resources/reports';

/**
 * T-149. A buyer's report of a product listing or a seller - what T-52
 * (admin moderation) will have to act on, and today has nowhere to land
 * except the unrelated PQRS form.
 *
 * `reporterClerkId` is copied from the server session of the request that
 * created the report (POST /api/reports reads it with getClerkUserId(),
 * never from the body), null for an anonymous report - same rule
 * sellerAuditSchema's `actorClerkId` follows for the admin side, except here
 * it is allowed to be absent.
 *
 * `status` only ever holds `'open'` for now: resolving or dismissing a
 * report is T-52's job, not this one's.
 */
const reportSchema = new Schema(
  {
    targetType: { type: String, enum: REPORT_TARGET_TYPES, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reporterClerkId: { type: String, default: null },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: REPORT_DETAILS_MAX },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: 'open',
      required: true,
    },
  },
  {
    // Only createdAt: nothing in this PR ever updates a report.
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'reports',
  }
);

// The admin list reads open reports, newest first.
reportSchema.index({ status: 1, createdAt: -1 });

export type ReportDoc = InferSchemaType<typeof reportSchema>;

export const Report: Model<ReportDoc> =
  (mongoose.models.Report as Model<ReportDoc>) ||
  mongoose.model<ReportDoc>('Report', reportSchema);
