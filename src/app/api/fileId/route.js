import { getImageKit } from '@/utils/imagekit';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing URL parameter' },
        { status: 400 }
      );
    }

    // Pull the image name out of the URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1]; // last segment of the URL

    // Look the image up by name
    const files = await getImageKit().listFiles({ name: fileName });

    if (!files.length) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ fileId: files[0].fileId }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
