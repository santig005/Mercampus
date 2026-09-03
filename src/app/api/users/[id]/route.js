import { NextResponse } from "next/server";
import { connectDB } from "@/utils/connectDB";
import { User } from "@/utils/models/userSchema";
import { logger } from '@/lib/logger';
export async function GET(req, { params }) {
    try {
        connectDB();
        let user;
        if (params.id.includes('@')) {
            user = await User.findOne({ email: params.id });
        }
        else {
            user = await User.findById(params.id);
        }
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        } 
        return NextResponse.json({ user }, { status: 200 });
        
      }
    catch (error) {
        logger.debug(params);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
