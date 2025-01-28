import { fetchAPI } from './api';

export const createPqrs = async (pqrsData) => {
  return await fetchAPI('/pqrs', {
    method: 'POST',
    body: JSON.stringify(pqrsData),
  });
}