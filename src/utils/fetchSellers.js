'use server';

const URL = process.env.NEXT_PUBLIC_URL;

export async function getSellers( id ) {
    try {
        
        const res = await fetch(`${URL}/api/sellers/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error fetching sellers:', error);
    }
}
