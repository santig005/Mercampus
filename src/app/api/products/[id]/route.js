import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Product } from '@/utils/models/productSchema';

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

export async function PUT(req, { params }) {
  try {
    connectDB();
    const data = await req.json();
    const product = await Product.findByIdAndUpdate(params.id, data);
    return NextResponse.json(product);
  } catch (error) {
    console.log(params);
    return NextResponse.json({ error: error.message });
  }
}

export async function DELETE(req, { params }) {
  await connectDB();
  try {
    const { id } = params;
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Product deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Error deleting product', error: error.message }, { status: 500 });
  }
};