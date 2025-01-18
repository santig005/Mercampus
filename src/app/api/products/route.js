import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { Product } from '@/utils/models/productSchema';
import { User } from '@/utils/models/userSchema';
import { Seller } from '@/utils/models/sellerschema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';
export async function GET(req, res) {
  await connectDB();

  const product = new URL(req.url).searchParams.get('q') || '';

  let filter = {};

  if (product) {
    filter = {
      $or: [
        {
          name: {
            $regex: product, // Search for full or partial text in `name`
            $options: 'i', // Not sensitive to uppercase/lowercase
          },
        },
        {
          category: {
            $regex: product, // Search for full or partial text in `category`
            $options: 'i', // Not sensitive to uppercase/lowercase
          },
        },
      ],
    };
  }

  const products = await Product.find(filter).sort({
    availability: -1,
    createdAt: -1,
  }).populate({
    path: 'sellerId', // Campo relacionado a poblar
    model: "Seller", // Modelo al que pertenece el campo
  });
  
  const populatedProducts = await Promise.all(
    products.map(async (product) => {
      const schedules = await Schedule.find({ sellerId: product.sellerId._id });
      schedules.sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.startTime.localeCompare(b.startTime);
    })
      return { ...product.toObject(), schedules };
    })
  );
const transformedProducts = populatedProducts.map((product) => {
  const transformedSchedules = product.schedules.map((schedule) => ({
    ...schedule.toObject(),
    day: daysES[schedule.day - 1], // Map dayId to the corresponding day name
  }));
  return { ...product, schedules: transformedSchedules };
});
  return NextResponse.json(transformedProducts, { status: 200 });
}