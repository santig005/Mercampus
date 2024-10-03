import { User } from "../models/userSchema";
import { connectDB } from "../connectDB";

export const createOrUpdateUser = async (
  id,
  first_name,
  last_name,
  email_addresses,
  image_url
) => {
  try {
    await connectDB();
    const user = await User.findOneAndUpdate(
      { clerkId: id },
      {
        $set: {
          name: first_name,
          lastName: last_name,
          email: email_addresses[0].email,
          imageProfile: image_url,
        },
      },
      { new: true, upsert: true }
    );
    return user;
  } catch (error) {
    console.log('Error creating user:', error);
  }
};

export const deleteUser = async (id) => {
  try {
    await connectDB();
    await User.findOneAndDelete({ clerkId: id });
  } catch (error) {
    console.log('Error deleting user:', error);
  }
};
