'use server'; //

// src/services/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_URL + '/api';

export const fetchAPI = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // console.log(response);

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    return await response.json();
  } catch (error) {
    console.error('API Fetch Error:', error);
  }
};
