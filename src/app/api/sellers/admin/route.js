import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Seller } from '@/utils/models/sellerSchema2';
import { Schedule } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';
import { logger } from '@/lib/logger';

// T-12: who gets here was already decided by the middleware (Clerk's
// publicMetadata, not Mongo's `role`) - this route used to reinvent its own
// check with an in-memory Map+setInterval, which in serverless is a
// per-instance cache and an interval that is never cleared.
//
// Without that check (which read currentUser()), the route touches nothing
// request-specific and Next optimises it as static: it would be served
// cached from the build instead of querying Mongo on every call.
// force-dynamic keeps the admin panel from being handed stale sellers.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Connect to the database
    await connectDB();

    // ALL the sellers, newest first
    const sellers = await Seller.find()
      .sort({ createdAt: -1 }) // newest first
      .lean();

    if (!sellers || sellers.length === 0) {
      return NextResponse.json({ 
        sellers: [],
        total: 0,
        message: 'No se encontraron vendedores'
      }, { status: 200 });
    }
    
    // Attach each seller's schedules
    const populatedSellers = await Promise.all(
      sellers.map(async seller => {
        const schedules = await Schedule.find({ sellerId: seller._id });
        schedules.sort((a, b) => {
          if (a.day !== b.day) return a.day - b.day;
          return a.startTime.localeCompare(b.startTime);
        });
        return { ...seller, schedules };
      })
    );

    // Turn the day numbers into day names for display
    const transformedSellers = populatedSellers.map(seller => {
      const transformedSchedules = seller.schedules.map(schedule => ({
        ...schedule,
        day: daysES[schedule.day - 1], // Map dayId to the corresponding day name
      }));
      return { ...seller, schedules: transformedSchedules };
    });
    
    return NextResponse.json({ 
      sellers: transformedSellers,
      total: transformedSellers.length,
      message: 'Vendedores obtenidos exitosamente para administración'
    }, { status: 200 });

  } catch (error) {
    logger.error('Error en endpoint admin de sellers:', error);
    return NextResponse.json({ 
      message: 'Error interno del servidor', 
      error: error.message 
    }, { status: 500 });
  }
}
