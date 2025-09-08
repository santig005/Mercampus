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
    console.error('Error fetching seller by email:', error);
  }
};

export const updateSeller = async (id, data,token) => {
  return await fetchAPIToken(`/sellers/${id}`,token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

