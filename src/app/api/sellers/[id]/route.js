import { NextResponse } from "next/server";
import { connectDB } from "@/utils/connectDB";
import { Seller } from "@/utils/models/sellerSchema";
import { User } from "@/utils/models/userSchema";
export async function GET(req, { params }) {
    try {
        connectDB();
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
        
        return NextResponse.json({seller:seller}, { status: 200 });
    } catch (error) {
        console.log(params);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}