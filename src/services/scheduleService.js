// src/services/schedules.js
import { fetchAPI } from './api';
import { fetchFromApi } from './browserApi';

// T-112: a relative browser fetch, not the `'use server'` fetchAPI - see
// browserApi.js.
export const getSchedules = async (sellerId) => {
  return await fetchFromApi(`/schedules/${sellerId}`);
};

export const createSchedule = async (scheduleData) => {
  return await fetchAPI('/schedules', {
    method: 'POST',
    body: JSON.stringify(scheduleData),
  });
};

