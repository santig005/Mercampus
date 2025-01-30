import { fetchAPI } from './api';

export const getSellers = async () => {
    return await fetchAPI('/sellers');
};

export const getSellerById = async (id) => {
  return await fetchAPI(`/sellers/${id}`);
};

export const getSellerByEmail= async (email) => {
  const response= await fetchAPI(`/sellers/${email}`);
  if(response.error || response.message){
    return false;
  }
  return response?.seller || false;
}

export const updateSeller = async (id, data) => {
  return await fetchAPI(`/sellers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}