import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Product } from '@/app/models/productSchema';

export async function GET(req, { params }) {
  try {
    connectDB();
    const product = await Product.findById(params.id);
    return NextResponse.json(product);
  } catch (error) {
    console.log(params);
    return NextResponse.json({ error: error.message });
  }
}
