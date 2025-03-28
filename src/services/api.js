'use server'; //

const isServer = typeof window === 'undefined';

const API_BASE_URL = isServer
  ? '/api' // Si se está ejecutando en el servidor, usar ruta relativa
  : process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000/api'
  : process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'
  ? 'https://mercampus.vercel.app/api'
  : `https://${process.env.VERCEL_URL}/api`; // En previews desde el cliente

export const fetchAPI = async (endpoint, options = {}) => {
  console.log('petición a:', `${API_BASE_URL}${endpoint}`);
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    //console.log(response);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();

    // console.log('API Fetch Data:', data);

    return data;
  } catch (error) {
    console.error('API Fetch Error:', error);
  }
};
