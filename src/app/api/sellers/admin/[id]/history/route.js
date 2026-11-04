import { NextResponse } from 'next/server';

import { errorResponse, invalidPayload } from '@/lib/api-response';
import { sellerIdSchema } from '@/lib/validators/seller';
import { connectDB } from '@/utils/connectDB';
import { AppError } from '@/utils/lib/errors';
import { getClerkUserId } from '@/utils/lib/auth';
import { isClerkAdmin } from '@/utils/lib/isClerkAdmin';
import { SellerAudit } from '@/utils/models/sellerAuditSchema';

// T-155: what the admin screen shows as one seller's history.
const HISTORY_FIELDS = 'actorClerkId action previousState newState reason createdAt';

// A seller is approved/rejected a handful of times in its life; the cap only
// keeps a pathological toggle-loop from returning an unbounded list.
const HISTORY_LIMIT = 100;

// Same reasoning as GET /api/sellers/admin: never cache an admin read.
export const dynamic = 'force-dynamic';

/**
 * The audit trail of one seller, newest first. Read-only: nothing in the app
 * updates or deletes these records (the model refuses to).
 *
 * Gated exactly like GET /api/sellers/admin and PATCH /api/sellers/admin/[id]:
 * getClerkUserId() (401 without a session) and isClerkAdmin() (403 otherwise),
 * with the middleware's `/api/(.*)/admin(.*)` matcher as defence in depth.
 *
 * A seller with no records - every seller that existed before T-155 - gets
 * an empty list, not a 404: "no history yet" is a valid answer.
 */
export async function GET(_req, { params }) {
  const parsedId = sellerIdSchema.safeParse(params.id);
  if (!parsedId.success) {
    return invalidPayload(parsedId.error);
  }

  try {
    const clerkId = await getClerkUserId();
    if (!(await isClerkAdmin(clerkId))) {
      throw new AppError('No autorizado.', 403);
    }

    await connectDB();

    const history = await SellerAudit.find({ sellerId: parsedId.data })
      .select(HISTORY_FIELDS)
      .sort({ createdAt: -1, _id: -1 })
      .limit(HISTORY_LIMIT)
      .lean();

    return NextResponse.json({ history }, { status: 200 });
  } catch (error) {
    return errorResponse(error, '[GET /api/sellers/admin/:id/history]');
  }
}
