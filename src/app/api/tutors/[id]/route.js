import { NextResponse } from "next/server";
import connectDB from "@/utils/connectDB";
import Tutor from "@/utils/models/tutorSchema";
// import { getAuth } from "@clerk/nextjs/server";

export async function GET(request, { params }) {
  try {
    await connectDB();
    const tutor = await Tutor.findById(params.id).populate("user", "name email");
    if (!tutor) {
      return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    }
    return NextResponse.json(tutor);
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
    const tutor = await Tutor.findById(params.id);

    if (!tutor) {
      return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    }

    // if (tutor.user.toString() !== userId) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const body = await request.json();
    const updatedTutor = await Tutor.findByIdAndUpdate(params.id, body, { new: true });

    return NextResponse.json(updatedTutor);
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
    const tutor = await Tutor.findById(params.id);

    if (!tutor) {
      return NextResponse.json({ error: "Tutor not found" }, { status: 404 });
    }

    // if (tutor.user.toString() !== userId) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    await Tutor.findByIdAndDelete(params.id);

    return NextResponse.json({ message: "Tutor deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
