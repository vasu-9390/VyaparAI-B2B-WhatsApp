import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle errors gracefully
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred';

    // If 401 Unauthorized, notify session expiration
    if (error.response?.status === 401) {
      const isAuthPage = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/register');
      if (!isAuthPage) {
        // Clear local cache if any
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }

    return Promise.reject(new Error(errorMsg));
  }
);
