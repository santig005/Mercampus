import { fetchFromApi, jsonBody } from './browserApi';

// T-112 / T-112b: relative browser fetches with Clerk's session cookie - see
// browserApi.js. getSellerById() and getSellerByEmail() were deleted in T-112b:
// no reference anywhere.

export const getSellers = async (university, section = '') => {
  const queryParams = new URLSearchParams();

  if (university) queryParams.append('university', university);
  if (section) queryParams.append('section', section);

  return await fetchFromApi(`/sellers?${queryParams.toString()}`);
};

// T-112b: no token parameter any more; the session cookie identifies the
// caller, and PUT /api/sellers/:id checks ownership against it.
export const updateSeller = async (id, data) => {
  return await fetchFromApi(`/sellers/${id}`, {
    method: 'PUT',
    ...jsonBody(data),
  });
};

// T-105. Approving is its own endpoint, not a field on updateSeller: `PUT
// /sellers/:id` is the seller's own self-service edit, and `approved` is
// stripped there by design (T-13). This one is admin-only, gated by the
// middleware's /api/(.*)/admin(.*) matcher and again inside the handler.
//
// T-105b: the first write to become a plain relative fetch from the browser,
// instead of the `'use server'` fetchAPIToken - which fetched
// `NEXT_PUBLIC_URL + '/api'` from the server with a Bearer token and no
// cookies, a server-to-server hop through Clerk's admin check that nothing in
// this repo exercised. T-112b moved every other call to the same shape and
// deleted that helper.
//
// It throws on a non-2xx so callers doing an optimistic update roll back in
// their `catch`. It keeps its own fetch rather than fetchFromApi for the error
// message it builds from the body.
export const approveSeller = async (id, approved) => {
  const response = await fetch(`/api/sellers/admin/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.error ?? body.message ?? `HTTP ${response.status} al aprobar el vendedor`
    );
  }

  return response.json();
};
