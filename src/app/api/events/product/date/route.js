import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { EventProduct } from '@/utils/models/eventProductSchema';
import { format, subDays } from 'date-fns';

export async function GET(req) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const sellerId = url.searchParams.get('sellerId');
    const days = parseInt(url.searchParams.get('days') || '30');
    
    if (!sellerId) {
      return NextResponse.json(
        { message: 'SellerId es requerido' },
        { status: 400 }
      );
    }

    // Calcular fecha de inicio (hace X días)
    const startDate = subDays(new Date(), days);

    // Obtener todos los eventos del vendedor desde la fecha de inicio
    const events = await EventProduct.find({
      sellerId,
      eventTimestamp: { $gte: startDate }
    }).sort({ eventTimestamp: 1 });

    // Agrupar por fecha
    const dateMap = {};
    events.forEach(event => {
      const dateStr = format(new Date(event.eventTimestamp), 'yyyy-MM-dd');
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = 0;
      }
      dateMap[dateStr]++;
    });

    // Generar todas las fechas en el rango para llenar los huecos
    const dateStats = [];
    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      dateStats.push({
        date: dateStr,
        count: dateMap[dateStr] || 0
      });
    }

    // Ordenar por fecha ascendente
    dateStats.sort((a, b) => new Date(a.date) - new Date(b.date));

    return NextResponse.json({ dateStats }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener estadísticas por fecha:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor', error: error.message },
      { status: 500 }
    );
  }
} 