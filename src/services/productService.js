import { fetchAPI } from './api';

export const getProducts = async (
  product,
  category,
  sellerId,
  limit,
  offset
) => {
  const queryParams = new URLSearchParams();

  if (product) queryParams.append('product', product);
  if (category) queryParams.append('category', category);
  if (sellerId) queryParams.append('sellerId', sellerId);
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

export const updateProduct = async (id, productData) => {
  return await fetchAPI(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });
};

export const deleteProduct = async id => {
  return await fetchAPI(`/products/${id}`, {
    method: 'DELETE',
  });
};
