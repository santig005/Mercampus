import { connectDB } from '@/utils/connectDB'; // Your function to connect to MongoDB
import { NextResponse } from 'next/server';
import { Schedule } from '@/utils/models/scheduleSchema';
import { currentUser } from '@clerk/nextjs/server';
import { User } from '@/utils/models/userSchema';
import { Seller } from '@/utils/models/sellerschema';

// POST method to handle seller registration
export async function POST(req) {
  try {
    // Connect to the database
    await connectDB();

    const clerkUser = await currentUser();
    if (clerkUser) {
      const email = clerkUser.emailAddresses[0].emailAddress;
      let tempUserId = '';
      try {
        const user = await User.findOne({ email: email });
        const userId = user._id;
        tempUserId = userId;
      } catch (error) {
        console.log('Error al buscar el usuario:', error.message);
      }
      if (!tempUserId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }

      const seller = await Seller.findOne({ userId: tempUserId });
      if (!seller) {
        return NextResponse.json(
          { mensaje: 'El usuario no es un vendedor' },
          { status: 403 }
        );
      }
      const requests = await req.json();
      let i = 1;
      for (const req of requests) {
        const body = req;
        // Agregar el ID del vendedor al cuerpo del horario
        body.sellerId = seller._id;
        body.idDay = body.day;
        delete body.day;
        // Create a new seller using the Seller model
        let newSchedule;
        try {
          newSchedule = new Schedule(body);
        } catch (error) {
          console.error(
            `Error creating schedule object for request ${i}:`,
            error
          );
          return NextResponse.json(
            {
              message: `Error creating schedule object for request ${i}`,
              error: error.message,
            },
            { status: 500 }
          );
        }
        try {
          await newSchedule.save();
        } catch (error) {
          console.error(`Error saving schedule for request ${i}:`, error);
          return NextResponse.json(
            {
              message: `Error saving schedule for request ${i}`,
              error: error.message,
            },
            { status: 500 }
          );
        }
        i += 1;
      }
      /*
    // Return a successful response*/
      return NextResponse.json(
        { message: 'Schedules created successfully' },
        { status: 201 }
      );
    }
  } catch (error) {
    // Handle errors and return a response with the message
    return NextResponse.json(
      { message: 'Error creating schedules', error: error.message },
      { status: 500 }
    );
  }
}
