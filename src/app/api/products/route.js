import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Product } from '@/app/models/productSchema';

export async function GET() {
  connectDB();
  const products = await Product.find().sort({ createdAt: -1 }).limit();
  return NextResponse.json(products);
}
