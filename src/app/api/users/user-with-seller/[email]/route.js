// pages/api/user-with-seller/[email].js
import { NextResponse } from "next/server";
import { getUserWithSellerByEmail } from "@/services/server/userService";

export async function GET(req, { params }) {
  try {
    const {user,seller}= await getUserWithSellerByEmail(params.email);
    if (!user) {
        return NextResponse.json({ user: null, seller: null }, { status: 200 });
      }
    return NextResponse.json({ user, seller }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}