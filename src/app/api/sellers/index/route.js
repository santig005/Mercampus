import { connectDB } from '@/utils/connectDB'; // Your function to connect to MongoDB
import { NextResponse } from 'next/server';
import {Seller} from '@/utils/models/sellerschema';

// POST method to handle seller registration
export async function GET(req) {
  try {
    // Connect to the database
    await connectDB();
    // Buscar el vendedor por el ID del usuario
    const sellers = await Seller.find();
    
    // Si no se encuentra el vendedor, devolver un mensaje de error
    if (!sellers) {
      return NextResponse.json({ message: 'Seller not found' }, { status: 404 });
    }

    // Devolver los datos del vendedor en formato JSON
    return NextResponse.json({ sellers }, { status: 200 });
  } catch (error) {
    // Manejar errores y devolver una respuesta con el mensaje de error
    return NextResponse.json({ message: 'Error fetching sellers', error: error.message }, { status: 500 });
  }
}