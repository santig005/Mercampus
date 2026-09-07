import { connectDB } from '@/utils/connectDB';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Seller } from '@/utils/models/sellerSchema2';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Colombia has no daylight saving, so a fixed offset is enough. Without
// this, "now" would come out in the runtime's timezone (UTC on Vercel),
// which doesn't match the local time the seller entered in their schedule.
const BOGOTA_OFFSET_HOURS = 5;

// T-14: this used to be protected by IP (allowedIPs.js, deleted in T-34).
// Vercel Cron doesn't send Clerk cookies, so the guard is a shared secret in
// the Authorization header rather than a session.
//
// GET, not PATCH: Vercel Cron always calls the route with GET. The original
// code (commented out) exported it as PATCH, which would have left the cron
// hitting a route with no handler for that verb - a silent 405, and nothing
// would ever have been updated.
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
