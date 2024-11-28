import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Product } from '@/utils/models/productSchema';
import { Seller } from '@/utils/models/sellerschema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Time } from '@/utils/models/timeSchema';
import { Day } from '@/utils/models/daySchema';

export async function GET(req) {
  try {
    // Conectar a la base de datos
    await connectDB();

    // Filtrar productos (puedes personalizar el filtro según tus necesidades)
    const filter = {}; // Cambia esto si necesitas filtros específicos
    const products = await Product.find(filter)
      .sort({ availability: -1, createdAt: -1 })
      .populate({
        path: 'sellerId',
        model: Seller, // Relacionar con el modelo Seller
      });

    // Agregar horarios del vendedor a cada producto
    
  } catch (error) {
      const productsWithSellerInfo = await Promise.all(
      products.map(async (product) => {
        // Obtener horarios del vendedor
        const schedules = await Schedule.find({ sellerId: product.sellerId._id })
        .populate({
          path: 'startTime',
          model: Time,
        })
        .populate({
          path: 'endTime',
          model: Time,
        })
        .populate({
          path: 'idDay',
          model: Day,
        });

        // Ordenar los horarios
        schedules.sort((a, b) => {
          if (a.idDay.day_number === b.idDay.day_number) {
            return a.startTime.time_number - b.startTime.time_number;
          } else {
            return a.idDay.day_number - b.idDay.day_number;
          }
        });

        // Formatear los horarios
        const formattedSchedules = schedules.map((schedule) => ({
          day: schedule.idDay.name,
          startTime: schedule.startTime.name,
          endTime: schedule.endTime.name,
        }));

        // Retornar el producto con la información del vendedor y horarios
        return {
          ...product.toObject(), // Convertir el documento de Mongoose a un objeto plano
          seller: {
            ...product.sellerId.toObject(),
            schedules: formattedSchedules,
          },
        };
      })
    );
    console.log("productsWithSellerInfo", productsWithSellerInfo);

    // Responder con los productos, incluyendo la información del vendedor y horarios
    return NextResponse.json({ products: productsWithSellerInfo }, { status: 200 });
    console.error('Error fetching products with seller info and schedules:', error);
    return NextResponse.json({ message: 'Error fetching products', error: error.message }, { status: 500 });
  }
}


export async function POST(req) {
  try {
    // Conectar a la base de datos
    await connectDB();
    // Obtener la sesión actual
    const clerkUser = await currentUser();

    if (clerkUser) {
      const email = clerkUser.emailAddresses[0].emailAddress;
      let tempUserId = '';
      try {
        const user = await User.findOne({ email: email });
        const userId = user._id;
        tempUserId = userId;
      } catch (error) {
        console.log('Error al buscar el usuario:', error.message);
      }

      if (!tempUserId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }

      const seller = await Seller.findOne({ userId: tempUserId });
      if (!seller) {
        return NextResponse.json(
          { mensaje: 'El usuario no es un vendedor' },
          { status: 403 }
        );
      }
      // Obtener el cuerpo de la solicitud
      const body = await req.json();

      // Añadir el ID del usuario al objeto de producto
      body.sellerId = seller._id; // Asumimos que el usuario es un vendedor y el ID se almacena

      // Crear un nuevo producto usando el modelo de Producto
      console.log('vamos a imprimir');
      console.log(body);
      const newProduct = new Product(body);
      await newProduct.save();

      // Retornar una respuesta exitosa
      return NextResponse.json(
        { message: 'Product created successfully' },
        { status: 201 }
      );
    }
  } catch (error) {
    // Manejar errores y retornar una respuesta con el mensaje de error
    return NextResponse.json(
      { message: 'Error creating product', error: error.message },
      { status: 500 }
    );
  }
}
