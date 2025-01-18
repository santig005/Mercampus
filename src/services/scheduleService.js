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

export const updateSchedule = async (id, scheduleData) => {
  return await fetchAPI(`/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(scheduleData),
  });
};

export const deleteSchedule = async (id) => {
  return await fetchAPI(`/schedules/${id}`, {
    method: 'DELETE',
  });
};

export const saveAllSchedules = async (payload) => {
  return await fetchAPI('/schedules/bulk', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};
