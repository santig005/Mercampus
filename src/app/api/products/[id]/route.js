import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { AppError } from '@/utils/lib/errors';
import { updateProductSchema } from '@/lib/validators/product';
import { invalidPayload } from '@/lib/api-response';
import { verifyOwnershipAndGetSellerId } from '@/utils/lib/auth';
import { Product } from '@/utils/models/productSchema';
import { Seller } from '@/utils/models/sellerSchema2';
import { Schedule } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';
import { logger } from '@/lib/logger';

export async function GET(req, { params }) {
  try{
    await connectDB();
  }catch(error){
    logger.debug(error)
  }
  

  // get product by id
  try {
    var product = await Product.findById(params.id).populate({
      path: 'sellerId', // the related field to populate
      model: 'Seller', // the model that field belongs to
      match: { approved: true }, // filter applied while populating
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

    // Turn the day numbers into names
    schedules = schedules.map(schedule => ({
      ...schedule.toObject(),
      day: daysES[schedule.day - 1],
    }));



    return NextResponse.json({ ...product.toObject(), schedules}, { status: 200 });

  } catch (error) {
    logger.debug(error);
    return NextResponse.json(
      { message: 'Error getting product', error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();

    // Identity and ownership before touching anything. They throw AppError
    // with its status: 401 without a session, 403 if the product belongs to
    // another seller.
    await verifyOwnershipAndGetSellerId(params.id);

    const parsed = updateProductSchema.safeParse(await req.json());
    if (!parsed.success) {
      return invalidPayload(parsed.error);
    }

    const updated = await Product.findByIdAndUpdate(params.id, parsed.data, {
      new: true,
    });
    if (!updated) {
      return NextResponse.json(
        { message: "Producto no encontrado al actualizar." },
        { status: 404 }
      );
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    logger.error("Error en PUT /api/products/:id", err);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: err.status || 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();

    await verifyOwnershipAndGetSellerId(params.id);

    const deleted = await Product.findByIdAndDelete(params.id);
    if (!deleted) {
      throw new AppError("Producto no encontrado al eliminar.", 404);
    }
    return NextResponse.json({ message: "Producto eliminado" }, { status: 200 });
  } catch (err) {
    logger.error("Error en DELETE /api/products/:id", err);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: err.status || 500 }
    );
  }
}