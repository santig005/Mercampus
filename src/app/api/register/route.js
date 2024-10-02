import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { User } from '@/utils/models/userSchema';

export async function POST(req) {
  const { name, email } = await req.json();
  await connectDB();
  const newUser = { name, email };
  console.log(newUser);

  try {
    await User.create(newUser);
  } catch (error) {
    // console.error(error);
    return new NextResponse(error.message, { status: 500 });
  }

  return new NextResponse('Usuario creado', { status: 201 });
}
