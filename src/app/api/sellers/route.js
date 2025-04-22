import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import { Seller } from '@/utils/models/sellerSchema2';
import { Schedule } from '@/utils/models/scheduleSchema';
import { User } from '@/utils/models/userSchema';
import { currentUser } from '@clerk/nextjs/server';
import { daysES } from '@/utils/resources/days';

export async function GET(req) {
  try {
    // Connnect to the database
    await connectDB();
    const url = new URL(req.url);
    const university = url.searchParams.get('university') || '';

    // Get all sellers
    var sellers = await Seller.find();
    if
    (university) {
      sellers = sellers.filter((seller) => seller.university === university);
    }
    if (!sellers || sellers.length === 0) {
      return NextResponse.json({ message: 'Sellers not found' }, { status: 404 });
    }
    const populatedSellers = await Promise.all(
      sellers.map(async seller => {
      const schedules = await Schedule.find({ sellerId: seller._id });
      schedules.sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.startTime.localeCompare(b.startTime);
      });
      return { ...seller.toObject(), schedules };
      })
    );

    const transformedSellers = populatedSellers.map(seller => {
      const transformedSchedules = seller.schedules.map(schedule => ({
      ...schedule.toObject(),
      day: daysES[schedule.day - 1], // Map dayId to the corresponding day name
      }));
      return { ...seller, schedules: transformedSchedules };
    });
    return NextResponse.json({sellers:transformedSellers} , { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching sellers', error: error.message }, { status: 500 });
  }
}


// POST method to handle seller registration
export async function POST(req) {
  try {
    // Connect to the database
    await connectDB();
    const user = await currentUser();
    if(user){
    const email = user.emailAddresses[0].emailAddress;
    console.log("email", email);
    let tempUserId="";
    var usuario;
    try {
      usuario = await User.findOne({ email:email });
      console.log("usuario", usuario);
      const userId = usuario._id;
      tempUserId=userId;
    } catch (error) {
      console.log("Error al buscar el usuario:", error.message);
    }

    // Obtener los datos del cuerpo de la solicitud
    const body = await req.json();
    try{  
      body.userId = tempUserId;
      body.clerkId = user.id;
      
    }catch(error){
      console.log(error);
    }

    // Create a new seller using the Seller model
    try{
      const newSeller = new Seller(body);
      await newSeller.save();
      usuario.sellerId=newSeller._id;
      usuario.role="seller";
      usuario.save()

    }catch(error){
      console.log(error);
    }
  

    // Return a successful response
    return NextResponse.json({ message: 'Seller created successfully' }, { status: 201 });
  }
  } catch (error) {
    // Handle errors and return a response with the message
    return NextResponse.json({ message: 'Error creating seller', error: error.message }, { status: 500 });
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
    const updatedSeller = await Seller.findByIdAndUpdate(id, updatedData, { new: true });

    if (!updatedSeller) {
      return NextResponse.json({ message: 'Seller not found' }, { status: 404 });
    }

    // Return a successful response with the updated seller
    return NextResponse.json({ message: 'Seller updated successfully', seller: updatedSeller }, { status: 200 });
  } catch (error) {
    // Handle errors and return a response with the message
    return NextResponse.json({ message: 'Error updating seller', error: error.message }, { status: 500 });
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
      return NextResponse.json({ message: 'Seller not found' }, { status: 404 });
    }

    // Return a successful response
    return NextResponse.json({ message: 'Seller deleted successfully' }, { status: 200 });
  } catch (error) {
    // Handle errors and return a response with the message
    return NextResponse.json({ message: 'Error deleting seller', error: error.message }, { status: 500 });
  }
}