import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Seller } from '@/utils/models/sellerSchema2';
import { Schedule } from '@/utils/models/scheduleSchema';
import { User } from '@/utils/models/userSchema';
import { currentUser } from '@clerk/nextjs/server';
import { daysES } from '@/utils/resources/days';

// Cache en memoria para roles de usuario (evita consultas repetidas a BD)
const userRoleCache = new Map();

// Limpiar cache cada 5 minutos para evitar crecimiento excesivo
setInterval(() => {
  userRoleCache.clear();
}, 5 * 60 * 1000);

export async function GET(req) {
  try {
    // Connect to the database
    await connectDB();

    // Verificar si el usuario actual es admin
    let isAdmin = false;
    try {
      const user = await currentUser();
      if (user) {
        const userId = user.id;
        const email = user.emailAddresses[0].emailAddress;
        
        // Verificar cache primero
        const cachedRole = userRoleCache.get(userId);
        if (cachedRole !== undefined) {
          isAdmin = cachedRole === 'admin';
        } else {
          // Solo hacer consulta a BD si no está en cache
          const dbUser = await User.findOne({ email: email });
          const userRole = dbUser?.role || 'buyer';
          userRoleCache.set(userId, userRole);
          isAdmin = userRole === 'admin';
        }
      }
    } catch (error) {
      console.log('Error verificando rol de admin:', error);
      return NextResponse.json({ message: 'Error de autenticación' }, { status: 401 });
    }

    // Solo admins pueden acceder a este endpoint
    if (!isAdmin) {
      return NextResponse.json({ message: 'Acceso denegado. Solo administradores.' }, { status: 403 });
    }

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
    console.error('Error en endpoint admin de sellers:', error);
    return NextResponse.json({ 
      message: 'Error interno del servidor', 
      error: error.message 
    }, { status: 500 });
  }
}
