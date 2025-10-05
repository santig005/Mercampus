import { NextResponse } from 'next/server';
import { connectDB } from '@/utils/connectDB';
import Tutor from '@/utils/models/tutorSchema';
import User from '@/utils/models/userSchema';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(req) {
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

    const tutor = await Tutor.findOne({ user: dbUser._id });

    if (!tutor) {
      return NextResponse.json({ error: 'Tutor profile not found for this user.' }, { status: 404 });
    }

    return NextResponse.json({ tutor }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'An error occurred while fetching the tutor profile', details: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
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
  
      const updatedData = await req.json();
      
      // Find the tutor by the user's ID and update it
      const updatedTutor = await Tutor.findOneAndUpdate(
        { user: dbUser._id }, 
        updatedData, 
        { new: true }
      );
  
      if (!updatedTutor) {
        return NextResponse.json({ error: 'Tutor profile not found for this user.' }, { status: 404 });
      }
  
      return NextResponse.json({ tutor: updatedTutor }, { status: 200 });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: 'An error occurred while updating the tutor' }, { status: 500 });
    }
  }
