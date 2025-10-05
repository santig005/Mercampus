import { NextResponse } from 'next/server';
import { connectDB } from '@/utils/connectDB';
import Tutor from '@/utils/models/tutorSchema';
import User from '@/utils/models/userSchema';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(req) {
  try {
    await connectDB();
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = user.emailAddresses[0].emailAddress;
    const dbUser = await User.findOne({ email: email });

    if (!dbUser) {
        return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
    }
    
    const data = await req.json();
    console.log("me llego esto al tutor ");
    console.log(data);
    
    // Map the incoming data to the schema fields
    const newTutorData = {
        ...data,
        tutorName: data.name, 
        user: dbUser._id,
        photo: data.images && data.images.length > 0 ? data.images[0] : null // Save the first image to photo field
    };

    const tutor = new Tutor(newTutorData);
    await tutor.save();

    await User.findOneAndUpdate({ email: email }, { $addToSet: { roles: 'tutor' } });

    return NextResponse.json({ message: 'Tutor created successfully' }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'An error occurred while creating the tutor', details: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const university = searchParams.get('university');
    const filter = university ? { university } : {};
    const tutors = await Tutor.find(filter);
    return NextResponse.json({ tutors }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'An error occurred while fetching tutors' }, { status: 500 });
  }
}
