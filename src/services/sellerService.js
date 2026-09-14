import { logger } from '@/lib/logger';
import { fetchAPI } from './api';
import { fetchAPIToken } from './apiToken';
import { fetchFromApi } from './browserApi';

// T-112: a relative browser fetch, not the `'use server'` fetchAPI - see
// browserApi.js.
export const getSellers = async (university, section = '') => {
  const queryParams = new URLSearchParams();

  if (university) queryParams.append('university', university);
  if (section) queryParams.append('section', section);

  return await fetchFromApi(`/sellers?${queryParams.toString()}`);
};

export const getSellerById = async id => {
  return await fetchAPI(`/sellers/${id}`);
};

export const getSellerByEmail = async email => {
  try {
    const result= await fetchAPI(`/sellers/${email}`);
    return result?.seller ? result : {seller: null};
  } catch (error) {
    logger.error('Error fetching seller by email:', error);
  }
};

export const updateSeller = async (id, data,token) => {
  return await fetchAPIToken(`/sellers/${id}`,token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// T-105. Approving is its own endpoint, not a field on updateSeller: `PUT
// /sellers/:id` is the seller's own self-service edit, and `approved` is
// stripped there by design (T-13). This one is admin-only, gated by the
// middleware's /api/(.*)/admin(.*) matcher and again inside the handler.
//
// T-105b: a plain relative fetch from the browser, NOT fetchAPIToken. That
// helper is `'use server'`, so it turns the call into a Server Action that
// fetches `NEXT_PUBLIC_URL + '/api'` from the server with a Bearer token and
// no cookies. Two problems with that here, and only here:
//  - This is the first call through that helper to a path the middleware
//    gates as an admin route, so the request has to survive Clerk's admin
//    check on a server-to-server hop - a seam nothing in this repo exercises,
//    and one the integration tests cannot cover because they call the handler
//    directly with the middleware mocked out.
//  - It is the `NEXT_PUBLIC_URL + '/api'` antipattern CLAUDE.md says is being
//    removed.
// The sibling GET on `/api/sellers/admin` has always been a relative browser
// fetch carrying Clerk's cookie, and it works. This now matches it.
//
// It throws on a non-2xx so callers doing an optimistic update roll back in
// their `catch`, same contract fetchAPIToken had.
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

