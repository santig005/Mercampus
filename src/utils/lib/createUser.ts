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
  await connectDB();

  // Clerk permite registrarse sin nombre, pero `name` es obligatorio en el
  // schema. Sin este respaldo el documento entraría con `name: null`.
  const email = email_addresses?.[0]?.email_address;
  if (!email) {
    throw new Error('El evento de Clerk no trae ningún email.');
  }

  // El upsert copia `clerkId` del filtro al documento nuevo, así que el
  // usuario queda creado ya con su id de Clerk.
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
