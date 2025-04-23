import { fetchAPI } from './api';
import { fetchAPIToken } from './apiToken';

export const getProducts = async (
  product,
  category,
  sellerId,
  university,
  limit,
  offset,
  
) => {
  const queryParams = new URLSearchParams();

  if (product) queryParams.append('product', product);
  if (category) queryParams.append('category', category);
  if (sellerId) queryParams.append('sellerId', sellerId);
  if (university) queryParams.append('university', university);
  if (limit) queryParams.append('limit', limit);
  if (offset) queryParams.append('offset', offset);
  

  return await fetchAPI(`/products?${queryParams.toString()}`);
};

export const getSellerProducts = async sellerId => {
  return await fetchAPI(`/products/seller/${sellerId}`);
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

export const updateProduct = async (id, productData,email) => {
  return await fetchAPIToken(`/products/${id}`,{
    method: 'PUT',
    body: JSON.stringify({productData,email}),
  });
};

export const deleteProduct = async (id)=> {
  return await fetchAPIToken(`/products/${id}`,{
    method: 'DELETE',
  });
};
