import { fetchAPI } from './api';

export const getSellers = async () => {
    return await fetchAPI('/sellers');
};

export const getSellerById = async (id) => {
  return await fetchAPI(`/sellers/${id}`);
};

export const getSellerByEmail= async (email) => {
  const response= await fetchAPI(`/sellers/${email}`);
  // if the response has a 404 error, return false
  if(response.error || response.message){
    return false;
  }
  return response?.seller | false;
}