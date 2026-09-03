import { logger } from '@/lib/logger';
import { connectDB } from '../connectDB';
import { User } from '../models/userSchema';

// Forma del payload que manda el webhook de Clerk.
type ClerkEmailAddress = { email_address: string };

export const createOrUpdateUser = async (
  id: string,
  first_name: string,
  last_name: string,
  email_addresses: ClerkEmailAddress[],
  image_url: string
) => {
  try {
    await connectDB();
    const user = await User.findOneAndUpdate(
      { clerkId: id },
      {
        $set: {
          name: first_name,
          lastName: last_name,
          email: email_addresses[0].email_address,
          imageProfile: image_url,
        },
      },
      { new: true, upsert: true }
    );
    return user;
  } catch (error) {
    logger.error('Error creating user:', error);
  }
};

export const deleteUser = async (id: string) => {
  try {
    await connectDB();
    await User.findOneAndDelete({ clerkId: id });
  } catch (error) {
    logger.error('Error deleting user:', error);
  }
};
