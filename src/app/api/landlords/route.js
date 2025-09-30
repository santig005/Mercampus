import { NextResponse } from "next/server";
import connectDB from "@/utils/connectDB";
import Landlord from "@/utils/models/landlordSchema";
// import { getAuth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    await connectDB();
    const landlords = await Landlord.find().populate("user", "name email");
    return NextResponse.json(landlords);
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
    const newLandlord = new Landlord({ ...body /* user: userId */ });
    await newLandlord.save();
    return NextResponse.json(newLandlord, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
