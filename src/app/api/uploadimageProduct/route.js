import { NextResponse } from 'next/server';
import { getCloudinary } from '@/utils/cloudinary';
import { logger } from '@/lib/logger';

export async function POST(req) {
  try {
    // Read the request body
    const formData = await req.formData();
    const file = formData.get('file');  // the file out of the FormData

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó un archivo' }, { status: 400 });
    }

    // Turn the file into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload the image to Cloudinary as a buffer, wrapped in a promise
    const result = await new Promise((resolve, reject) => {
      getCloudinary().uploader.upload_stream({ folder: formData.get('folder') }, (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }).end(buffer);
    });

    // Return the uploaded image's URL
    return NextResponse.json({ url: result.secure_url }, { status: 200 });

  } catch (error) {
    logger.error('Error al subir a Cloudinary:', error);
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { publicId } = await req.json();  // publicId from the request body

    if (!publicId) {
      return NextResponse.json({ error: 'No se proporcionó publicId' }, { status: 400 });
    }

    // Delete the image from Cloudinary by its publicId
    const result = await getCloudinary().uploader.destroy(publicId);

    if (result.result !== 'ok') {
      throw new Error('No se pudo eliminar la imagen');
    }

    return NextResponse.json({ message: 'Imagen eliminada exitosamente' }, { status: 200 });

  } catch (error) {
    logger.error('Error al eliminar de Cloudinary:', error);
    return NextResponse.json({ error: 'Error al eliminar la imagen' }, { status: 500 });
  }
}