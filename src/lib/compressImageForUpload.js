// T-124a: Vercel Functions reject any request body over 4.5 MB with a hard
// 413 FUNCTION_PAYLOAD_TOO_LARGE, before POST /api/images (and its sharp
// resize) ever runs. A modern phone photo can easily exceed that. This
// shrinks an oversized image in the browser first, using the Canvas API -
// available in every browser this app supports, so no new dependency for a
// PR that is supposed to add at most one.
//
// Browser-only. Every caller runs this from a client component's event
// handler.

// Vercel's limit is 4.5 MB for the *whole* request body, multipart overhead
// (boundary, part headers, the `folder` field) included. Target comfortably
// under it so that overhead - a few hundred bytes at most - never tips it
// over the edge.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB

const MAX_DIMENSION = 1920;
const MIN_DIMENSION = 640;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.4;
const QUALITY_STEP = 0.15;

function canCompressInThisBrowser() {
  return (
    typeof createImageBitmap === 'function' &&
    typeof document !== 'undefined'
  );
}

function encode(bitmap, width, height, quality) {
  let canvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);

  if (canvas.convertToBlob) {
    return canvas.convertToBlob({ type: 'image/jpeg', quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('canvas.toBlob failed'))),
      'image/jpeg',
      quality
    );
  });
}

/**
 * Shrinks `file` until it is safely under MAX_UPLOAD_BYTES, re-encoded as
 * JPEG. Returns:
 * - `file` itself, untouched, when it already fits - re-encoding something
 *   that already fits would only cost quality for nothing.
 * - a new, smaller `File` when it had to shrink it.
 * - `null` when it could not get under the limit (an exotic format this
 *   browser cannot decode, or a canvas that refuses to shrink further
 *   without going below a usable size) - the caller should warn instead of
 *   attempting the upload.
 */
export async function compressImageForUpload(file) {
  if (!file || file.size <= MAX_UPLOAD_BYTES) return file;
  if (!canCompressInThisBrowser()) return null;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Not decodable by this browser (e.g. some HEIC files outside Safari).
    return null;
  }

  try {
    let width = bitmap.width;
    let height = bitmap.height;
    const initialScale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    width = Math.max(1, Math.round(width * initialScale));
    height = Math.max(1, Math.round(height * initialScale));

    let quality = INITIAL_QUALITY;
    let blob = await encode(bitmap, width, height, quality);

    while (blob.size > MAX_UPLOAD_BYTES && quality > MIN_QUALITY) {
      quality -= QUALITY_STEP;
      blob = await encode(bitmap, width, height, quality);
    }

    while (
      blob.size > MAX_UPLOAD_BYTES &&
      Math.max(width, height) > MIN_DIMENSION
    ) {
      width = Math.max(MIN_DIMENSION, Math.round(width * 0.8));
      height = Math.max(MIN_DIMENSION, Math.round(height * 0.8));
      blob = await encode(bitmap, width, height, quality);
    }

    if (blob.size > MAX_UPLOAD_BYTES) return null;

    const name = `${file.name.replace(/\.[^/.]+$/, '') || 'image'}.jpg`;
    return new File([blob], name, { type: 'image/jpeg' });
  } finally {
    bitmap.close?.();
  }
}
