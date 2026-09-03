import ImageKit from 'imagekit';

// Las variables van SIN el prefijo NEXT_PUBLIC_ a proposito. Solo se usan en
// route handlers, asi que nunca hacen falta en el navegador; con el prefijo,
// bastaria que un componente 'use client' importara este modulo para publicar
// la clave privada en el bundle del siguiente deploy.
//
// La instancia es perezosa: creandola a nivel de modulo, `next build` reventaba
// al recolectar los handlers si las variables no estaban definidas, y por eso
// el CI arrastraba placeholders falsos.
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
