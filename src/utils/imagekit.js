import ImageKit from 'imagekit';

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_KEY, // Your ImageKit public API key
  privateKey: process.env.NEXT_PUBLIC_PRIVATE_KEY_IMAGEKIT, // Your ImageKit private API key
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT, // Your ImageKit URL endpoint
});

export default imagekit;
