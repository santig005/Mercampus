import { fetchAPI } from './api';
import { fetchAPIToken } from './apiToken';

// T-23: limit/cursor replace offset - a numeric offset can't be kept stable
// once the listing paginates in Mongo with a cursor (see GET /api/products).
// An options object rather than positional arguments: there were already 7
// parameters before the cursor was added.
export const getProducts = async ({
  product,
  category,
  sellerId,
  university,
  section = 'antojos',
  sort,
  limit,
  cursor,
} = {}) => {
  const queryParams = new URLSearchParams();

  if (product) queryParams.append('product', product);
  if (category) queryParams.append('category', category);
  if (sellerId) queryParams.append('sellerId', sellerId);
  if (university) queryParams.append('university', university);
  if (section) queryParams.append('section', section);
  // 'default' is the backend's own fallback - leaving it out keeps the URL
  // clean when nobody picked an explicit order.
  if (sort && sort !== 'default') queryParams.append('sort', sort);
  if (limit) queryParams.append('limit', limit);
  if (cursor) queryParams.append('cursor', cursor);

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
