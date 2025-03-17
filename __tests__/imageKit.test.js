require('dotenv').config();
const ImageKit = require('imagekit');

// Mock environment variables for testing
process.env.NEXT_PUBLIC_IMAGEKIT_KEY = '123456';
process.env.NEXT_PUBLIC_PRIVATE_KEY_IMAGEKIT = 'private_key';
process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/your_imagekit_id';

// Import the imagekit instance
const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_KEY,
  privateKey: process.env.NEXT_PUBLIC_PRIVATE_KEY_IMAGEKIT,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
});

// Test suite for environment variables
describe('Environment Variables', () => {
  test('Image should be set correctly', () => {
    expect(process.env.NEXT_PUBLIC_IMAGEKIT_KEY).toBe('123456');
  });

  test('Images library processes should be set correctly', () => {
    expect(process.env.NEXT_PUBLIC_PRIVATE_KEY_IMAGEKIT).toBe('private_key');
  });

  test('IMAGEKIT_URL_ENDPOINT should be set correctly', () => {
    expect(process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT).toBe('https://ik.imagekit.io/your_imagekit_id');
  });
});

// Test suite for ImageKit instance
describe('ImageKit Instance', () => {
  test('should be initialized with correct public key', () => {
    expect(imagekit.options.publicKey).toBe('123456');
  });

  test('should be initialized with correct private key', () => {
    expect(imagekit.options.privateKey).toBe('private_key');
  });

  test('should be initialized with correct URL endpoint', () => {
    expect(imagekit.options.urlEndpoint).toBe('https://ik.imagekit.io/your_imagekit_id');
  });
});