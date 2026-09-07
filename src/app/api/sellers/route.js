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
    // Connect to the database
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
    //
    // T-74: deliberately NOT publicSellerFilter(), which also requires
    // `approved: true`. This endpoint returns pending sellers on purpose -
    // SellerGrid hides them from ordinary visitors client-side but shows them
    // to an admin, who approves them from that very grid. Adding `approved`
    // here empties the admin's approval queue; there is a test for it now.
    var sellers = await Seller.find({ paused: { $ne: true } });
    if (university) {
      sellers = sellers.filter(
        seller => seller.university.toLowerCase() === university.toLowerCase()
      );
    }

    // If a section is given, keep only sellers with products in it
    if (section) {
      const { Product } = await import('@/utils/models/productSchema');

      // Ids of the sellers that have products in the given section
      const sellersWithProducts = await Product.distinct('sellerId', {
        section: section,
      });

      // If nothing matched the section, look for products with no section
      if (sellersWithProducts.length === 0 && section === 'antojos') {
        const sellersWithoutSection = await Product.distinct('sellerId', {
          section: { $exists: false },
        });
        // Fall back to those ids when no product carries an explicit section
        if (sellersWithoutSection.length > 0) {
          sellersWithProducts.push(...sellersWithoutSection);
        }
      }

      // Keep only the sellers that have products in the section
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

    // A single query for every seller, instead of one per seller.
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

    // By clerkId, not by email: there is no need to ask Clerk's API for the
    // whole user just to translate the id, and email is neither stable nor
    // unique.
    const usuario = await User.findOne({ clerkId });
    if (!usuario) {
      // Clerk's webhook creates this User (T-12b); if it is missing, its
      // event was lost.
      return NextResponse.json(
        { message: 'No se encontró un usuario para esta sesión.' },
        { status: 404 }
      );
    }

    const parsed = createSellerSchema.safeParse(await req.json());
    if (!parsed.success) {
      return invalidPayload(parsed.error);
    }

    // userId comes from the session, never from the body.
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
