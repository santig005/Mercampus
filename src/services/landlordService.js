import { fetchAPI } from './api';

export const getLandlords = async (university) => {
  const queryParams = new URLSearchParams();

  if (university) queryParams.append('university', university);
  
  return await fetchAPI(`/landlords?${queryParams.toString()}`);
};
