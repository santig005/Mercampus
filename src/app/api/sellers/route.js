import { connectDB } from '@/utils/connectDB'; // Your function to connect to MongoDB
import { NextResponse } from 'next/server';
import Seller from '@/utils/models/sellerSchema'; // Asegúrate de usar la ruta correcta para el modelo
import { getSession } from 'next-auth/react'; // Importar getSession desde next-auth/react

export async function GET(req) {
  try {
    // Conectar a la base de datos
    await connectDB();

    // Obtener la sesión actual (opcional, en caso de querer vincularlo a un usuario específico)
    /*
    const session = await getSession({ req });

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Obtener el ID del usuario desde la sesión
    const userId = session.userId;
    */

    const userId = "66fd5b94db317a9c479dfc10"; // ID del usuario, puedes obtenerlo dinámicamente si usas sesiones

    // Buscar el vendedor por el ID del usuario
    const seller = await Seller.findOne({ userId });

    // Si no se encuentra el vendedor, devolver un mensaje de error
    if (!seller) {
      return NextResponse.json({ message: 'Seller not found' }, { status: 404 });
    }

    // Devolver los datos del vendedor en formato JSON
    return NextResponse.json({ seller }, { status: 200 });
  } catch (error) {
    // Manejar errores y devolver una respuesta con el mensaje de error
    return NextResponse.json({ message: 'Error fetching seller', error: error.message }, { status: 500 });
  }
}
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

export async function PUT(req) {
  try {
    // Conectar a la base de datos
    await connectDB();

    // Obtener la sesión actual (opcional, en caso de querer vincularlo a un usuario específico)
    /*
    const session = await getSession({ req });

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Obtener el ID del usuario desde la sesión
    const userId = session.userId;
    */

    const userId = "66fd5b94db317a9c479dfc10"; // ID del usuario, puedes obtenerlo dinámicamente si usas sesiones

    // Obtener los datos del cuerpo de la solicitud
    const body = await req.json();

    // Buscar el vendedor por el ID del usuario
    const seller = await Seller.findOne({ userId });

    // Si no se encuentra el vendedor, devolver un mensaje de error
    if (!seller) {
      return NextResponse.json({ message: 'Seller not found' }, { status: 404 });
    }

    // Actualizar los campos del vendedor con los datos recibidos en el cuerpo de la solicitud
    seller.businessName = body.businessName || seller.businessName;
    seller.logo = body.logo || seller.logo;
    seller.phoneNumber = body.phoneNumber || seller.phoneNumber;
    seller.slogan = body.slogan || seller.slogan;
    seller.description = body.description || seller.description;
    seller.instagramUser = body.instagramUser || seller.instagramUser;

    // Guardar los cambios en la base de datos
    await seller.save();

    // Devolver una respuesta de éxito
    return NextResponse.json({ message: 'Seller updated successfully', seller }, { status: 200 });
  } catch (error) {
    // Manejar errores y devolver una respuesta con el mensaje de error
    return NextResponse.json({ message: 'Error updating seller', error: error.message }, { status: 500 });
  }
}