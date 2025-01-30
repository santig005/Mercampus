import { NextResponse } from "next/server";
import { connectDB } from "@/utils/connectDB";
import { Seller } from "@/utils/models/sellerschema";
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
        } else 
        {
            seller = await Seller.findById(params.id);
            }
            console.log("el seller encontrado en seller es ",seller);
            
        
        return NextResponse.json({seller}, { status: 200 });
    } catch (error) {
        console.log(params);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
    try {
        connectDB();
        const data = await req.json();
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