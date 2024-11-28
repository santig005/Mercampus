import { NextResponse } from "next/server";
import { connectDB } from "@/utils/connectDB";
import { Seller } from "@/utils/models/sellerschema";
export async function GET(req, { params }) {
    try {
        connectDB();
        const seller = await Seller.findById(params.id);
        return NextResponse.json(seller);
    } catch (error) {
        console.log(params);
        return NextResponse.json({ error: error.message });
    }
}