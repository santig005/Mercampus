import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { EventProduct } from '@/utils/models/eventProductSchema';
import { Product } from '@/utils/models/productSchema';

export async function GET(req) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const sellerId = url.searchParams.get('sellerId');
    
    if (!sellerId) {
      return NextResponse.json(
        { message: 'SellerId es requerido' },
        { status: 400 }
      );
    }

    // Primero obtenemos todos los eventos del vendedor
    const events = await EventProduct.find({ sellerId })
      .populate({
        path: 'productId',
        select: 'name price category',
        model: Product
      });

    // Agrupamos por categoría
    const categoryCounts = {};
    events.forEach(event => {
      const category = event.productId?.category || 'Sin categoría';
      if (!categoryCounts[category]) {
        categoryCounts[category] = 0;
      }
      categoryCounts[category]++;
    });

    // Convertimos a un array para la respuesta
    const categoryStats = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count
    }));

    return NextResponse.json({ categoryStats }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener estadísticas por categoría:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor', error: error.message },
      { status: 500 }
    );
  }
} 