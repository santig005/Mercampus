import { connectDB } from '@/connectDB';
import { NextResponse } from 'next/server';

export async function GET() {
  connectDB();
  return NextResponse.json({ products: { name: 'Product 1', price: 100 } });
}
