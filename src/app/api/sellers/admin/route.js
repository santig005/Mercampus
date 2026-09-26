import { NextResponse } from 'next/server';

import { errorResponse } from '@/lib/api-response';
import { connectDB } from '@/utils/connectDB';
import { AppError } from '@/utils/lib/errors';
import { getClerkUserId } from '@/utils/lib/auth';
import { isClerkAdmin } from '@/utils/lib/isClerkAdmin';
import { Seller } from '@/utils/models/sellerSchema2';

// T-133: exactly what /admin/sellers renders and nothing more - SellerCard's
// businessName/slogan/description/logo/availability, plus the page's own
// approved/university/createdAt (and _id, which Mongo always sends). This
// used to be every field of every seller, phoneNumber and userId included,
// plus each seller's schedules fetched one query per seller - which the page
// never showed. Add a field here when the page starts reading it.
const ADMIN_LIST_FIELDS =
  'businessName slogan description logo availability approved university createdAt';

// T-12 moved the admin check into the middleware and left this handler with
// none: the middleware's `/api/(.*)/admin(.*)` matcher was the only thing
// between an anonymous request and every seller's data. T-133 puts the check
// back here, the way PATCH /api/sellers/admin/[id] already does, so the
// middleware is defence in depth and not the only door.
//
// force-dynamic stays. auth() reads the request headers, which already makes
// the route dynamic on its own - but that is a side effect, and the day this
// check moves again the route would silently turn static and serve the build's
// sellers from cache (what happened when T-12 removed the old currentUser()
// call, and why this line exists). Being explicit costs nothing.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Identity and role before touching the database. getClerkUserId() throws
    // 401 without a session; isClerkAdmin() is the one definition of admin
    // (T-104), shared with the middleware.
    const clerkId = await getClerkUserId();
    if (!(await isClerkAdmin(clerkId))) {
      throw new AppError('No autorizado.', 403);
    }

    await connectDB();

    const sellers = await Seller.find()
      .select(ADMIN_LIST_FIELDS)
      .sort({ createdAt: -1 }) // newest first
      .lean();

    return NextResponse.json(
      {
        sellers,
        total: sellers.length,
        message:
          sellers.length === 0
            ? 'No se encontraron vendedores'
            : 'Vendedores obtenidos exitosamente para administración',
      },
      { status: 200 }
    );
  } catch (error) {
    // bodyKey 'message': /admin/sellers shows `data.message` when the call fails.
    return errorResponse(error, '[GET /api/sellers/admin]', { bodyKey: 'message' });
  }
}
