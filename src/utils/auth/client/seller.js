import {getUserEmail} from '@/utils/auth/client/user';
import { fetchAPI } from '@/services/api';

export async function isSeller() {
  const response = await getSeller();
  if (response) {
    return true;
  }
  return false;
}

export async function getSeller() {
  const email = await getUserEmail();
  const response = await fetchAPI('/sellers/seller', {
    method: 'GET',
    body: JSON.stringify({ email }),  
  });
  if (response) {
    return response;
  }
  return false;
}