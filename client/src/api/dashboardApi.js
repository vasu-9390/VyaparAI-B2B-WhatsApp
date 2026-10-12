import { api } from './client.js';

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getSalesTrends: () => api.get('/dashboard/sales'),
};
