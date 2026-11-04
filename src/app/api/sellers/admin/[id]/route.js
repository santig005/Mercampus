import { NextResponse } from 'next/server';

import { errorResponse, invalidPayload } from '@/lib/api-response';
import { approveSellerSchema, sellerIdSchema } from '@/lib/validators/seller';
import { connectDB } from '@/utils/connectDB';
import { AppError } from '@/utils/lib/errors';
import { getClerkUserId } from '@/utils/lib/auth';
import { isClerkAdmin } from '@/utils/lib/isClerkAdmin';
import { logger } from '@/lib/logger';
import { SellerAudit } from '@/utils/models/sellerAuditSchema';
import { Seller } from '@/utils/models/sellerSchema';

/**
 * Approving or un-approving a seller: the gate between "registered" and
 * "visible to buyers".
 *
 * T-105. This is a new edge because there was none. Both approval surfaces
 * used to send `{ approved }` to `PUT /api/sellers/[id]`, whose
 * `updateSellerSchema` does not declare `approved` - so Zod dropped it (T-13's
 * anti-mass-assignment behaviour, working exactly as intended), Mongoose was
 * handed an object without the field, and nothing was written. The optimistic
 * toggle in the browser then showed an approval that did not exist until the
 * next refresh.
 *
 * It lives under `/admin/` on purpose: the middleware's `/api/(.*)/admin(.*)`
 * matcher already gates this path on Clerk's `publicMetadata`, which is the
 * one admin check in this repo that was always right. The check below is not
 * redundant with it - it is what makes the handler safe on its own, so that a
 * future change to the matcher cannot silently open it.
 */
export async function PATCH(req, { params }) {
  const parsedId = sellerIdSchema.safeParse(params.id);
  if (!parsedId.success) {
    return invalidPayload(parsedId.error);
  }

  try {
    await connectDB();

    // Identity and role before touching anything. getClerkUserId() throws 401
    // without a session; isClerkAdmin() is the same helper the middleware uses
    // (T-104), so there is one definition of admin-ness, not two.
    const clerkId = await getClerkUserId();
    if (!(await isClerkAdmin(clerkId))) {
      throw new AppError('No autorizado.', 403);
    }

    const parsed = approveSellerSchema.safeParse(await req.json());
    if (!parsed.success) {
      return invalidPayload(parsed.error);
    }

    // Only `approved` is written, never the whole parsed body: this endpoint
    // exists to flip one flag, and a seller's own fields belong to the route
    // the seller owns.
    //
    // T-155: `new: false` so the same atomic operation that writes the new
    // state also hands back the previous one for the audit record - reading
    // it in a separate query first could record a stale "before" if two
    // admins act at once.
    const before = await Seller.findByIdAndUpdate(
      parsedId.data,
      { approved: parsed.data.approved },
      { new: false }
    ).lean();

    if (!before) {
      return NextResponse.json({ error: 'Vendedor no encontrado.' }, { status: 404 });
    }

    // The response keeps its old shape (the updated seller). `updatedAt` is
    // the pre-update one; no caller reads it.
    const seller = { ...before, approved: parsed.data.approved };

    // T-155: the audit record, written only after the change succeeded so the
    // log never claims something that did not happen. The actor is the
    // session's clerkId from above - never anything in the body (which
    // `strict()` would reject anyway).
    //
    // Not a transaction: the change has already happened and is what the
    // admin asked for, so a failed audit write must not turn it into an error
    // response the UI would roll back. It is logged loudly instead, with ids
    // only (no reason text, no PII).
    try {
      await SellerAudit.create({
        actorClerkId: clerkId,
        action: parsed.data.approved ? 'approve' : 'reject',
        sellerId: before._id,
        previousState: { approved: Boolean(before.approved) },
        newState: { approved: parsed.data.approved },
        reason: parsed.data.reason,
      });
    } catch (auditError) {
      logger.error('[PATCH /api/sellers/admin/:id] seller state changed but audit write failed', {
        sellerId: String(before._id),
        approved: parsed.data.approved,
        error: auditError instanceof Error ? auditError.message : String(auditError),
      });
    }

    return NextResponse.json({ seller }, { status: 200 });
  } catch (error) {
    return errorResponse(error, '[PATCH /api/sellers/admin/:id]');
  }
}
