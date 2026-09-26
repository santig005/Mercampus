import ImageKit from 'imagekit';

import { ConfigError } from '@/utils/lib/errors';

// These variables deliberately carry NO NEXT_PUBLIC_ prefix. They are only
// used in route handlers, so they are never needed in the browser; with the
// prefix, one 'use client' component importing this module would be enough to
// publish the private key in the next deploy's bundle.
//
// The instance is lazy: created at module level, `next build` blew up while
// collecting the handlers if the variables were undefined, which is why CI
// used to carry fake placeholders.
let client;

const REQUIRED_ENV_VARS = [
  'IMAGEKIT_PUBLIC_KEY',
  'IMAGEKIT_PRIVATE_KEY',
  'IMAGEKIT_URL_ENDPOINT',
];

export function getImageKit() {
  if (!client) {
    // T-113: T-11b renamed these three in code and forgot Vercel. The SDK
    // was then constructed with three `undefined`s, every upload answered a
    // generic 500, and the only clue lived in a Vercel log nobody was
    // looking at. Naming the missing one here means it also reaches the log
    // line in errorResponse, and ConfigError stops the route from telling
    // the user to retry something that can't work until someone sets it.
    const missing = REQUIRED_ENV_VARS.filter(name => !process.env[name]);
    if (missing.length > 0) {
      throw new ConfigError(
        `ImageKit no está configurado: falta ${missing.join(', ')}.`
      );
    }

    client = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
  }
  return client;
}
