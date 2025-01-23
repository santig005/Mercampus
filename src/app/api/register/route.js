import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { User } from '@/utils/models/userSchema';

export async function POST(req) {
  const { name, email, clerkId } = await req.json();
  await connectDB();

  try {
    const user = new User({ name, email, clerkId: clerkId || '' });
    console.log("user va aqui" + user);
    await user.save();
  } catch (error) {
    console.error("Error detallado al crear el usuario:", error);

    return new NextResponse("Error al crear el usuario: " + JSON.stringify(error), { status: 500 });
  }

  return new NextResponse('Usuario creado', { status: 201 });
}
