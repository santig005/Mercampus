import { fetchAPI } from './api';
import { fetchAPIToken } from './apiToken';	

export const getTutors = async (university) => {
  const queryParams = new URLSearchParams();
  if (university) queryParams.append('university', university);
  return await fetchAPI(`/tutors?${queryParams.toString()}`);
};

export const getTutorMe = async (token) => {
  return await fetchAPIToken('/tutors/me', token);
};

export const updateTutorMe = async (data, token) => {
    return await fetchAPIToken('/tutors/me', token, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };
