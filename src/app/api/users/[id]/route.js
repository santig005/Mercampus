import { NextResponse } from "next/server";
import { connectDB } from "@/utils/connectDB";
import { User } from "@/utils/models/userSchema";
import { errorResponse } from '@/lib/api-response';
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
        // T-136 (not this task's scope): this can log a raw email when the id
        // is one (`params.id.includes('@')` above) - left untouched on
        // purpose, see this PR's "Noticed, not fixed" note.
        logger.debug(params);
        // T-141 (batch 2): used to answer `{ error: error.message }`, echoing
        // the driver's/Mongoose's raw text straight into the body.
        return errorResponse(error, 'GET /api/users/:id');
    }
}
