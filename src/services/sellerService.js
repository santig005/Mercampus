import { logger } from '@/lib/logger';
import { fetchAPI } from './api';
import { fetchAPIToken } from './apiToken';	

export const getSellers = async (university, section = '') => {
  const queryParams = new URLSearchParams();

  if (university) queryParams.append('university', university);
  if (section) queryParams.append('section', section);
  
  return await fetchAPI(`/sellers?${queryParams.toString()}`);
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
// fetchAPIToken throws on a non-2xx rather than returning `{ error }`, so a
// caller doing an optimistic update has to roll back in its `catch`, not
// only on an error field in the response.
export const approveSeller = async (id, approved, token) => {
  return await fetchAPIToken(`/sellers/admin/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ approved }),
  });
};

