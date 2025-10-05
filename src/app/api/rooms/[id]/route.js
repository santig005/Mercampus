import { NextResponse } from "next/server";
import connectDB from "@/utils/connectDB";
import Room from "@/utils/models/roomSchema";
import Landlord from "@/utils/models/landlordSchema";
// import { getAuth } from "@clerk/nextjs/server";

export async function GET(request, { params }) {
  try {
    await connectDB();
    const room = await Room.findById(params.id).populate({
      path: "landlord",
      populate: {
        path: "user",
        select: "name email",
      },
    });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json(room);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  // const { userId } = getAuth(request);
  // if (!userId) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    await connectDB();
    const room = await Room.findById(params.id).populate("landlord");

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // if (room.landlord.user.toString() !== userId) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const body = await request.json();
    const updatedRoom = await Room.findByIdAndUpdate(params.id, body, { new: true });

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  // const { userId } = getAuth(request);
  // if (!userId) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    await connectDB();
    const room = await Room.findById(params.id).populate("landlord");

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // if (room.landlord.user.toString() !== userId) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    await Room.findByIdAndDelete(params.id);

    return NextResponse.json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
