import { connectDB } from "@/utils/connectDB";
import { createUser } from "@/utils/createUser";
import { NextResponse } from "next/server";
import User from "@/utils/models/userSchema";
import bcrypt from "bcryptjs";

export const POST = async (req) => {
  const { name, email, password } = await req.json();
  await connectDB();

  const hashedPassword = await bcrypt.hash(password, 10);

  // await createUser({ name, email, password: hashedPassword });

  const newUser = { name, email, password: hashedPassword };

  try {
    await createUser(newUser);
  } catch (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  return new NextResponse("Usuario creado", { status: 201 });
};
