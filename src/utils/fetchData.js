'use server';

const URL = process.env.NEXT_PUBLIC_URL;

export async function getItems(query = '') {
  const res = await fetch(`${URL}/api/products?q=${query}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  console.log("obtuve pro");
  const data = await res.json();
  console.log(data);
  return data.products;
}

export async function getItemById(id) {
  const res = await fetch(`${URL}/api/products/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  return data;
}
