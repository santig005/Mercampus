import { NextResponse } from "next/server";
import { connectDB } from "@/utils/connectDB";
import {
  getClerkUserId,
  verifySellerEmail,
  verifySellerId,
} from "@/utils/lib/auth";
import { sellerIdSchema, updateSellerSchema } from "@/lib/validators/seller";
import { errorResponse, invalidPayload } from "@/lib/api-response";
import { Seller } from "@/utils/models/sellerSchema";
import { Schedule } from "@/utils/models/scheduleSchema";
import { daysES } from '@/utils/resources/days';
import { logger } from '@/lib/logger';

// T-112b: extractAuthHeader() used to sit here - never called, and it logged
// the request's Authorization header (a Bearer token) at debug level. Deleted.

// T-170: public, unauthenticated. This used to accept an email in place of
// the id (`params.id.includes('@')`), look the user up by it and return
// their shop - so anyone could ask "does this email have a store on
// Mercampus?" and get the store back, which also made "User not found" vs
// "Seller not found" an oracle for whether an email is registered at all.
// Its only client, getSellerByEmail(), was deleted in T-112b with no
// reference anywhere; SellerPage, the one caller left, passes an id. The id
// is now validated like every other param (400, not a 500 carrying the
// CastError), and a 500 no longer echoes error.message.
//
// Visibility is unchanged on purpose: this still returns a pending seller,
// because the admin reviews pending sellers on their public page
// (/admin/sellers links there) - see ROADMAP.md T-170.
export async function GET(req, { params }) {
    const parsedId = sellerIdSchema.safeParse(params.id);
    if (!parsedId.success) {
      return invalidPayload(parsedId.error);
    }

    try {
        await connectDB();

        const seller = await Seller.findById(parsedId.data);

        if (!seller) {
          return NextResponse.json({ error: "Seller not found" }, { status: 404 });
        }
    
        const schedules = await Schedule.find({ sellerId: seller._id });
    
        schedules.sort((a, b) => {
          if (a.day !== b.day) return a.day - b.day;
          return a.startTime.localeCompare(b.startTime);
        });
    
        const transformedSchedules = schedules.map(schedule => ({
          ...schedule.toObject(),
          day: daysES[schedule.day - 1],
        }));
    
        const populatedSeller = {
          ...seller.toObject(),
          schedules: transformedSchedules,
        };
    
        return NextResponse.json({ seller: populatedSeller }, { status: 200 });
      } catch (error) {
        return errorResponse(error, '[GET /api/sellers/[id]]');
      }
}
export async function PUT(req, { params }) {
  try {
      await connectDB();

      // Identity first, so a request without a session gets a 401 and not
      // the 400 of a malformed body. Ownership is checked below, where it is
      // already known how the seller is being identified.
      await getClerkUserId();

      const parsed = updateSellerSchema.safeParse(await req.json());
      if (!parsed.success) {
        return invalidPayload(parsed.error);
      }
      const data = parsed.data;
      let seller;
      if (params.id.includes('@')) {
          // Identifies the seller by their owner's email. If the email is
          // the session's own, the seller is the one the User already
          // references: no need to look it up again.
          const user = await verifySellerEmail(params.id);
          seller = user.sellerId
            ? await Seller.findByIdAndUpdate(user.sellerId, data, { new: true })
            : null;
      } else {
          await verifySellerId(params.id);
          seller = await Seller.findByIdAndUpdate(params.id, data, { new: true });
      }

      if (!seller) {
          return NextResponse.json({ error: "Seller not found" }, { status: 404 });
      }

      return NextResponse.json({ seller }, { status: 200 });
  }  catch (error) {
    const status = error?.status || 500;
    const message = error?.message || "Error interno del servidor";
    logger.error("[PUT /api/sellers/:id]", message);
    return NextResponse.json({ error: message }, { status });
  }
}