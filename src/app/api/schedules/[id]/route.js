import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Time } from '@/utils/models/timeSchema';
import { Day } from '@/utils/models/daySchema';


export async function GET(req, { params }) {
  try {
    await connectDB(); // Asegúrate de que la conexión a la base de datos se realice correctamente
    // Encuentra los horarios del vendedor
    let schedules = await Schedule.find({ sellerId: params.id })
    .populate({
        path: 'startTime',
        model: Time,
    })
    .populate({
        path: 'endTime',
        model: Time,
    })
    .populate({
        path: 'idDay',
        model: Day,
    });
        schedules.sort((a, b) => {
        if (a.idDay.day_number === b.idDay.day_number) {
            return a.startTime.time_number - b.startTime.time_number;
            } else {
            return a.idDay.day_number - b.idDay.day_number;
            }
        });
        const formattedSchedules = schedules.map(schedule => ({
        day: schedule.idDay.name,
        startTime: schedule.startTime.name,
        endTime: schedule.endTime.name,
        }));
    
    schedules = schedules.map(schedule => ({
        day: schedule.idDay.name,
        startTime: schedule.startTime.name,
        endTime: schedule.endTime.name,
      }));

    return NextResponse.json({ schedules }, { status: 200 });
  } catch (error) {
    console.error('Error en la API:', error); // Muestra más información sobre el error
    return NextResponse.json({ message: 'Error fetching schedules', error: error.message }, { status: 500 });
  }
}
