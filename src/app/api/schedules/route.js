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
    // Identidad primero: sin sesión no se llega ni a mirar el cuerpo. Después
    // propiedad, que necesita el sellerId ya validado porque viene en el
    // cuerpo. Sin esto la ruta borraba y reescribía el horario de cualquier
    // vendedor con solo mandar su id.
    await getClerkUserId();

    const parsed = replaceSchedulesSchema.safeParse(await req.json());
    if (!parsed.success) {
      return invalidPayload(parsed.error);
    }
    const { sellerId, schedules } = parsed.data;

    await verifySellerId(sellerId);

    // day ya viene validado contra daysES, asi que indexOf no puede dar -1
    // (que antes guardaba day: 0 en silencio).
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
    // `message` y no `error`: es la clave que lee el banner de Schedule.jsx.
    return errorResponse(error, '[POST /api/schedules]', { bodyKey: 'message' });
  }
}

