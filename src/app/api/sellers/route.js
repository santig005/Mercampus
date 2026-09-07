import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Seller } from '@/utils/models/sellerSchema2';
import { Schedule } from '@/utils/models/scheduleSchema';
import { User } from '@/utils/models/userSchema';
import { auth } from '@clerk/nextjs/server';
import { daysES } from '@/utils/resources/days';
import { getSchedulesBySeller, withDayNames } from '@/utils/lib/schedules';
import { logger } from '@/lib/logger';
import { createSellerSchema } from '@/lib/validators/seller';
import { invalidPayload } from '@/lib/api-response';

export async function GET(req) {
  try {
    // Connnect to the database
    await connectDB();
    const url = new URL(req.url);
    const university = url.searchParams.get('university') || '';
    const section = url.searchParams.get('section') || '';

    // T-71: paused sellers are hidden from the public listing here, in the
    // Mongo query, not in the browser - SellerGrid's client-side `approved`
    // filter is a rendering choice (an admin browsing this page sees the
    // pending ones so they can approve them), and a store the seller took
    // down on purpose shouldn't ship to the client at all.
    //
    // `$ne: true` and not `false`: existing sellers have no `paused` field,
    // and an equality filter would drop every one of them. Same note as in
    // api/products/route.js.
    //
    // Admins keep the full list, paused included, at GET /api/sellers/admin
    // (the /admin/sellers panel), which is the one that deliberately returns
    // every seller.
    var sellers = await Seller.find({ paused: { $ne: true } });
    if (university) {
      sellers = sellers.filter(
        seller => seller.university.toLowerCase() === university.toLowerCase()
      );
    }

    // Si se especifica una sección, filtrar vendedores que tengan productos en esa sección
    if (section) {
      const { Product } = await import('@/utils/models/productSchema');

      // Obtener IDs de vendedores que tengan productos en la sección especificada
      const sellersWithProducts = await Product.distinct('sellerId', {
        section: section,
      });

      // Si no hay productos en la sección, verificar si hay productos sin sección
      if (sellersWithProducts.length === 0 && section === 'antojos') {
        const sellersWithoutSection = await Product.distinct('sellerId', {
          section: { $exists: false },
        });
        // Usar estos IDs si no hay productos con sección específica
        if (sellersWithoutSection.length > 0) {
          sellersWithProducts.push(...sellersWithoutSection);
        }
      }

      // Filtrar sellers para incluir solo los que tienen productos en la sección
      sellers = sellers.filter(seller => {
        const sellerIdString = seller._id.toString();
        const isIncluded = sellersWithProducts.some(
          id => id.toString() === sellerIdString
        );
        return isIncluded;
      });
    }
    if (!sellers || sellers.length === 0) {
      return NextResponse.json({ sellers: [] }, { status: 200 });
    }

    // Una sola consulta para todos los vendedores, en vez de una por vendedor.
    const schedulesBySeller = await getSchedulesBySeller(
      sellers.map(seller => seller._id)
    );

    const transformedSellers = sellers.map(seller => ({
      ...seller.toObject(),
      schedules: withDayNames(
        schedulesBySeller.get(seller._id.toString()) ?? []
      ),
    }));

    return NextResponse.json({ sellers: transformedSellers }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Error fetching sellers', error: error.message },
      { status: 500 }
    );
  }
}

// POST method to handle seller registration
export async function POST(req) {
  try {
    await connectDB();
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }

    // Por clerkId, no por email: no hace falta pedirle el usuario a la API de
    // Clerk solo para traducir el id, y el email ni es estable ni es único.
    const usuario = await User.findOne({ clerkId });
    if (!usuario) {
      // El webhook de Clerk crea este User (T-12b); si falta, es que su evento
      // se perdió.
      return NextResponse.json(
        { message: 'No se encontró un usuario para esta sesión.' },
        { status: 404 }
      );
    }

    const parsed = createSellerSchema.safeParse(await req.json());
    if (!parsed.success) {
      return invalidPayload(parsed.error);
    }

    // userId sale de la sesión, nunca del cuerpo.
    const newSeller = new Seller({ ...parsed.data, userId: usuario._id });
    await newSeller.save();

    usuario.sellerId = newSeller._id;
    usuario.role = 'seller';
    await usuario.save();

    return NextResponse.json(
      { message: 'Seller created successfully', seller: newSeller },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating seller', error);
    return NextResponse.json(
      { message: 'Error creating seller', error: error.message },
      { status: 500 }
    );
  }
}
