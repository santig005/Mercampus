// src/services/schedules.js
import { fetchAPI } from './api';

export const getSchedules = async (sellerId) => {
  return await fetchAPI(`/schedules/${sellerId}`);
};

export const createSchedule = async (scheduleData) => {
  return await fetchAPI('/schedules', {
    method: 'POST',
    body: JSON.stringify(scheduleData),
  });
};

