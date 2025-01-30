import { connectDB } from '@/utils/connectDB'; // Your function to connect to MongoDB
import { daysES } from '@/utils/resources/days'; // Your resource file with the days of the week
import { NextResponse } from 'next/server';
import { Schedule } from '@/utils/models/scheduleSchema';
import { currentUser } from '@clerk/nextjs/server';
import { User } from '@/utils/models/userSchema';
import { Seller } from '@/utils/models/sellerSchema';


export async function GET(req) {
  await connectDB();

  try {
    const schedules = await Schedule.find({ sellerId: req.sellerid });

    if (!schedules) {
      return NextResponse.json({ message: 'No schedules found for this seller.' }, { status: 404 });
    }

    return NextResponse.json({ schedules }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error.', error: error.message }, { status: 500 });
  }
};

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
      day: daysES.indexOf(schedule.day) + 1,
    }));

    // delete the previous schedules
    const deletedSchedules = await Schedule.deleteMany({ sellerId });
    const result = await Schedule.insertMany(newSchedules);

    return NextResponse.json({ message: 'Schedules created succesfully.', schedules: result }, { status: 200 });
    } catch (error) {
    return NextResponse.json({ message: 'Intern error from the server.', error: error.message }, { status: 500 });
  }
}

