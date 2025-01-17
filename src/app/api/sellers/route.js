import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Seller } from '@/utils/models/sellerschema';

export async function GET(req) {
  try {
    // Connnect to the database
    await connectDB();

    // Get all sellers
    const sellers = await Seller.find();
    if (!sellers || sellers.length === 0) {
      return NextResponse.json({ message: 'Sellers not found' }, { status: 404 });
    }

    return NextResponse.json({ sellers: sellers }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching sellers', error: error.message }, { status: 500 });
  }
}


// POST method to handle seller registration
export async function POST(req) {
  try {
    // Connect to the database
    await connectDB();
    const user = await currentUser();    
    if(user){
    const email=user.emailAddresses[0].emailAddress
    let tempUserId="";
    var usuario;
    try {
      usuario = await User.findOne({ email:email });
      const userId = usuario._id;
      tempUserId=userId;
    } catch (error) {
      console.log("Error al buscar el usuario:", error.message);
    }

    // Obtener los datos del cuerpo de la solicitud
    const body = await req.json();
    try{  
      body.userId = tempUserId;
      body.clerkId = user.id;
      usuario.role="seller";
      usuario.save()
    }catch(error){
      console.log(error);
    }

    // Create a new seller using the Seller model
    try{
      const newSeller = new Seller(body); 
      await newSeller.save();

    }catch(error){
      console.log(error);
    }
  

    // Return a successful response
    return NextResponse.json({ message: 'Seller created successfully' }, { status: 201 });
  }
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