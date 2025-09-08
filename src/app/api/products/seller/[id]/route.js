import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Product } from '@/utils/models/productSchema';

export async function GET(req, {params}) {
  await connectDB();
    try {
      const url = new URL(req.url);
      const section = url.searchParams.get('section') || '';
      
      let filter = { sellerId: params.id };
      
      // Agregar filtro por sección si se proporciona
      if (section) {
        filter.section = section;
      }
      
      const products = await Product.find(filter);
      return NextResponse.json({ products: products }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching products', error: error.message }, { status: 500 });
    }
  };
  