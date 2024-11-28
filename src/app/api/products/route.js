import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { Product } from '@/utils/models/productSchema';
import { User } from '@/utils/models/userSchema';
import { Seller } from '@/utils/models/sellerschema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { Time } from '@/utils/models/timeSchema';
import { Day } from '@/utils/models/daySchema';

export async function GET(req, res) {
  await connectDB();

  const product = new URL(req.url).searchParams.get('q') || '';

  let filter = {};

  if (product) {
    filter = {
      $or: [
        {
          name: {
            $regex: product, // Buscar texto completo o parcial en `name`
            $options: 'i', // Insensible a mayúsculas/minúsculas
          },
        },
        {
          category: {
            $regex: product, // Buscar texto completo o parcial en `category`
            $options: 'i', // Insensible a mayúsculas/minúsculas
          },
        },
      ],
    };
  }

  const products = await Product.find(filter).sort({
    availability: -1,
    createdAt: -1,
  });

  const productsAndSchedule = await Promise.all(
    products.map(async product => {
      const seller = await Seller.findById(product.sellerId);
      let schedules = await Schedule.find({ sellerId: seller._id })
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
      schedules.sort((a, b) => {
        if (a.idDay.day_number === b.idDay.day_number) {
          return a.startTime.time_number - b.startTime.time_number;
        } else {
          return a.idDay.day_number - b.idDay.day_number;
        }
      });

      schedules = schedules.map(schedule => ({
        day: schedule.idDay.name,
        startTime: schedule.startTime.name,
        endTime: schedule.endTime.name,
      }));

      return {
        ...product.toObject(),
        seller: seller.toObject(),
        schedules,
      };
    })
  );

  // Responder con los productos, incluyendo la información del vendedor y horarios
  return NextResponse.json(productsAndSchedule);
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
