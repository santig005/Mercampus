import { NextResponse } from "next/server";
import { connectDB } from "@/utils/connectDB";
import {
  getClerkUserId,
  verifySellerEmail,
  verifySellerId,
} from "@/utils/lib/auth";
import { updateSellerSchema } from "@/lib/validators/seller";
import { invalidPayload } from "@/lib/api-response";
import { Seller } from "@/utils/models/sellerSchema2";
import { User } from "@/utils/models/userSchema";
import { Schedule } from "@/utils/models/scheduleSchema";
import { daysES } from '@/utils/resources/days';
import { logger } from '@/lib/logger';



function extractAuthHeader(req) {
  let auth = req.headers.get("authorization");
  logger.debug("authHeader dentro");
  logger.debug(auth);
  if (!auth) {
    const sc = req.headers.get("x-vercel-sc-headers");
    logger.debug("scHeader dentro");
    logger.debug(sc);
    if (sc) {
      try {
        logger.debug("scHeader dentro try");
        const obj = JSON.parse(sc);
        logger.debug("scHeader dentro try parseado");
        logger.debug(obj);
        auth = obj.Authorization || obj.authorization;
      } catch {}
    }
  }
  return auth;
}
export async function GET(req, { params }) {
    try {
        await connectDB();
    
        let seller;
    
        if (params.id.includes('@')) {
          const user = await User.findOne({ email: params.id });
    
          if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
          }
    
          seller = await Seller.findOne({ userId: user._id });
        } else {
          seller = await Seller.findById(params.id);
        }
    
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
        logger.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
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