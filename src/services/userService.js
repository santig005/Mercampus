import { fetchAPI } from './api';

export const getUserByEmail = async (email) => {
  const response= await fetchAPI(`/users/${email}`);
  return response?.user || false;
}
