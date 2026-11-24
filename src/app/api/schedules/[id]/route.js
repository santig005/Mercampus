import { connectDB } from '@/utils/connectDB';
import { daysES } from '@/utils/resources/days';
import { NextResponse } from 'next/server';
import { Schedule } from '@/utils/models/scheduleSchema';
import { errorResponse } from '@/lib/api-response';


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
    // T-141: this used to echo error.message (a Mongoose CastError for a
    // malformed id, same shape as T-97/F29) straight into the 500 body.
    return errorResponse(error, '[GET /api/schedules/:id]', { bodyKey: 'message' });
  }
};