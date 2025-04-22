export const runtime = 'edge';
import { NextResponse } from "next/server";
import { connectDB } from "@/utils/connectDB";
import { Seller } from "@/utils/models/sellerSchema2";
import { User } from "@/utils/models/userSchema";
import { Schedule } from "@/utils/models/scheduleSchema";
import { daysES } from '@/utils/resources/days';
import { verifySellerId,verifySellerEmail } from "@/utils/lib/auth";
import { getAuth } from "@clerk/nextjs/server";


function extractAuthHeader(req) {
  let auth = req.headers.get("authorization");
  console.log("authHeader dentro");
  console.log(auth);
  if (!auth) {
    const sc = req.headers.get("x-vercel-sc-headers");
    console.log("scHeader dentro");
    console.log(sc);
    if (sc) {
      try {
        const obj = JSON.parse(sc);
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
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
}
export async function PUT(req, { params }) {
  try {
    try{
      console.log("vamos por el authHeader");
      const authHeader = extractAuthHeader(req);
      console.log("authHeader");
      console.log(authHeader);
  const { userId } = getAuth({ headers: { authorization: authHeader } });
  console.log("userId");
  console.log(userId);
    }
    catch(error){
      console.log(error)
    }
    
      console.log('Cookies recibidas:', req.headers);
      await connectDB();
      const data = await req.json();
      let seller;
      if (params.id.includes('@')) {
          verifySellerEmail(params.id);
          const userDb = await User.findOne({ email: params.id });

          if (!userDb) {
              return NextResponse.json({ error: "User not found" }, { status: 404 });
          }
          seller = await Seller.findOneAndUpdate({ userId: userDb._id }, data, { new: true });
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
    console.error("[PUT /api/sellers/:id]", message);
    return NextResponse.json({ error: message }, { status });
  }
}