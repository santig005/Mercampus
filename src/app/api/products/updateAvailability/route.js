import { connectDB } from "@/utils/connectDB";
import { Schedule } from '@/utils/models/scheduleSchema';
import { Product } from '@/utils/models/productSchema';
import { Day } from '@/utils/models/daySchema';
import {Time} from '@/utils/models/timeSchema';

const getCurrentTimeString = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  // Función para obtener el nombre del día basado en new Date().getDay()
  const getDayName = (dayNumber) => {
    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    return daysOfWeek[dayNumber];
  };
  
  // Handler para la petición GET
  export async function GET() {
    await connectDB();
  
    const currentDayNumber = new Date().getDay(); // Obtener el número de día actual (0=Domingo, 1=Lunes, etc.)
    const currentDayName = getDayName(currentDayNumber); // Obtener el nombre del día
    const currentTime = getCurrentTimeString(); // Hora actual en formato "HH:mm"
  
    try {
      // Obtener el ObjectId del día actual basado en el nombre del día
      const dayDoc = await Day.findOne({ name: currentDayName });
  
      if (!dayDoc) {
        return new Response(JSON.stringify({ message: 'Día no encontrado' }), { status: 404 });
      }
  
      // Obtener los horarios disponibles para el día y hora actuales
      const availableSchedules = await Schedule.find({
        idDay: dayDoc._id, // Usar el ObjectId del día
      })
        .populate('startTime endTime') // Poblamos startTime y endTime
        .exec();
  
      // Filtrar los vendedores que están dentro del rango de tiempo actual
      const sellerIds = availableSchedules
        .filter(schedule => {
          const start = schedule.startTime.name;
          const end = schedule.endTime.name;
          return currentTime >= start && currentTime <= end;
        })
        .map(schedule => schedule.sellerId);
  
      // Actualizar productos de vendedores disponibles
      if (sellerIds.length > 0) {
        await Product.updateMany(
          { sellerId: { $in: sellerIds } },
          { availability: true }
        );
      }
  
      // Actualizar productos de vendedores no disponibles
      await Product.updateMany(
        { sellerId: { $nin: sellerIds } },
        { availability: false }
      );
  
      // Responder con éxito y un mensaje
      return new Response(
        JSON.stringify({ message: 'Disponibilidad actualizada correctamente' }),
        { status: 200 }
      );
    } catch (error) {
      console.error('Error al actualizar disponibilidad:', error);
      return new Response(
        JSON.stringify({ message: 'Error al actualizar disponibilidad' }),
        { status: 500 }
      );
    }
  }