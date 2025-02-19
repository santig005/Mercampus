import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { Product } from '@/utils/models/productSchema';
import { User } from '@/utils/models/userSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';
import { Seller } from '@/utils/models/sellerSchema2';

export async function GET(req) {
  await connectDB();

  const url = new URL(req.url);
  const product = url.searchParams.get('product') || '';
  const category = url.searchParams.get('category') || '';
  const sellerId = url.searchParams.get('sellerId') || '';

  let filter = {};

  if (sellerId) {
    filter.sellerId = sellerId;
  }

  if (category) {
    filter.category = { $in: [category] };
  }

  if (product) {
    filter.name = { $regex: product, $options: 'i' };
  }

  // console.log('Query filter:', JSON.stringify(filter, null, 2));

  let products = await Product.find(filter)
    .populate({
      path: 'sellerId',
      model: 'Seller',
      match: { approved: true },
    })
    .sort({ availability: -1, createdAt: -1 });

  const approvedProducts = products.filter(
    product => product.sellerId !== null
  );

  const transformedProducts = await getPopulatedProducts(approvedProducts);

  return NextResponse.json({ products: transformedProducts }, { status: 200 });
}

const getPopulatedProducts = async approvedProducts => {
  const populatedProducts = await Promise.all(
    approvedProducts.map(async product => {
      const schedules = await Schedule.find({ sellerId: product.sellerId._id });
      schedules.sort((a, b) =>
        a.day !== b.day ? a.day - b.day : a.startTime.localeCompare(b.startTime)
      );

      return {
        ...product.toObject(),
        schedules: schedules.map(schedule => ({
          ...schedule.toObject(),
          day: daysES[schedule.day - 1], // Map dayId to the corresponding day name
        })),
      };
    })
  );

  return populatedProducts;
};

export async function POST(req) {
  try {
    await connectDB();
    const clerkUser = await currentUser();
    if (clerkUser) {
      const email = clerkUser.emailAddresses[0].emailAddress;
      let tempUserId = '';
      const user = await User.findOne({ email: email });
      const userId = user._id;
      tempUserId = userId;

      if (!tempUserId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
      console.log('el id del usuario es ', tempUserId);
      const seller = await Seller.findOne({ userId: tempUserId });
      if (!seller) {
        return NextResponse.json(
          { mensaje: 'El usuario no es un vendedor' },
          { status: 403 }
        );
      }
      const body = await req.json();

      body.sellerId = seller._id;
      const newProduct = new Product(body);
      try {
        await newProduct.save();
      } catch (error) {
        console.log('error al guardar el producto', error);
      }

      return NextResponse.json(
        { message: 'Product created successfully' },
        { status: 201 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { message: 'Error creating product', error: error.message },
      { status: 500 }
    );
  }
}
