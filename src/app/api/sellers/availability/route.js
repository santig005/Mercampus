import { connectDB } from '@/utils/connectDB';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Seller } from '@/utils/models/sellerSchema';
import { NextResponse } from 'next/server';
import { allowed_ips } from '@/utils/resources/allowedIPs';

export async function PATCH(req) {
  await connectDB();

  try {

    let clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip;
    clientIp = clientIp.replace('::ffff:', ''); // Normalize IPv6-mapped IPv4
    const ipList = await allowed_ips();

    console.log('Allowed IPs:', ipList);
    console.log('Client IP:', clientIp);

    if (!ipList.includes(clientIp)) {
      return NextResponse.json(
        { message: 'Forbidden: Unauthorized IP' },
        { status: 403 }
      );
    }

    const sellers = await Seller.find();
    if (!sellers.length) {
      return NextResponse.json(
        { message: 'No sellers found.' },
        { status: 404 }
      );
    }

    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // Convert Sunday (0) to 7
    const currentTime = now.toTimeString().slice(0, 5); // Get HH:MM format

    for (const seller of sellers) {
      const schedules = await Schedule.find({ sellerId: seller._id });
      
      let isAvailable = schedules.some(schedule => (
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
    return NextResponse.json(
      { message: 'Internal server error.', error: error.message },
      { status: 500 }
    );
  }
}
