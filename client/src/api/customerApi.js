import { api } from './client.js';

export const customerApi = {
  list: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.patch(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getPricing: (customerId, productId) => api.get(`/customers/${customerId}/pricing/${productId}`),
};
