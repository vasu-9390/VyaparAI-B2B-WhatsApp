import { api } from './client.js';

export const quotationApi = {
  list: (params) => api.get('/quotations', { params }),
  getById: (id) => api.get(`/quotations/${id}`),
  create: (data) => api.post('/quotations', data),
  approve: (id, note) => api.post(`/quotations/${id}/approve`, { note }),
  send: (id) => api.post(`/quotations/${id}/send`),
  accept: (id) => api.post(`/quotations/${id}/accept`),
  reject: (id, reason) => api.post(`/quotations/${id}/reject`, { reason }),
  getPdfUrl: (id) => `/api/quotations/${id}/pdf`,
};
