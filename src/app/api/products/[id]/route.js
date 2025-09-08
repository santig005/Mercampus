import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Product } from '@/utils/models/productSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';

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
    console.log("→ PUT /api/products/:id, arrancando auth...");
    //const { userId, email } = await getUserFromToken(req);
    //console.log("✔️ Sesión válida para userId:", userId, "email:", email);

    // 3) Verifica que el usuario autenticado sea el vendedor propietario del producto dado, y devuelve el sellerId.
    
    await connectDB();
    // 1) valida auth + ownership
    
    //7await verifyOwnershipAndGetSellerId(params.id,email);

    // 2) haz el update
    const data = await req.json();
    
    // Validar que la sección sea válida si se está actualizando
    if (data.section && !['antojos', 'marketplace'].includes(data.section)) {
      return NextResponse.json(
        { message: 'Sección inválida. Debe ser "antojos" o "marketplace"' },
        { status: 400 }
      );
    }
    
    const updated = await Product.findByIdAndUpdate(params.id, data, { new: true });
    if (!updated) {
      return NextResponse.json(
        { message: "Producto no encontrado al actualizar." },
        { status: 404 }
      );
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
    //await verifyOwnershipAndGetSellerId(params.id);

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