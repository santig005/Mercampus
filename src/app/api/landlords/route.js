import { NextResponse } from 'next/server';
import { connectDB } from '@/utils/connectDB';
import Landlord from '@/utils/models/landlordSchema';
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
    const landlord = new Landlord({ ...data, userId: dbUser._id });
    await landlord.save();

    await User.findOneAndUpdate({ email: email }, { $addToSet: { roles: 'landlord' } });

    return NextResponse.json({ message: 'Landlord created successfully' }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'An error occurred while creating the landlord' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await connectDB();
    const landlords = await Landlord.find();
    return NextResponse.json({ landlords }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'An error occurred while fetching landlords' }, { status: 500 });
  }
}
