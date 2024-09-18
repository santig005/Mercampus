import { connectDB } from '@/utils/connectDB'; // Your function to connect to MongoDB
import { NextResponse } from 'next/server';
import { Seller } from '@/utils/models/sellerSchema'; // Ensure you use the correct path for the model
import { getServerSession } from 'next-auth/next'; // Import getServerSession from next-auth

// POST method to handle seller registration
export async function POST(req) {
  try {
    // Connect to the database
    await connectDB();

    // Get the current session
    const session = await getServerSession({ req });

    // Check if the user is logged in
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get the user ID from the session
    const userId = session.user.id;

    // Get the request body
    const body = await req.json();
    console.log('Body:', body);

    // Add the user ID to the seller body
    body.idUser = userId;

    // Create a new seller using the Seller model
    const newSeller = new Seller(body);
    await newSeller.save();

    // Return a successful response
    return NextResponse.json({ message: 'Seller created successfully' }, { status: 201 });
  } catch (error) {
    // Handle errors and return a response with the message
    return NextResponse.json({ message: 'Error creating seller', error: error.message }, { status: 500 });
  }
}