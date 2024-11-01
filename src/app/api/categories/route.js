import { connectDB } from '@/utils/connectDB';
import { NextResponse } from 'next/server';
import Category from '@/utils/models/categorySchema';  // Make sure this is the correct path to the model

export async function GET() {
    console.log("Connecting to the database...");
    connectDB();
    const categories = await Category.find().sort({ createdAt: -1 });
    return NextResponse.json(categories);  // Send the categories in JSON format
}
