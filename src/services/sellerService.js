import { fetchAPI } from './api';

export const getSellers = async () => {
    return await fetchAPI('/sellers');
};

export const getSellerById = async (id) => {
  return await fetchAPI(`/sellers/${id}`);
};