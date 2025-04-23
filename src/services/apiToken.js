// src/services/apiToken.js
'use server';

import {auth} from "@clerk/nextjs/server";
const API_BASE_URL = process.env.NEXT_PUBLIC_URL + '/api';

export const fetchAPIToken = async (endpoint, options = {}) => {
    const {getToken} = auth();
    try {
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          credentials: "include",
            headers: {
              'Content-Type': 'application/json',
              Authorization:`Bearer ${await getToken()}`,
            },
            ...options,
          });
      
  
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok) {
        const errorText = contentType.includes("application/json")
          ? await response.json()
          : await response.text();
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorText)}`);
      }
      return contentType.includes("application/json")
        ? await response.json()
        : await response.text();
    } catch (error) {
      console.error('API Token Fetch Error:', error);
      throw error;
    }
  };
  