import { v2 as cloudinary } from 'cloudinary';

// Same rule as imagekit.js: no NEXT_PUBLIC_ prefix, because this is only used
// on the server, and lazy configuration so the build does not depend on those
// variables existing.
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
