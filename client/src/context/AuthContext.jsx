import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check current session on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await authApi.getMe();
        if (response.success && response.data) {
          setUser(response.data.user);
          setOrganization(response.data.organization);
        }
      } catch (err) {
        setUser(null);
        setOrganization(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();

    // Listen for global auth expiration events
    const handleExpired = () => {
      setUser(null);
      setOrganization(null);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.success && res.data) {
      setUser(res.data.user);
      setOrganization(res.data.organization);
      return res.data;
    }
  };

  const register = async (formData) => {
    const res = await authApi.register(formData);
    if (res.success && res.data) {
      setUser(res.data.user);
      setOrganization(res.data.organization);
      return res.data;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setOrganization(null);
    }
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, organization, loading, login, register, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
