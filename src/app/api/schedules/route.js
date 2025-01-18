import { connectDB } from '@/utils/connectDB'; // Your function to connect to MongoDB
import { NextResponse } from 'next/server';
import { Schedule } from '@/utils/models/scheduleSchema';
import { currentUser } from '@clerk/nextjs/server';
import { User } from '@/utils/models/userSchema';
import { Seller } from '@/utils/models/sellerschema';

export async function POST(req) {
  await connectDB();

  try {
    const { sellerId, schedules } = await req.json();

    // Data validation
    if (!sellerId || !schedules || !Array.isArray(schedules)) {
      return NextResponse.json(
      { message: 'Invalid data: sellerId and an array of schedules are required.' },
      { status: 400 }
      );
    }

    // Create new schedules
    const newSchedules = schedules.map((schedule) => ({
      sellerId,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      day: schedule.day,
    }));

    const result = await Schedule.insertMany(newSchedules);

    return NextResponse.json({ message: 'Schedules created succesfully.', schedules: result }, { status: 201 });
    } catch (error) {
    return NextResponse.json({ message: 'Intern error from the server.', error: error.message }, { status: 500 });
  }
}

