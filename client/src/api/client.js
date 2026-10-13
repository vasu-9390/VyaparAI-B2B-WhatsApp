
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the saved JWT to every API request.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Return API response data and log errors for debugging.
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API request failed:', {
      url: error.config?.url,
      status: error.response?.status,
      message:
        error.response?.data?.error?.message ||
        error.message,
    });

    return Promise.reject(error);
  }
);
