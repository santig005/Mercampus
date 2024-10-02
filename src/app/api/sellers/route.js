import { connectDB } from '@/utils/connectDB'; // Your function to connect to MongoDB
import { NextResponse } from 'next/server';
import Seller from '@/utils/models/sellerSchema'; // Asegúrate de usar la ruta correcta para el modelo
import { getSession } from 'next-auth/react'; // Importar getSession desde next-auth/react

// POST method to handle seller registration
export async function POST(req) {
  try {
    // Connect to the database
    await connectDB();
    // Obtener la sesión actual
    /*
    Lo siguiente sirve si guardamos todos los usuarios en base de datos
    const session = await getSession({ req });

    // Get the current session
    const session = await getServerSession({ req });

    // Check if the user is logged in
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Obtener el ID del usuario desde la sesión
    const userId = session.userId;
    */

    const userId = "66e1f4ef53beafb9e2b1f38b";
    // Obtener los datos del cuerpo de la solicitud
    const body = await req.json();
    console.log('Body:', body);

    // Agregar el ID del usuario al cuerpo del vendedor
    body.userId = userId;

    // Create a new seller using the Seller model
    const newSeller = new Seller(body);
    await newSeller.save();

    // Return a successful response
    return NextResponse.json({ message: 'Seller created successfully' }, { status: 201 });
  } catch (error) {
    // Handle errors and return a response with the message
    return NextResponse.json({ message: 'Error creating seller', error: error.message }, { status: 500 });
  }
}