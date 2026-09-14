import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchFromApi } from '@/services/browserApi';
import { getProducts, getSellerProducts } from '@/services/productService';
import { getSchedules } from '@/services/scheduleService';
import { getSellers } from '@/services/sellerService';

// T-112: the reads must reach whichever deployment served the page. The
// variable they used to depend on is set to production's origin here, the way
// Vercel has it for every environment, so a regression back to an absolute
// URL fails these assertions instead of passing on a localhost value.

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

let fetchMock;

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_URL', 'https://mercampus.vercel.app');
  fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const requestedUrl = () => fetchMock.mock.calls[0][0];

describe('reads use a relative /api URL', () => {
  it('getProducts', async () => {
    await getProducts({ product: 'arepa', limit: 12 });
    expect(requestedUrl()).toBe('/api/products?product=arepa&section=antojos&limit=12');
  });

  it('getSellerProducts', async () => {
    await getSellerProducts('seller123', 'marketplace');
    expect(requestedUrl()).toBe('/api/products/seller/seller123?section=marketplace');
  });

  it('getSellers', async () => {
    await getSellers('EAFIT', 'antojos');
    expect(requestedUrl()).toBe('/api/sellers?university=EAFIT&section=antojos');
  });

  it('getSchedules', async () => {
    await getSchedules('seller123');
    expect(requestedUrl()).toBe('/api/schedules/seller123');
  });
});

describe('fetchFromApi keeps fetchAPI\'s contract', () => {
  it('returns the parsed JSON on 2xx', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ products: [1, 2] }));
    await expect(fetchFromApi('/products')).resolves.toEqual({ products: [1, 2] });
  });

  it('returns text when the response is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('plain', { status: 200, headers: { 'content-type': 'text/plain' } })
    );
    await expect(fetchFromApi('/anything')).resolves.toBe('plain');
  });

  it('throws with the status and body on a non-2xx', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'nope' }, 500));
    await expect(fetchFromApi('/products')).rejects.toThrow('Error HTTP 500: {"message":"nope"}');
  });
});
