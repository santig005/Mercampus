import { fetchFromApi, jsonBody } from './browserApi';

// T-112 / T-112b: every call goes to the app's own API from the browser, with a
// relative URL and Clerk's session cookie - see browserApi.js.

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
  availability,
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
  // T-123: same idea - 'all' (both options) is the backend's default.
  if (availability && availability !== 'all') {
    queryParams.append('availability', availability);
  }
  if (limit) queryParams.append('limit', limit);
  if (cursor) queryParams.append('cursor', cursor);

  return await fetchFromApi(`/products?${queryParams.toString()}`);
};

export const getSellerProducts = async (sellerId, section = '') => {
  const queryParams = new URLSearchParams();
  if (section) queryParams.append('section', section);

  const queryString = queryParams.toString();
  const url = `/products/seller/${sellerId}${queryString ? `?${queryString}` : ''}`;

  return await fetchFromApi(url);
};

// T-97: getProductById() lived here and was the edit screen's only caller.
// That screen resolves its own product on the server now (getProductForEdit),
// so the function had no references left - checked across src/, tests/ and
// scripts/ - and it was one more fetch to our own API from a Server Action,
// the antipattern CLAUDE.md says is being removed. The public product detail
// does not use it either: ProductPage calls /api/products/[id] with fetch
// directly.
//
// T-112b: createProduct() went the same way - no reference anywhere; the add
// screen posts on its own.

// T-112b: no token parameter any more. EditProductForm never passed one, so
// with the old Bearer helper saving and deleting from the full form answered
// 401; the list page's availability switch did pass one and worked. The session
// cookie now covers every caller alike.
export const updateProduct = async (id, productData) => {
  return await fetchFromApi(`/products/${id}`, {
    method: 'PUT',
    ...jsonBody(productData),
  });
};

export const deleteProduct = async id => {
  return await fetchFromApi(`/products/${id}`, { method: 'DELETE' });
};
