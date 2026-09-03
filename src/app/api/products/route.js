import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { Product } from '@/utils/models/productSchema';
import { User } from '@/utils/models/userSchema';
import { Schedule } from '@/utils/models/scheduleSchema';
import { daysES } from '@/utils/resources/days';
import { getSchedulesBySeller, withDayNames } from '@/utils/lib/schedules';
import {
  createProductSchema,
  productQuerySchema,
} from '@/lib/validators/product';
import { invalidPayload } from '@/lib/api-response';
import { Seller } from '@/utils/models/sellerSchema2';
import { logger } from '@/lib/logger';

export async function GET(req) {
  await connectDB();

  const url = new URL(req.url);
  const parsedQuery = productQuerySchema.safeParse(
    Object.fromEntries(url.searchParams)
  );
  if (!parsedQuery.success) {
    return invalidPayload(parsedQuery.error);
  }
  const { product, category, sellerId, university, section } = parsedQuery.data;

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
    match: {
      approved: true,
      university: { $regex: university, $options: 'i' },
    }, // Filtro para poblar
  });

  products = products.sort(() => Math.random() - 0.5);
  products.sort((a, b) => b.availability - a.availability);
  const approvedProducts = products.filter(
    product => product.sellerId !== null
  );

  const populated = await getPopulatedProducts(approvedProducts);

  return NextResponse.json({ products: populated }, { status: 200 });
}

const getPopulatedProducts = async approvedProducts => {
  // Una sola consulta para todos los vendedores del listado, en vez de una por
  // producto.
  const schedulesBySeller = await getSchedulesBySeller(
    approvedProducts.map(product => product.sellerId._id)
  );

  return approvedProducts.map(product => ({
    ...product.toObject(),
    schedules: withDayNames(
      schedulesBySeller.get(product.sellerId._id.toString()) ?? []
    ),
  }));
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
      logger.debug('el id del usuario es ', tempUserId);
      const seller = await Seller.findOne({ userId: tempUserId });
      if (!seller) {
        return NextResponse.json(
          { mensaje: 'El usuario no es un vendedor' },
          { status: 403 }
        );
      }
      const parsed = createProductSchema.safeParse(await req.json());
      if (!parsed.success) {
        return invalidPayload(parsed.error);
      }

      // sellerId sale de la sesión, nunca del cuerpo: el schema descarta lo que
      // no declara, así que el cliente no puede colarlo.
      const newProduct = new Product({ ...parsed.data, sellerId: seller._id });
      try {
        await newProduct.save();
      } catch (error) {
        logger.error('error al guardar el producto', error);
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
