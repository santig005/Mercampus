import { handlers } from "@/lib/auth" // Referring to the auth.ts we just created
import { connectDB } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
export const { GET, POST } = handlers