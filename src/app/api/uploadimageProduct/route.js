import { NextResponse } from 'next/server';
import cloudinary from '@/utils/cloudinary';  // Asegúrate de que esta ruta sea correcta

export async function POST(req) {
  try {
    // Obtener los datos del cuerpo de la solicitud
    const formData = await req.formData();
    const file = formData.get('file');  // Obtén el archivo del FormData

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó un archivo' }, { status: 400 });
    }

    // Convertir el archivo a un buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir la imagen a Cloudinary como un buffer usando una promesa
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: 'products' }, (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }).end(buffer);
    });

    // Devolver la URL de la imagen subida
    return NextResponse.json({ url: result.secure_url }, { status: 200 });

  } catch (error) {
    console.error('Error al subir a Cloudinary:', error);
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
  }
}