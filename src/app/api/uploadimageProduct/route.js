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
      cloudinary.uploader.upload_stream({ folder: formData.get('folder') }, (error, result) => {
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

export async function DELETE(req) {
  try {
    const { publicId } = await req.json();  // Obtener el publicId desde el cuerpo de la solicitud

    if (!publicId) {
      return NextResponse.json({ error: 'No se proporcionó publicId' }, { status: 400 });
    }

    // Eliminar la imagen en Cloudinary usando el publicId
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== 'ok') {
      throw new Error('No se pudo eliminar la imagen');
    }

    return NextResponse.json({ message: 'Imagen eliminada exitosamente' }, { status: 200 });

  } catch (error) {
    console.error('Error al eliminar de Cloudinary:', error);
    return NextResponse.json({ error: 'Error al eliminar la imagen' }, { status: 500 });
  }
}