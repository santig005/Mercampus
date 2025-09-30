import { NextResponse } from "next/server";
import connectDB from "@/utils/connectDB";
import Tutor from "@/utils/models/tutorSchema";
// import { getAuth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    await connectDB();
    const tutors = await Tutor.find();
    return NextResponse.json(tutors);
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
    const newTutor = new Tutor({ ...body /* user: userId */ });
    await newTutor.save();
    return NextResponse.json(newTutor, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
