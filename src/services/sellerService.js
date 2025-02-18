import { fetchAPI } from './api';

export const getSellers = async () => {
  return await fetchAPI('/sellers');
};

export const getSellerById = async id => {
  return await fetchAPI(`/sellers/${id}`);
};

export const getSellerByEmail = async email => {
  try {
    return await fetchAPI(`/sellers/${email}`);
  } catch (error) {
    console.error('Error fetching seller by email:', error);
  }
};

export const updateSeller = async (id, data) => {
  return await fetchAPI(`/sellers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};
