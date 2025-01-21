import { fetchAPI } from './api';

export const getProducts = async (query = '') => {
  return await fetchAPI(`/products?q=${query}`);
};
export const getSellerProducts = async (sellerId) => {
  return await fetchAPI(`/products/seller/${sellerId}`);
};

export const getProductById = async (id) => {
  return await fetchAPI(`/products/${id}`);
};

export const createProduct = async (productData) => {
  return await fetchAPI('/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
};

export const updateProduct = async (id, productData) => {
  return await fetchAPI(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });
};

export const deleteProduct = async (id) => {
  return await fetchAPI(`/products/${id}`, {
    method: 'DELETE',
  });
};