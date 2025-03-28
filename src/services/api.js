'use server'; //

const isServer = typeof window === 'undefined';

const API_BASE_URL = (() => {
  // En el servidor se necesita URL completa
  if (isServer) {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3000/api';
    }
    // En producción o preview: si VERCEL_URL está disponible úsalo
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api`;
    }
    // Fallback en caso de que no se tenga VERCEL_URL
    return 'https://mercampus.vercel.app/api';
  } else {
    // En el cliente se puede usar la URL relativa en producción
    return process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000/api'
      : '/api';
  }
})();

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
