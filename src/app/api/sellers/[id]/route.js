import { NextResponse } from "next/server";
import { connectDB } from "@/utils/connectDB";
import { Seller } from "@/utils/models/sellerSchema2";
import { User } from "@/utils/models/userSchema";
import { Schedule } from "@/utils/models/scheduleSchema";
import { daysES } from '@/utils/resources/days';
import { verifySeller } from "@/utils/lib/auth";

export async function GET(req, { params }) {
    // try {
    //     connectDB();
    //     let seller;
    //     if (params.id.includes('@')) {
    //         const user = await User.findOne({ email: params.id });

    //         if (!user) {
    //             return NextResponse.json({ error: "User not found" }, { status: 404 });
    //           }
    //           seller = await Seller.findOne({ userId: user._id });
    //     } else 
    //     {
    //         seller = await Seller.findById(params.id);
    //         }
            
        
    //     return NextResponse.json({seller}, { status: 200 });
    // } catch (error) {
    //     console.log(params);
    //     return NextResponse.json({ error: error.message }, { status: 500 });
    // }
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
        connectDB();
        const data = await req.json();
        const targetIdentifier = params.id; // El ID o email del vendedor a modificar

        // 1. Verificar que el usuario autenticado es el dueño del perfil a modificar
        //    Esta función valida auth, rol y que target === authenticated.
        //    Devuelve el ID del vendedor si todo ok, o lanza error si no.
        const verifiedSellerId = await verifySeller(targetIdentifier);
        if (!verifiedSellerId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        let seller;

        if (params.id.includes('@')) {
            const user = await User.findOne({ email: params.id });

            if (!user) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }
            seller = await Seller.findOneAndUpdate({ userId: user._id }, data, { new: true });
        } else {
            seller = await Seller.findByIdAndUpdate(params.id, data, { new: true });
        }

        if (!seller) {
            return NextResponse.json({ error: "Seller not found" }, { status: 404 });
        }

        return NextResponse.json({ seller }, { status: 200 });
    } catch (error) {
        console.log(params);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}