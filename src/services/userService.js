import { fetchAPI } from './api';

export const getUserByEmail = async (email) => {
  const response= await fetchAPI(`/users/${email}`);
  return response?.user || false;
}

export const getUserWithSellerByEmail = async (email) => {
  const response= await fetchAPI(`/users/user-with-seller/${email}`);
  return response || false;
}

