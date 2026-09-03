'use server'; //
import { logger } from '@/lib/logger';

// src/services/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_URL + '/api';
/* 
export const fetchAPI = async (endpoint, options = {}) => {
  logger.debug('petición a:', `${API_BASE_URL}${endpoint}`);
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    //logger.debug(response);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();

    // logger.debug('API Fetch Data:', data);

    return data;
  } catch (error) {
    logger.error('API Fetch Error:', error);
  }
};
 */
export const fetchAPI = async (endpoint, options = {}) => {
  logger.debug('petición a:', `${API_BASE_URL}${endpoint}`);
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // Verifica tipo de contenido antes de parsear JSON
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      const errorText = contentType.includes("application/json")
        ? await response.json()
        : await response.text(); // podría ser HTML
      throw new Error(`Error HTTP ${response.status}: ${JSON.stringify(errorText)}`);
    }

    if (contentType.includes("application/json")) {
      return await response.json();
    } else {
      return await response.text(); // fallback
    }
  } catch (error) {
    logger.error('API Fetch Error:', error);
    throw error; // si lo quieres propagar
  }
};
