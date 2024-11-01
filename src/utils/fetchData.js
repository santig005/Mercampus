const URL = process.env.NEXT_PUBLIC_URL;

export async function getItems(query = '') {
  const res = await fetch(`/api/products?q=${query}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'force-cache',
  });
  const data = await res.json();
  return data;
}

export async function getItemById(id) {
  const res = await fetch(`${URL}/api/products/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'force-cache',
  });
  const data = await res.json();
  return data;
}
