import { connectDB } from '@/utils/connectDB'; // Tu función para conectar a MongoDB
import { NextResponse } from 'next/server';
import Seller from '@/models/Seller'; // Asegúrate de usar la ruta correcta para el modelo

// Método POST para manejar el registro de vendedores
export async function POST(req) {
  try {
    // Conectar a la base de datos
    await connectDB();

    // Obtener los datos del cuerpo de la solicitud
    const body = await req.json();

    // Crear un nuevo vendedor usando el modelo Seller
    const newSeller = new Seller(body);
    await newSeller.save();

    // Devolver una respuesta exitosa
    return NextResponse.json({ message: 'Seller created successfully' }, { status: 201 });
  } catch (error) {
    // Manejar errores y devolver una respuesta con el mensaje
    return NextResponse.json({ message: 'Error creating seller', error: error.message }, { status: 500 });
  }
}
