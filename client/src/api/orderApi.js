import { api } from './client.js';

export const orderApi = {
  getOrders: async (params = {}) => {
    return api.get('/orders', { params });
  },

  getOrderById: async (id) => {
    return api.get(`/orders/${id}`);
  },

  convertFromQuotation: async (quotationId, data = {}) => {
    return api.post(`/orders/from-quotation/${quotationId}`, data);
  },

  updateStatus: async (id, status, cancelReason = '') => {
    return api.patch(`/orders/${id}/status`, { status, cancelReason });
  },

  recordPayment: async (id, paymentData) => {
    return api.post(`/orders/${id}/payments`, paymentData);
  },

  getOrderPayments: async (id) => {
    return api.get(`/orders/${id}/payments`);
  },
};
