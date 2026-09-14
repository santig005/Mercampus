import { describe, expect, it } from 'vitest';

import { imageFilePath, normalizeImageUrl } from '@/lib/image-url';

const ENDPOINT = 'https://ik.imagekit.io/iebk3hngu';

describe('T-116 · normalizeImageUrl', () => {
  it('drops the query string, so ?updatedAt= does not make a new file', () => {
    expect(normalizeImageUrl(`${ENDPOINT}/sellerlogos/whisk1.png?updatedAt=1739224183820`)).toBe(
      `${ENDPOINT}/sellerlogos/whisk1.png`
    );
    expect(normalizeImageUrl(`${ENDPOINT}/sellerlogos/whisk1.png`)).toBe(
      `${ENDPOINT}/sellerlogos/whisk1.png`
    );
  });

  it('drops the fragment and resolves .. segments', () => {
    expect(normalizeImageUrl(`${ENDPOINT}/products/../private/a.jpg#x`)).toBe(
      `${ENDPOINT}/private/a.jpg`
    );
  });

  it('rejects what is not an http(s) URL', () => {
    expect(normalizeImageUrl('arepa.jpg')).toBeNull();
    expect(normalizeImageUrl('javascript:alert(1)')).toBeNull();
  });
});

describe('T-116 · imageFilePath', () => {
  it('is the path inside the account, without the endpoint or the query', () => {
    expect(imageFilePath(`${ENDPOINT}/products/arepa.jpg?updatedAt=1`, ENDPOINT)).toBe(
      '/products/arepa.jpg'
    );
  });

  it('accepts an endpoint written with a trailing slash', () => {
    expect(imageFilePath(`${ENDPOINT}/products/arepa.jpg`, `${ENDPOINT}/`)).toBe(
      '/products/arepa.jpg'
    );
  });

  it('is null for a URL outside the endpoint, including a look-alike prefix', () => {
    expect(imageFilePath('https://example.com/products/arepa.jpg', ENDPOINT)).toBeNull();
    expect(imageFilePath(`${ENDPOINT}-other/products/arepa.jpg`, ENDPOINT)).toBeNull();
  });

  it('is null when there is no endpoint configured', () => {
    expect(imageFilePath(`${ENDPOINT}/products/arepa.jpg`, '')).toBeNull();
  });
});
