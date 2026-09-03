import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Seller } from '@/utils/models/sellerSchema2';
import { Schedule } from '@/utils/models/scheduleSchema';
import { User } from '@/utils/models/userSchema';
import { currentUser } from '@clerk/nextjs/server';
import { daysES } from '@/utils/resources/days';
import { getSchedulesBySeller, withDayNames } from '@/utils/lib/schedules';
import { logger } from '@/lib/logger';

export async function GET(req) {
  try {
    // Connnect to the database
    await connectDB();
    const url = new URL(req.url);
    const university = url.searchParams.get('university') || '';
    const section = url.searchParams.get('section') || '';

    // Get all sellers
    var sellers = await Seller.find();
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
    // Connect to the database
    await connectDB();
    const user = await currentUser();
    if (user) {
      const email = user.emailAddresses[0].emailAddress;
      logger.debug('email', email);
      let tempUserId = '';
      var usuario;
      try {
        usuario = await User.findOne({ email: email });
        logger.debug('usuario', usuario);
        const userId = usuario._id;
        tempUserId = userId;
      } catch (error) {
        logger.error('Error al buscar el usuario:', error.message);
      }

      // Obtener los datos del cuerpo de la solicitud
      const body = await req.json();
      try {
        body.userId = tempUserId;
        body.clerkId = user.id;
      } catch (error) {
        logger.debug(error);
      }

      // Create a new seller using the Seller model
      try {
        const newSeller = new Seller(body);
        await newSeller.save();
        usuario.sellerId = newSeller._id;
        usuario.role = 'seller';
        usuario.save();
      } catch (error) {
        logger.debug(error);
      }

      // Return a successful response
      return NextResponse.json(
        { message: 'Seller created successfully' },
        { status: 201 }
      );
    }
  } catch (error) {
    // Handle errors and return a response with the message
    return NextResponse.json(
      { message: 'Error creating seller', error: error.message },
      { status: 500 }
    );
  }
}

// PUT method to update a seller
export async function PUT(req) {
  try {
    // Connect to the database
    await connectDB();

    // Get the seller ID from the request query
    const { id } = req.query;

    // Get the updated data from the request body
    const updatedData = await req.json();

    // Find the seller by ID and update it with the new data
    const updatedSeller = await Seller.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (!updatedSeller) {
      return NextResponse.json(
        { message: 'Seller not found' },
        { status: 404 }
      );
    }

    // Return a successful response with the updated seller
    return NextResponse.json(
      { message: 'Seller updated successfully', seller: updatedSeller },
      { status: 200 }
    );
  } catch (error) {
    // Handle errors and return a response with the message
    return NextResponse.json(
      { message: 'Error updating seller', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE method to delete a seller
export async function DELETE(req) {
  try {
    // Connect to the database
    await connectDB();

    // Get the seller ID from the request query
    const { id } = req.query;

    // Find the seller by ID and delete it
    const deletedSeller = await Seller.findByIdAndDelete(id);

    if (!deletedSeller) {
      return NextResponse.json(
        { message: 'Seller not found' },
        { status: 404 }
      );
    }

    // Return a successful response
    return NextResponse.json(
      { message: 'Seller deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    // Handle errors and return a response with the message
    return NextResponse.json(
      { message: 'Error deleting seller', error: error.message },
      { status: 500 }
    );
  }
}
