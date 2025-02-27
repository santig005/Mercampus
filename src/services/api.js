'use server'; //

// src/services/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_URL + '/api';

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
