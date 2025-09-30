import { NextResponse } from "next/server";
import connectDB from "@/utils/connectDB";
import Room from "@/utils/models/roomSchema";
import Landlord from "@/utils/models/landlordSchema";
// import { getAuth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    await connectDB();
    const rooms = await Room.find().populate({
      path: "landlord",
      populate: {
        path: "user",
        select: "name email",
      },
    });
    return NextResponse.json(rooms);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request) {
  // const { userId } = getAuth(request);
  // if (!userId) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    await connectDB();
    const body = await request.json();

    // const landlord = await Landlord.findOne({ user: userId });
    // if (!landlord) {
    //   return NextResponse.json({ error: "Landlord profile required" }, { status: 403 });
    // }

    const newRoom = new Room({ ...body /* landlord: landlord._id */ });
    await newRoom.save();
    return NextResponse.json(newRoom, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
