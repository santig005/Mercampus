import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
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
// No se usa por nombre, pero el import registra el modelo en Mongoose y el
// populate({ model: 'Seller' }) del GET lo necesita registrado. Si se borra,
// el listado revienta con MissingSchemaError.
import { Seller } from '@/utils/models/sellerSchema2'; // eslint-disable-line no-unused-vars
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
    // Antes esto era `if (clerkUser) { ... }` sin `else`: una petición sin
    // sesión salía del handler sin devolver ninguna Response, así que no daba
    // 401 sino un error del framework. Y `user._id` sobre un usuario que no
    // existía en Mongo reventaba con TypeError.
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }

    // El User ya guarda a qué vendedor pertenece: sobra buscar el Seller por
    // userId aparte.
    const user = await User.findOne({ clerkId }).select('sellerId').lean();
    if (!user?.sellerId) {
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
    const newProduct = new Product({
      ...parsed.data,
      sellerId: user.sellerId,
    });
    await newProduct.save();

    return NextResponse.json(
      { message: 'Product created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating product', error);
    return NextResponse.json(
      { message: 'Error creating product', error: error.message },
      { status: 500 }
    );
  }
}
