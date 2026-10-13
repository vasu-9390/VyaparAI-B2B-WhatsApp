import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

import { authApi } from '../api/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the user's session when the app starts.
  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const response = await authApi.getMe();

        if (active && response.success && response.data) {
          setUser(response.data.user);
          setOrganization(response.data.organization);
        }
      } catch (error) {
        if (active) {
          setUser(null);
          setOrganization(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    // Handle expired authentication.
    const handleExpired = () => {
      localStorage.removeItem('token');
      setUser(null);
      setOrganization(null);
    };

    window.addEventListener('auth:expired', handleExpired);

    return () => {
      active = false;
      window.removeEventListener(
        'auth:expired',
        handleExpired
      );
    };
  }, []);

  // Login and save the JWT returned by the backend.
  const login = async (email, password) => {
    const res = await authApi.login({
      email,
      password,
    });

    if (!res.success || !res.data) {
      throw new Error('Login failed');
    }

    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }

    setUser(res.data.user);
    setOrganization(res.data.organization);

    return res.data;
  };

  // Register and save the JWT if one is returned.
  const register = async (formData) => {
    const res = await authApi.register(formData);

    if (!res.success || !res.data) {
      throw new Error('Registration failed');
    }

    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }

    setUser(res.data.user);
    setOrganization(res.data.organization);

    return res.data;
  };

  // Logout and clear local authentication state.
  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setOrganization(null);
    }
  };

  // Check user permissions.
  const hasRole = (...roles) => {
    if (!user) {
      return false;
    }

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        loading,
        login,
        register,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Access authentication context.
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
}