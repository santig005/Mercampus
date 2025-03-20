import { fetchAPI } from './api';

export const getSellers = async (university) => {
  const queryParams = new URLSearchParams();

  if (university) queryParams.append('university', university); 
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
    console.error('Error fetching seller by email:', error);
  }
};

export const updateSeller = async (id, data) => {
  return await fetchAPI(`/sellers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

