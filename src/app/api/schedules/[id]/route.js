import { connectDB } from '@/utils/connectDB';
import { daysES } from '@/utils/resources/days';
import { NextResponse } from 'next/server';
import { Schedule } from '@/utils/models/scheduleSchema';


export async function GET(req,{params}) {
  await connectDB();

  try {
    const schedules = await Schedule.find({ sellerId: params.id });
    schedules.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return a.startTime.localeCompare(b.startTime);
  });

    const transformedDays = schedules.map((schedule) => ({
      ...schedule.toObject(),
      day: daysES[schedule.day - 1], // Map dayId to the corresponding day name
    }));


    if (!transformedDays) {
      return NextResponse.json({ message: 'No schedules found for this seller.' }, { status: 404 });
    }

    return NextResponse.json({schedules: transformedDays }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error.', error: error.message }, { status: 500 });
  }
};