import { fetchAPI } from './api';
import { fetchAPIToken } from './apiToken';

export const getProducts = async (
  product,
  category,
  sellerId,
  university,
  limit,
  offset,
  section = 'antojos'
) => {
  const queryParams = new URLSearchParams();

  if (product) queryParams.append('product', product);
  if (category) queryParams.append('category', category);
  if (sellerId) queryParams.append('sellerId', sellerId);
  if (university) queryParams.append('university', university);
  if (limit) queryParams.append('limit', limit);
  if (offset) queryParams.append('offset', offset);
  if (section) queryParams.append('section', section);
  
  return await fetchAPI(`/products?${queryParams.toString()}`);
};

export const getSellerProducts = async (sellerId, section = '') => {
  const queryParams = new URLSearchParams();
  if (section) queryParams.append('section', section);
  
  const queryString = queryParams.toString();
  const url = `/products/seller/${sellerId}${queryString ? `?${queryString}` : ''}`;
  
  return await fetchAPI(url);
};

export const getProductById = async id => {
  return await fetchAPI(`/products/${id}`);
};

export const createProduct = async productData => {
  return await fetchAPI('/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
};

export const updateProduct = async (id, productData,token) => {
  return await fetchAPIToken(`/products/${id}`, token,{
    method: 'PUT',
    body: JSON.stringify(productData),
  });
};

export const deleteProduct = async (id ,token)=> {
  return await fetchAPIToken(`/products/${id}`, token,{
    method: 'DELETE',
  });
};
