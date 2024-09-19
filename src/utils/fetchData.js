const URL = process.env.NEXT_PUBLIC_URL;

export async function getItems() {
  try {
    const res = await fetch(`${URL}/api/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch items:', error);
    throw error;
  }
}

export async function getItemById(id) {
  try {
    const res = await fetch(`${URL}/api/products/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch item with id ${id}:`, error);
    throw error;
  }
}