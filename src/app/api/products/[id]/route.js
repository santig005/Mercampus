import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Product } from '@/utils/models/productSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';
import {Seller} from '@/utils/models/sellerSchema2';
import { User } from '@/utils/models/userSchema';
import { currentUser } from '@clerk/nextjs/server';
import mongoose from 'mongoose';

export async function GET(req, { params }) {
  try{
    await connectDB();
  }catch(error){
    console.log(error)
  }
  

  // get product by id
  try {
    var product = await Product.findById(params.id).populate({
      path: 'sellerId', // Campo relacionado a poblar
      model: 'Seller', // Modelo al que pertenece el campo
      match: { approved: true }, // Filtro para poblar
    });
    if (!product) {
      return NextResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      );
    }
    var schedules = await Schedule.find({ sellerId: product.sellerId._id });
    schedules.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return a.startTime.localeCompare(b.startTime);
    });

    // Transformar los días a nombres
    schedules = schedules.map(schedule => ({
      ...schedule.toObject(),
      day: daysES[schedule.day - 1],
    }));



    return NextResponse.json({ ...product.toObject(), schedules}, { status: 200 });

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: 'Error getting product', error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    connectDB();
    const data = await req.json();
    const product = await Product.findByIdAndUpdate(params.id, data);
    return NextResponse.json(product);
  } catch (error) {
    console.log(params);
    return NextResponse.json({ error: error.message });
  }
}
export async function DELETE(req, { params }) {
  await connectDB();
  try {
    // 1. Validar formato del ID primero
    const idproduct = params.id;
    console.log("el id es: ", idproduct);
    //imprimimos el tipo
    console.log("el tipo es: ", typeof idproduct);
    if (!mongoose.Types.ObjectId.isValid(idproduct)) {
      return NextResponse.json(
        { message: 'ID de producto inválido' },
        { status: 400 }
      );
    }

    // 2. Autenticación
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    // 3. Buscar usuario en DB
    const email = user.emailAddresses[0].emailAddress;
    const userDB = await User.findOne({ email });
    if (!userDB) {
      return NextResponse.json(
        { message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // 4. Verificar rol de vendedor
    const seller = await Seller.findOne({ userId: userDB._id });
    if (!seller) {
      return NextResponse.json(
        { message: 'Acceso denegado. Solo vendedores' },
        { status: 403 }
      );
    }

    // 5. Obtener producto y verificar propiedad
    const product = await Product.findById(idproduct); // <-- Corregido aquí
    if (!product) {
      return NextResponse.json(
        { message: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (product.sellerId.toString() !== seller._id.toString()) {
      return NextResponse.json(
        { message: 'No tienes permisos para eliminar este producto' },
        { status: 403 }
      );
    }

    // 6. Eliminar producto
    await Product.findByIdAndDelete(idproduct); // <-- Corregido aquí
    
    return NextResponse.json(
      { message: 'Producto eliminado' },
      { status: 200 }
    );

  } catch (error) {
    return NextResponse.json(
      { message: 'Error deleting product', error: error.message },
      { status: 500 }
    );
  }
}