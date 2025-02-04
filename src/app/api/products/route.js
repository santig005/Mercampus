import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { Product } from '@/utils/models/productSchema';
import { User } from '@/utils/models/userSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';
import {Seller} from '@/utils/models/sellerschema';

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

  const products = await Product.find(filter)
    .sort({
      availability: -1,
      createdAt: -1,
    })
    .populate({
      path: 'sellerId', // Campo relacionado a poblar
      model: 'Seller', // Modelo al que pertenece el campo
      match: {approved: true}, // Filtro para poblar
    });
  const approvedProducts = products.filter(product => product.sellerId !== null);

  const populatedProducts = await Promise.all(
    approvedProducts.map(async product => {
      const schedules = await Schedule.find({ sellerId: product.sellerId._id });
      schedules.sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.startTime.localeCompare(b.startTime);
      });
      return { ...product.toObject(), schedules };
    })
  );
  const transformedProducts = populatedProducts.map(product => {
    const transformedSchedules = product.schedules.map(schedule => ({
      ...schedule.toObject(),
      day: daysES[schedule.day - 1], // Map dayId to the corresponding day name
    }));
    return { ...product, schedules: transformedSchedules };
  });
  return NextResponse.json(transformedProducts, { status: 200 });
}
// spell:disable
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
      console.log("el id del usuario es ",tempUserId);
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
      try{
        await newProduct.save();
      }
      catch(error){
        console.log("error al guardar el producto",error);
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
