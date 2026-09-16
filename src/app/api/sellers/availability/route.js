import { connectDB } from '@/utils/connectDB';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Seller } from '@/utils/models/sellerSchema2';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { bogotaClock, isOpenAt, isOverrideActive } from '@/lib/store-availability';

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

    // T-122: the same definition of "open" the product badges use.
    const now = new Date();
    const clock = bogotaClock(now);

    for (const seller of sellers) {
      const schedules = await Schedule.find({ sellerId: seller._id }).lean();

      // T-83: `seller` comes from `Seller.find()` without `.lean()`, so
      // Mongoose applies the schema default (`null`) for every seller that
      // predates this field - reading it directly is safe, no `$ne`-style
      // filter needed. This composes the override into the recomputed value
      // instead of the cron skipping affected sellers outright, so the write
      // below never has to know an override exists.
      const overrideActive = isOverrideActive(seller.availabilityOverrideUntil, now);
      const isAvailable = isOpenAt(schedules, clock, overrideActive);

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
