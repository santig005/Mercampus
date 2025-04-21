import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Product } from '@/utils/models/productSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';
import {Seller} from '@/utils/models/sellerSchema2';
import { User } from '@/utils/models/userSchema';
import { currentUser } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { getCurrentSeller } from '@/utils/lib/auth';

import { verifyOwnershipAndGetSellerId } from '@/utils/lib/auth';

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
    await connectDB(); // Conecta al inicio
    const { id: productId } = params;

    // 1. Verificar propiedad Y obtener ID del vendedor (1 consulta principal)
    // Esta función maneja: validación de ID, auth Clerk, y propiedad del producto.
    // Si algo falla, lanzará un error capturado por el catch.
    const sellerId = await verifyOwnershipAndGetSellerId(productId);
    console.log(`PUT - Verificación exitosa para producto ${productId}, propietario ${sellerId}`);

    // 2. Obtener los datos a actualizar del cuerpo de la solicitud
    const data = await req.json();
    // Opcional: Validar los datos recibidos (ej. que 'name' no esté vacío, etc.) si es necesario

    // 3. Si la verificación pasó, realizar la actualización
    //    Usamos { new: true } para que devuelva el documento actualizado.
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      data, // Los datos a actualizar
    );

    // 4. Verificar si la actualización fue exitosa
    if (!updatedProduct) {
        // Esto podría pasar si el producto fue eliminado justo entre la verificación y la actualización (poco probable pero posible)
        console.warn(`Advertencia en PUT: Producto ${productId} no encontrado en findByIdAndUpdate después de verificar propiedad.`);
        throw { status: 404, message: 'Producto no encontrado al intentar actualizar (inesperado).' };
    }

    console.log(`PUT - Producto ${productId} actualizado exitosamente.`);
    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error) {
    console.error(`Error en PUT /api/products/${params.id}:`, error);
    return NextResponse.json({ error: error.message });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { id: productId } = params;

    // 1. Verificar propiedad Y obtener ID del vendedor (1 consulta principal)
    // Esta función ahora valida el ID, la autenticación y la propiedad.
    // Si algo falla, lanzará un error que será capturado por el catch.
    const sellerId = await verifyOwnershipAndGetSellerId(productId);
    console.log(`DELETE - Verificación exitosa para producto ${productId}, propietario ${sellerId}`);

    // 2. Si la verificación pasó, proceder a eliminar
    const deletedProduct = await Product.findByIdAndDelete(productId);

    // Doble check por si acaso (aunque verifyOwnership debería garantizar que existe)
    if (!deletedProduct) {
      console.warn(`Advertencia en DELETE: Producto ${productId} no encontrado en findByIdAndDelete después de verificar propiedad.`);
      // Podríamos devolver 404 aquí, pero es una condición de carrera improbable.
      // Mantener el flujo normal asumiendo que la verificación es suficiente.
      // O lanzar un error específico si quieres ser extra cauto.
       throw { status: 404, message: 'El producto fue eliminado concurrentemente o no se encontró (inesperado).' };
    }

    console.log(`DELETE - Producto ${productId} eliminado exitosamente.`);
    return NextResponse.json({ message: 'Producto eliminado correctamente' }, { status: 200 });

  } catch (error) {
    // Captura cualquier error lanzado por verifyOwnershipAndGetSellerId o findByIdAndDelete
    console.error(`Error en DELETE /api/products/${params.id}:`, error);
    return NextResponse.json(
      { message: error.message || 'Error interno del servidor.' },
      { status: error.status || 500 }
    );
  }
}