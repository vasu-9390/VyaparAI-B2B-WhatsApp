import { api } from './client.js';

export const leadApi = {
  list: (params) => api.get('/leads', { params }),
  getById: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.patch(`/leads/${id}`, data),
  addNote: (id, text) => api.post(`/leads/${id}/notes`, { text }),
  assign: (id, assignedTo) => api.post(`/leads/${id}/assign`, { assignedTo }),
};
