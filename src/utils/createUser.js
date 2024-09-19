import { User } from '@/utils/models/userSchema';

export async function createUser(user) {
  try {
    await User.create(user);
  } catch (error) {
    throw new Error(error);
  }
}
