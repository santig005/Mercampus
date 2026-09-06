import { connectDB } from '@/utils/connectDB';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Seller } from '@/utils/models/sellerSchema2';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Colombia no tiene horario de verano, asi que un offset fijo alcanza. Sin
// esto, "ahora" saldria en la zona horaria del runtime (UTC en Vercel), que
// no coincide con la hora local que el vendedor puso en su horario.
const BOGOTA_OFFSET_HOURS = 5;

// T-14: antes protegida por IP (allowedIPs.js, borrado en T-34). Vercel Cron
// no manda cookies de Clerk, asi que el guard es un secreto compartido en el
// header Authorization en vez de sesion.
//
// GET, no PATCH: Vercel Cron siempre invoca la ruta con GET. El codigo
// original (comentado) lo exportaba como PATCH, lo que habria dejado el cron
// pegandole a una ruta sin handler para ese verbo - un 405 silencioso, nunca
// se habria actualizado nada.
export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 401 });
  }

  await connectDB();

  try {
    const sellers = await Seller.find();
    if (!sellers.length) {
      return NextResponse.json(
        { message: 'No sellers found.' },
        { status: 404 }
      );
    }

    const bogota = new Date(Date.now() - BOGOTA_OFFSET_HOURS * 60 * 60 * 1000);
    const currentDay = bogota.getUTCDay() === 0 ? 7 : bogota.getUTCDay(); // Convert Sunday (0) to 7
    const currentTime = bogota.toISOString().slice(11, 16); // HH:MM

    for (const seller of sellers) {
      const schedules = await Schedule.find({ sellerId: seller._id });

      const isAvailable = schedules.some(schedule => (
        schedule.day === currentDay &&
        schedule.startTime <= currentTime &&
        schedule.endTime >= currentTime
      ));

      await Seller.findByIdAndUpdate(seller._id, { availability: isAvailable });
    }

    return NextResponse.json(
      { message: 'Availability updated successfully for all sellers.' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error updating seller availability:', error);
    return NextResponse.json(
      { message: 'Internal server error.', error: error.message },
      { status: 500 }
    );
  }
}
