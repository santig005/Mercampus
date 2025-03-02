import imagekit from '@/utils/imagekit';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const folder = formData.get('folder');

    if (!file) {
      return NextResponse.json(
        { error: 'Missing file parameter' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const resizedBuffer = await sharp(buffer)
      .resize({ width: 800 }) // Resize width to 800px (adjust as needed)
      .toBuffer();

    const response = await imagekit.upload({
      file: resizedBuffer, // Base64 string, file URL, or binary data
      fileName: file.name, // Optional file name
      folder: folder, // Optional folder path
    });

    return NextResponse.json(
      {
        url: response.url,
        fileId: response.fileId,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { fileId } = await req.json(); // Ahora usamos `fileId` correctamente
    console.log('fileIdapi', fileId);
    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing fileId parameter' },
        { status: 400 }
      );
    }

    await imagekit.deleteFile(fileId); // Eliminamos la imagen usando el `fileId`

    return NextResponse.json(
      { message: 'File deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
