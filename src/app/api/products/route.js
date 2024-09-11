<<<<<<< HEAD
import { connectDB } from "@/utils/connectDB";
import { NextResponse } from "next/server";
import { Product } from "@/utils/models/productSchema";
=======
import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Product } from '@/utils/models/productSchema';
>>>>>>> 56f635a2d2b1acb2f083b20eea6d87d056f8115a

export async function GET() {
  connectDB();
  const products = await Product.find().sort({ createdAt: -1 }).limit();
  return NextResponse.json(products);
}
