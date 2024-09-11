import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credential from "next-auth/providers/credentials";

import { User } from "@/utils/models/userSchema";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },
  providers: [
    Google,
    Credential({
      async authorize(credentials) {
        if (credentials === null) return null;
        try {
          const user = await User.findOne({ email: credentials?.email });
          if (user) {
            const isMatch = await bcrypt.compare(
              credentials.password,
              user.password
            );

            if (isMatch) {
              return user;
            } else {
              throw new Error("Wrong password");
            }
          } else {
            throw new Error("User not found");
          }
        } catch (error) {
          return null;
        }
      },
    }),
  ],
});
