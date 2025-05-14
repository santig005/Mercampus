// src/app/api/events/product/route.js
import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { EventProduct } from '@/utils/models/eventProductSchema';
import { Product } from '@/utils/models/productSchema'; // Para validar que el producto exista
import { User } from '@/utils/models/userSchema'; // Para obtener el userId si está logueado

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    const { productId, sellerId, source } = body; // pageUrl es opcional

    if (!productId || !sellerId) {
      return NextResponse.json(
        { message: 'ProductId y SellerId son requeridos' },
        { status: 400 }
      );
    }

    const newEvent = new EventProduct({
      productId,
      sellerId,
      source: source || 'whatsapp', // Por defecto whatsapp si no se envía
      eventTimestamp: new Date(),
      // pageUrl: pageUrl || req.headers.get('referer') // Podrías obtener la URL de referencia
    });

    await newEvent.save();

    return NextResponse.json(
      { message: 'Evento registrado exitosamente', event: newEvent },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al registrar evento:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor', error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');
    const sellerId = url.searchParams.get('sellerId');

    let filter = {};
    if (productId) filter.productId = productId;
    if (sellerId) filter.sellerId = sellerId;

    const events = await EventProduct.find(filter)
      .populate('productId', 'name price') // Popula algunos datos del producto
      .populate('sellerId', 'businessName') // Popula algunos datos del vendedor
      .sort({ eventTimestamp: -1 }); // Más recientes primero

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor', error: error.message },
      { status: 500 }
    );
  }
}