<<<<<<< HEAD
import { handlers } from "@/utils/lib/auth"; // Referring to the auth.ts we just created
export const { GET, POST } = handlers;
=======
import { handlers } from "@/lib/auth" // Referring to the auth.ts we just created
import { connectDB } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
export const { GET, POST } = handlers
>>>>>>> 56f635a2d2b1acb2f083b20eea6d87d056f8115a
