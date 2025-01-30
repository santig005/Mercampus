import { connectDB } from '@/utils/connectDB';
import {Pqrs} from "@/utils/models/pqrsSchema";
import { NextResponse } from 'next/server';


export async function POST(req,) {
  await connectDB();
  try {
    const body=await req.json();
    const { email, description, type } = body;
    try{
      const newPqrs = new Pqrs(body);
      await newPqrs.save();
    }
    catch(error){
      console.log(error);
    }
    
    return NextResponse.json( { status: 201 });
  } catch (error) {
    return NextResponse.error(new Error('Error al crear la PQRS'), { status: 500 });
  }
}