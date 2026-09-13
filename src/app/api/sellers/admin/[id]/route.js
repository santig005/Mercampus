import { NextResponse } from 'next/server';

import { errorResponse, invalidPayload } from '@/lib/api-response';
import { approveSellerSchema, sellerIdSchema } from '@/lib/validators/seller';
import { connectDB } from '@/utils/connectDB';
import { AppError } from '@/utils/lib/errors';
import { getClerkUserId } from '@/utils/lib/auth';
import { isClerkAdmin } from '@/utils/lib/isClerkAdmin';
import { Seller } from '@/utils/models/sellerSchema2';

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
    const seller = await Seller.findByIdAndUpdate(
      parsedId.data,
      { approved: parsed.data.approved },
      { new: true }
    ).lean();

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ seller }, { status: 200 });
  } catch (error) {
    return errorResponse(error, '[PATCH /api/sellers/admin/:id]');
  }
}
