import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { errorResponse, invalidPayload } from '@/lib/api-response';
import { createReportSchema } from '@/lib/validators/report';
import { enforceRateLimit } from '@/server/rate-limit/rateLimit';
import { connectDB } from '@/utils/connectDB';
import { AppError } from '@/utils/lib/errors';
import { Product } from '@/utils/models/productSchema';
import { Report } from '@/utils/models/reportSchema';
import { Seller } from '@/utils/models/sellerSchema';

const TARGET_MODELS = { product: Product, seller: Seller };

// T-149: a buyer reporting a product listing or a seller - the missing input
// side of T-52's moderation. Anonymous reporting is allowed on purpose (the
// "Done when" in ROADMAP.md says "by whom (if signed in)"), so this never
// calls getClerkUserId() - that throws 401 with no session, which is exactly
// the caller this route has to accept.
export async function POST(req) {
  // Picks the rate-limit bucket before reading the body, same order as every
  // other limited route (pqrs, schedules): a request over its limit never
  // even gets its JSON parsed.
  const { userId: clerkId } = await auth();
  const limited = await enforceRateLimit(
    req,
    clerkId ? 'reportAuthenticated' : 'reportAnonymous'
  );
  if (limited) return limited;

  try {
    await connectDB();

    const parsed = createReportSchema.safeParse(await req.json());
    if (!parsed.success) {
      return invalidPayload(parsed.error);
    }

    const { targetType, targetId, reason, details } = parsed.data;

    const exists = await TARGET_MODELS[targetType].exists({ _id: targetId });
    if (!exists) {
      throw new AppError(
        targetType === 'product' ? 'Producto no encontrado.' : 'Vendedor no encontrado.',
        404
      );
    }

    // reporterClerkId comes from the session above, never from the parsed
    // body - createReportSchema doesn't even declare that field, so a forged
    // one in the request is dropped before it gets here (Zod strips unknown
    // keys by default; see the note in product.ts).
    const report = await Report.create({
      targetType,
      targetId,
      reason,
      details,
      reporterClerkId: clerkId ?? null,
    });

    return NextResponse.json(
      { message: 'Reporte creado correctamente.', id: report._id },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error, '[POST /api/reports]', { bodyKey: 'message' });
  }
}
