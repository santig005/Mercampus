import { NextResponse } from "next/server";
import connectDB from "@/utils/connectDB";
import Landlord from "@/utils/models/landlordSchema";
// import { getAuth } from "@clerk/nextjs/server";

export async function GET(request, { params }) {
  try {
    await connectDB();
    const landlord = await Landlord.findById(params.id).populate("user", "name email");
    if (!landlord) {
      return NextResponse.json({ error: "Landlord not found" }, { status: 404 });
    }
    return NextResponse.json(landlord);
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
    const landlord = await Landlord.findById(params.id);

    if (!landlord) {
      return NextResponse.json({ error: "Landlord not found" }, { status: 404 });
    }

    // if (landlord.user.toString() !== userId) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const body = await request.json();
    const updatedLandlord = await Landlord.findByIdAndUpdate(params.id, body, { new: true });

    return NextResponse.json(updatedLandlord);
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
    const landlord = await Landlord.findById(params.id);

    if (!landlord) {
      return NextResponse.json({ error: "Landlord not found" }, { status: 404 });
    }

    // if (landlord.user.toString() !== userId) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    await Landlord.findByIdAndDelete(params.id);

    return NextResponse.json({ message: "Landlord deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
