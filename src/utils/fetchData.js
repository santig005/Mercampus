const URL = process.env.NEXT_PUBLIC_URL;

export async function getItems() {
  const res = await fetch(`http://${URL}/api/products`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'force-cache',
  });
  const data = await res.json();
  return data;
}
