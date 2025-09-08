import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { Product } from '@/utils/models/productSchema';
import { User } from '@/utils/models/userSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';
import { Seller } from '@/utils/models/sellerSchema2';

export async function GET(req) {
  await connectDB();

  const url = new URL(req.url);
  const product = url.searchParams.get('product') || '';
  const category = url.searchParams.get('category') || '';
  const sellerId = url.searchParams.get('sellerId') || '';
  const university = url.searchParams.get('university') || '';
  const section = url.searchParams.get('section') || 'antojos';

  // Actualizar productos sin sección para que tengan section: 'antojos'
  await Product.updateMany(
    { section: { $exists: false } },
    { $set: { section: 'antojos' } }
  );

  let filter = {};

  if (sellerId) {
    filter.sellerId = sellerId;
  }

  if (category) {
    filter.category = { $in: [category] };
  }

  if (product) {
    filter.name = { $regex: product, $options: 'i' };
  }

  if (section) {
    filter.section = section;
  }

  let products = await Product.find(filter).populate({
    path: 'sellerId', // Campo relacionado a poblar
    model: 'Seller', // Modelo al que pertenece el campo
    match: { approved: true ,university:university}, // Filtro para poblar
  });
  
  products = products.sort(() => Math.random() - 0.5);
  products.sort((a, b) => b.availability - a.availability);
  const approvedProducts = products.filter(
    (product) => product.sellerId !== null
  );

  const populated = await getPopulatedProducts(approvedProducts);

  return NextResponse.json({ products: populated }, { status: 200 });
}

const getPopulatedProducts = async (approvedProducts) => {
  const populatedProducts = await Promise.all(
    approvedProducts.map(async (product) => {
      const schedules = await Schedule.find({ sellerId: product.sellerId._id });
      schedules.sort((a, b) =>
        a.day !== b.day ? a.day - b.day : a.startTime.localeCompare(b.startTime)
      );

      return {
        ...product.toObject(),
        schedules: schedules.map((schedule) => ({
          ...schedule.toObject(),
          day: daysES[schedule.day - 1], // Map dayId to the corresponding day name
        })),
      };
    })
  );

  return populatedProducts;
};

export async function POST(req) {
  try {
    await connectDB();
    const clerkUser = await currentUser();
    if (clerkUser) {
      const email = clerkUser.emailAddresses[0].emailAddress;
      let tempUserId = '';
      const user = await User.findOne({ email: email });
      const userId = user._id;
      tempUserId = userId;

      if (!tempUserId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
      console.log('el id del usuario es ', tempUserId);
      const seller = await Seller.findOne({ userId: tempUserId });
      if (!seller) {
        return NextResponse.json(
          { mensaje: 'El usuario no es un vendedor' },
          { status: 403 }
        );
      }
      const body = await req.json();

      // Asegurar que el campo section esté presente
      if (!body.section) {
        body.section = 'antojos'; // Valor por defecto
      }
      

      // Validar que la sección sea válida
      if (!['antojos', 'marketplace'].includes(body.section)) {
        return NextResponse.json(
          { message: 'Sección inválida. Debe ser "antojos" o "marketplace"' },
          { status: 400 }
        );
      }

      body.sellerId = seller._id;
      const newProduct = new Product(body);
      try {
        await newProduct.save();
      } catch (error) {
        console.log('error al guardar el producto', error);
        return NextResponse.json(
          { message: 'Error al guardar el producto', error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: 'Product created successfully' },
        { status: 201 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { message: 'Error creating product', error: error.message },
      { status: 500 }
    );
  }
}
