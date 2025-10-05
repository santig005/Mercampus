import { NextResponse } from 'next/server';
import { connectDB } from '@/utils/connectDB';
import Tutor from '@/utils/models/tutorSchema';
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
    const tutor = await Tutor.findById(id);
    if (!tutor) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }
    const dbUser = await User.findOne({ email: email });
    if (tutor.userId.toString() !== dbUser._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await Tutor.findByIdAndDelete(id);
    await User.findOneAndUpdate({ email: email }, { $pull: { roles: 'tutor' } });
    return NextResponse.json({ message: 'Tutor deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'An error occurred while deleting the tutor' }, { status: 500 });
  }
}
