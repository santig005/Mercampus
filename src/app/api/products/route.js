import mongoose from 'mongoose';
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
  encodeProductCursor,
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
  const { product, category, sellerId, university, section, limit, cursor } =
    parsedQuery.data;

  // Antes esto era un populate({match: {approved, university}}) que traia
  // TODA la coleccion, poblaba, y recien despues descartaba en JS los
  // productos de vendedores no aprobados o de otra universidad. Eso rompe
  // cualquier paginacion en Mongo: un limit()/skip() sobre la query sin
  // filtrar no sabe cuantos de esos items van a sobrevivir el filtro
  // posterior. Resolviendolo antes, como ids elegibles, deja que Product.find
  // pagine sobre exactamente los productos que van a mostrarse.
  const eligibleSellerIds = await Seller.find({
    approved: true,
    university: { $regex: university, $options: 'i' },
  }).distinct('_id');

  if (sellerId) {
    const isEligible = eligibleSellerIds.some(id => id.toString() === sellerId);
    if (!isEligible) {
      return NextResponse.json({ products: [], nextCursor: null }, { status: 200 });
    }
  }

  const filter = {
    sellerId: sellerId || { $in: eligibleSellerIds },
  };

  if (category) {
    filter.category = { $in: [category] };
  }

  if (product) {
    filter.name = { $regex: product, $options: 'i' };
  }

  if (section) {
    filter.section = section;
  }

  // Reemplaza el shuffle aleatorio que tenia esto antes: un orden aleatorio
  // por request no se puede paginar con un cursor estable (la pagina 2 podria
  // repetir o saltarse productos de la pagina 1). availability desc conserva
  // la idea original de mostrar primero a quien esta abierto ahora; createdAt
  // y _id como desempate hacen el orden determinista.
  if (cursor) {
    // createdAt en Mongo es un BSON Date; el cursor lo trae como string ISO
    // (asi viaja en JSON), asi que hay que volver a convertirlo antes de
    // compararlo, o $lt/$eq no matchean nada por el desajuste de tipo.
    const cursorCreatedAt = new Date(cursor.createdAt);
    filter.$or = [
      { availability: { $lt: cursor.availability } },
      { availability: cursor.availability, createdAt: { $lt: cursorCreatedAt } },
      {
        availability: cursor.availability,
        createdAt: cursorCreatedAt,
        _id: { $lt: new mongoose.Types.ObjectId(cursor.id) },
      },
    ];
  }

  // Se pide un item de mas para saber si hay siguiente pagina sin una
  // segunda consulta countDocuments.
  const products = await Product.find(filter)
    .sort({ availability: -1, createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate({ path: 'sellerId', model: 'Seller' });

  const hasMore = products.length > limit;
  const page = hasMore ? products.slice(0, limit) : products;

  const populated = await getPopulatedProducts(page);

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeProductCursor({
          availability: last.availability,
          createdAt: last.createdAt.toISOString(),
          id: last._id.toString(),
        })
      : null;

  return NextResponse.json({ products: populated, nextCursor }, { status: 200 });
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
