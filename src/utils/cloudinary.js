import { v2 as cloudinary } from 'cloudinary';

// Mismo criterio que imagekit.js: sin prefijo NEXT_PUBLIC_, porque solo se usa
// en servidor, y configuracion perezosa para que el build no dependa de que
// existan las variables.
let configured = false;

export function getCloudinary() {
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    configured = true;
  }
  return cloudinary;
}
