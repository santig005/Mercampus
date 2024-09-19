import { connectDB } from '@/utils/connectDB'; // Tu función para conectar a MongoDB
import { NextResponse } from 'next/server';
import Seller from '@/utils/models/sellerSchema'; // Asegúrate de usar la ruta correcta para el modelo
import { getSession } from 'next-auth/react'; // Importar getSession desde next-auth/react

// Método POST para manejar el registro de vendedores
export async function POST(req) {
  try {
    // Conectar a la base de datos
    await connectDB();
    // Obtener la sesión actual
    /*
    Lo siguiente sirve si guardamos todos los usuarios en base de datos
    const session = await getSession({ req });

    // Verificar si el usuario está logueado
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Obtener el ID del usuario desde la sesión
    const userId = session.userId;
    */

    const userId = "66e1f4ef53beafb9e2b1f38b";
    // Obtener los datos del cuerpo de la solicitud
    const body = await req.json();

    // Agregar el ID del usuario al cuerpo del vendedor
    body.userId = userId;

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
