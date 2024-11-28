import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Seller } from '@/utils/models/sellerschema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Time } from '@/utils/models/timeSchema';
import { Day } from '@/utils/models/daySchema';

export async function GET(req) {
  try {
    // Conectar a la base de datos
    await connectDB();

    // Obtener todos los vendedores
    const sellers = await Seller.find();

    if (!sellers || sellers.length === 0) {
      return NextResponse.json({ message: 'Sellers not found' }, { status: 404 });
    }

    // Para cada vendedor, buscar los horarios asociados
    const sellersWithSchedules = await Promise.all(
      sellers.map(async (seller) => {
        // Obtener los horarios del vendedor
        const schedules = await Schedule.find({ sellerId: seller._id })
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

        // Ordenar los horarios
        schedules.sort((a, b) => {
          if (a.idDay.day_number === b.idDay.day_number) {
            return a.startTime.time_number - b.startTime.time_number;
          } else {
            return a.idDay.day_number - b.idDay.day_number;
          }
        });

        // Formatear los horarios
        const formattedSchedules = schedules.map((schedule) => ({
          day: schedule.idDay.name,
          startTime: schedule.startTime.name,
          endTime: schedule.endTime.name,
        }));

        // Retornar el vendedor con sus horarios formateados
        return {
          ...seller.toObject(), // Convertir el documento de Mongoose a objeto plano
          schedules: formattedSchedules,
        };
      })
    );

    // Responder con los vendedores y sus horarios
    return NextResponse.json({ sellers: sellersWithSchedules }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sellers with schedules:', error);
    return NextResponse.json({ message: 'Error fetching sellers with schedules', error: error.message }, { status: 500 });
  }
}

