import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server'; 
import { Product } from '@/utils/models/productSchema';                                                                                       
export async function GET() {
  connectDB();  
  const products = await Product.find().sort({ createdAt: -1 }).limit();
  return NextResponse.json(products);
}                                                 

export async function POST(req) {
  try {
    // Conectar a la base de datos
    await connectDB();

    // Obtener la sesión actual
    //const session = await getServerSession({ req });

    // Verificar si el usuario está logueado
    //if (!session) {
    //  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    //}

    // Obtener el ID del usuario desde la sesión
    //const userId = session.user.id;
    const userId = "66e1f4ef53beafb9e2b1f38b"; // ID de usuario de ejemplo

    // Obtener el cuerpo de la solicitud
    const body = await req.json();

    // Añadir el ID del usuario al objeto de producto
    body.sellerId = userId; // Asumimos que el usuario es un vendedor y el ID se almacena

    // Crear un nuevo producto usando el modelo de Producto
    console.log("vamos a impirmier");
    console.log(body);
    console.log("vamos a imp");
    const newProduct = new Product(body);
    await newProduct.save();

    // Retornar una respuesta exitosa
    return NextResponse.json({ message: 'Product created successfully' }, { status: 201 });
  } catch (error) {
    // Manejar errores y retornar una respuesta con el mensaje de error
    return NextResponse.json({ message: 'Error creating product', error: error.message }, { status: 500 });
  }
}