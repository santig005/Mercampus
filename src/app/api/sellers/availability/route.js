import { connectDB } from '@/utils/connectDB';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Seller } from '@/utils/models/sellerSchema2';
import { NextResponse } from 'next/server';

export async function PATCH(req) {
  await connectDB();

  try {
    // Obtener todos los vendedores y horarios de una sola vez
    const [sellers, schedules] = await Promise.all([
      Seller.find(),
      Schedule.find()
    ]);

    if (!sellers.length) {
      return NextResponse.json({ message: 'No sellers found.' }, { status: 404 });
    }

    // Get current time in UTC-5 (Bogotá)
    const dateUTC = new Date();
    const now = new Date(dateUTC.getTime() - 5 * 60 * 60 * 1000);

    const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // Convert Sunday (0) to 7
    const currentTime = now.toTimeString().slice(0, 5); // Get HH:MM format

    // Agrupar horarios por sellerId
    const schedulesBySeller = schedules.reduce((acc, schedule) => {
      if (!acc[schedule.sellerId]) {
        acc[schedule.sellerId] = [];
      }
      acc[schedule.sellerId].push(schedule);
      return acc;
    }, {});

    // Preparar las actualizaciones
    const updates = sellers.map(seller => {
      const sellerSchedules = schedulesBySeller[seller._id] || [];
      const isAvailable = sellerSchedules.some(schedule =>
        schedule.day === currentDay &&
        schedule.startTime <= currentTime &&
        schedule.endTime >= currentTime
      );

      let availability = isAvailable;
      if (seller.extraTime >= now && seller.statusExtraTime) {
        availability = seller.temporalAvailability;
      } else {
        seller.statusExtraTime = false;
      }

      return {
        updateOne: {
          filter: { _id: seller._id },
          update: {
            availability,
            statusExtraTime: seller.statusExtraTime
          }
        }
      };
    });

    // Actualizar todos los vendedores en lote
    await Seller.bulkWrite(updates);

    return NextResponse.json({ message: 'Availability updated successfully for all sellers.' }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'Internal server error.', error: error.message }, { status: 500 });
  }
}