import ImageKit from 'imagekit';

// These variables deliberately carry NO NEXT_PUBLIC_ prefix. They are only
// used in route handlers, so they are never needed in the browser; with the
// prefix, one 'use client' component importing this module would be enough to
// publish the private key in the next deploy's bundle.
//
// The instance is lazy: created at module level, `next build` blew up while
// collecting the handlers if the variables were undefined, which is why CI
// used to carry fake placeholders.
let client;

export function getImageKit() {
  if (!client) {
    client = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
  }
  return client;
}
