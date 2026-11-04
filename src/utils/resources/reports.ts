// T-149. Shared between the Zod validator (src/lib/validators/report.ts) and
// the Mongoose schema (src/utils/models/reportSchema.ts), the same split
// pqrsTypes (src/utils/resources/pqrs.js) already uses - one definition, not
// one per consumer.
//
// English values in code: the UI shows a Spanish label per value, read from
// messages/*.json (ReportDialog.reasons.<value>) - see CLAUDE.md on English
// code vs Spanish product copy.
export const REPORT_TARGET_TYPES = ['product', 'seller'] as const;

export const REPORT_REASONS = [
  'misleading_info',
  'wrong_price',
  'unsafe_or_prohibited',
  'offensive_content',
  'other',
] as const;

export const REPORT_STATUSES = ['open'] as const;

// Bounded in the validator too (createReportSchema); repeated here so a
// future writer that skips Zod still cannot store an unbounded string -
// same reasoning as SELLER_AUDIT_REASON_MAX (sellerAuditSchema.ts).
export const REPORT_DETAILS_MAX = 500;
