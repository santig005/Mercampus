import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';

import { errorResponse, invalidPayload } from '@/lib/api-response';
import {
  canDeleteImage,
  findImageFile,
  imageFolder,
  uploaderTag,
} from '@/server/images/imageFiles';
import { getImageKit } from '@/utils/imagekit';
import { getClerkUserId } from '@/utils/lib/auth';
import { AppError } from '@/utils/lib/errors';

// T-116: neither verb checked identity, and the middleware does not cover
// /api/images, so each handler stands on its own.

const deleteImageSchema = z.object({ url: z.string().url() });

export async function POST(req) {
  try {
    // Any session may upload, a buyer included: the seller registration form
    // uploads the logo before the seller exists, so a sellerId can't be asked.
    const clerkId = await getClerkUserId();

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'Missing file parameter' },
        { status: 400 }
      );
    }

    // The client picks a kind from a fixed list; the server builds the folder.
    const folder = imageFolder(formData.get('folder'));

    let resizedBuffer;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      resizedBuffer = await sharp(buffer).resize({ width: 800 }).toBuffer();
    } catch {
      throw new AppError('El archivo no es una imagen válida.', 400);
    }

    const response = await getImageKit().upload({
      file: resizedBuffer,
      fileName: file.name,
      folder,
      tags: [uploaderTag(clerkId)],
    });

    return NextResponse.json(
      {
        url: response.url,
        fileId: response.fileId,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error, 'POST /api/images');
  }
}

export async function DELETE(req) {
  try {
    const clerkId = await getClerkUserId();

    let body = null;
    try {
      body = await req.json();
    } catch {
      // An unparseable body is reported like any other invalid one.
    }

    // The URL, not a fileId: the server resolves the file itself, so a client
    // can't point this at a file by id. This replaces GET /api/fileId.
    const parsed = deleteImageSchema.safeParse(body);
    if (!parsed.success) {
      return invalidPayload(parsed.error);
    }

    const { url } = parsed.data;
    const file = await findImageFile(url);
    if (!file) {
      throw new AppError('Imagen no encontrada.', 404);
    }

    if (!(await canDeleteImage(clerkId, url, file))) {
      throw new AppError('No tienes permiso para borrar esta imagen.', 403);
    }

    await getImageKit().deleteFile(file.fileId);

    return NextResponse.json(
      { message: 'File deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error, 'DELETE /api/images');
  }
}
