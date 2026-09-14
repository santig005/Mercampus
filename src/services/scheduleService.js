// src/services/scheduleService.js
import { fetchFromApi } from './browserApi';

// T-112: a relative browser fetch - see browserApi.js. createSchedule() was
// deleted in T-112b: no reference anywhere.
export const getSchedules = async (sellerId) => {
  return await fetchFromApi(`/schedules/${sellerId}`);
};
