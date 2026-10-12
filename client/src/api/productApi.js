import { api } from './client.js';

export const productApi = {
  list: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.patch(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getAvailability: (id, params) => api.get(`/products/${id}/availability`, { params }),
  adjustStock: (id, data) => api.post(`/products/${id}/adjust-stock`, data),
};
