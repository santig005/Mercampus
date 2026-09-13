import { connectDB } from '@/utils/connectDB'; // Your function to connect to MongoDB
import { daysES } from '@/utils/resources/days'; // Your resource file with the days of the week
import { NextResponse } from 'next/server';
import { Schedule } from '@/utils/models/scheduleSchema';
import { replaceSchedulesSchema } from '@/lib/validators/schedule';
import { errorResponse, invalidPayload } from '@/lib/api-response';
import { getClerkUserId, verifySellerId } from '@/utils/lib/auth';


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
    // Identity first: without a session the body is never even looked at.
    // Then ownership, which needs the already-validated sellerId because it
    // arrives in the body. Without this the route deleted and rewrote any
    // seller's schedule just by sending their id.
    await getClerkUserId();

    const parsed = replaceSchedulesSchema.safeParse(await req.json());
    if (!parsed.success) {
      return invalidPayload(parsed.error);
    }
    const { sellerId, schedules } = parsed.data;

    await verifySellerId(sellerId);

    // day arrives already validated against daysES, so indexOf can't return
    // -1 (which used to store day: 0 silently).
    const newSchedules = schedules.map((schedule) => ({
      sellerId,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      day: daysES.indexOf(schedule.day) + 1,
    }));

    // delete the previous schedules
    await Schedule.deleteMany({ sellerId });
    const result = await Schedule.insertMany(newSchedules);

    return NextResponse.json({ message: 'Schedules created succesfully.', schedules: result }, { status: 200 });
    } catch (error) {
    // `message` and not `error`: it is the key Schedule.jsx's banner reads.
    return errorResponse(error, '[POST /api/schedules]', { bodyKey: 'message' });
  }
}

