const URL = process.env.NEXT_PUBLIC_URL;

export async function getItems() {
  const res = await fetch(`http://${URL}/api/product`);
  const data = await res.json();
  return data;
}
