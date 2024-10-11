import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Day } from '@/utils/models/daySchema';

export async function GET() {
  connectDB();
  const days = await Day.find().sort({ day_number:1 }).limit();;
  return NextResponse.json(days);
}

