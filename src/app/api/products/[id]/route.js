export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Product } from '@/utils/models/productSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';
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
    await connectDB();
    // 1) valida auth + ownership
    await verifyOwnershipAndGetSellerId(params.id);

    // 2) haz el update
    const data = await req.json();
    const updated = await Product.findByIdAndUpdate(params.id, data, { new: true });
    if (!updated) {
      throw new AppError("Producto no encontrado al actualizar.", 404);
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Error en PUT /api/products/:id", err);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: err.status || 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    // 1) valida auth + ownership
    await verifyOwnershipAndGetSellerId(params.id);

    // 2) haz el delete
    const deleted = await Product.findByIdAndDelete(params.id);
    if (!deleted) {
      throw new AppError("Producto no encontrado al eliminar.", 404);
    }
    return NextResponse.json({ message: "Producto eliminado" }, { status: 200 });
  } catch (err) {
    console.error("Error en DELETE /api/products/:id", err);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: err.status || 500 }
    );
  }
}