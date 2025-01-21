import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Product } from '@/utils/models/productSchema';

export async function GET(req, {params}) {
  await connectDB();
    try {
        const products = await Product.find({ sellerId: params.id});
      return NextResponse.json({ products:products }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching products', error: error.message }, { status: 500 });
    }
  };
  