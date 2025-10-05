import { NextResponse } from 'next/server';
import { connectDB } from '@/utils/connectDB';
import Landlord from '@/utils/models/landlordSchema';
import User from '@/utils/models/userSchema';
import { currentUser } from '@clerk/nextjs/server';

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = user.emailAddresses[0].emailAddress;
    const { id } = params;
    const landlord = await Landlord.findById(id);
    if (!landlord) {
      return NextResponse.json({ error: 'Landlord not found' }, { status: 404 });
    }
    const dbUser = await User.findOne({ email: email });
    if (landlord.userId.toString() !== dbUser._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await Landlord.findByIdAndDelete(id);
    await User.findOneAndUpdate({ email: email }, { $pull: { roles: 'landlord' } });
    return NextResponse.json({ message: 'Landlord deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'An error occurred while deleting the landlord' }, { status: 500 });
  }
}
