import { connectDB } from '../connectDB';
import { User } from '../models/userSchema';

// Shape of the payload Clerk's webhook sends.
type ClerkEmailAddress = { email_address: string };

export const createOrUpdateUser = async (
  id: string,
  first_name: string,
  last_name: string,
  email_addresses: ClerkEmailAddress[],
  image_url: string
) => {
  await connectDB();

  // Clerk allows signing up without a name, but `name` is required by the
  // schema. Without this fallback the document would go in with
  // `name: null`.
  const email = email_addresses?.[0]?.email_address;
  if (!email) {
    throw new Error('El evento de Clerk no trae ningún email.');
  }

  // The upsert copies `clerkId` from the filter into the new document, so
  // the user is created already carrying its Clerk id.
  return User.findOneAndUpdate(
    { clerkId: id },
    {
      $set: {
        name: first_name || email.split('@')[0],
        lastName: last_name || '',
        email,
        imageProfile: image_url || '',
      },
    },
    { new: true, upsert: true, runValidators: true }
  );
};

export const deleteUser = async (id: string) => {
  await connectDB();
  return User.findOneAndDelete({ clerkId: id });
};
