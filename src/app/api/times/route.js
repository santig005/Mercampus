import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Time } from '@/utils/models/timeSchema';

export async function GET() {
  connectDB();
  const times = await Time.find().sort({ time_number: 1 }).limit();;
  return NextResponse.json(times);
}

