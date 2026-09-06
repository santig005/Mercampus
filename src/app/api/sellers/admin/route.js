import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Seller } from '@/utils/models/sellerSchema2';
import { Schedule } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';
import { logger } from '@/lib/logger';

// T-12: quien puede llegar aqui ya lo decidio el middleware (publicMetadata de
// Clerk, no el `role` de Mongo) - antes esta ruta reinventaba su propio
// chequeo con un Map+setInterval en memoria, que en serverless es cache por
// instancia y un intervalo que nunca se limpia.
//
// Sin ese chequeo (que leia currentUser()), la ruta ya no toca nada especifico
// de la request y Next la optimiza como estatica: la serviria cacheada desde
// el build en vez de consultar Mongo en cada llamada. force-dynamic evita
// servir vendedores desactualizados al panel de admin.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Connect to the database
    await connectDB();

    // Obtener TODOS los vendedores ordenados del más nuevo al más viejo
    const sellers = await Seller.find()
      .sort({ createdAt: -1 }) // Ordenar por fecha de creación descendente (más nuevo primero)
      .lean();

    if (!sellers || sellers.length === 0) {
      return NextResponse.json({ 
        sellers: [],
        total: 0,
        message: 'No se encontraron vendedores'
      }, { status: 200 });
    }
    
    // Poblar con horarios para cada vendedor
    const populatedSellers = await Promise.all(
      sellers.map(async seller => {
        const schedules = await Schedule.find({ sellerId: seller._id });
        schedules.sort((a, b) => {
          if (a.day !== b.day) return a.day - b.day;
          return a.startTime.localeCompare(b.startTime);
        });
        return { ...seller, schedules };
      })
    );

    // Transformar horarios para mostrar nombres de días
    const transformedSellers = populatedSellers.map(seller => {
      const transformedSchedules = seller.schedules.map(schedule => ({
        ...schedule,
        day: daysES[schedule.day - 1], // Map dayId to the corresponding day name
      }));
      return { ...seller, schedules: transformedSchedules };
    });
    
    return NextResponse.json({ 
      sellers: transformedSellers,
      total: transformedSellers.length,
      message: 'Vendedores obtenidos exitosamente para administración'
    }, { status: 200 });

  } catch (error) {
    logger.error('Error en endpoint admin de sellers:', error);
    return NextResponse.json({ 
      message: 'Error interno del servidor', 
      error: error.message 
    }, { status: 500 });
  }
}
