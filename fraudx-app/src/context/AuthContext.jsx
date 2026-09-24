import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

const DEFAULT_ROLE_CREDENTIALS = {
  customer: { email: 'customer@fraudx.ai', password: 'password123' },
  analyst: { email: 'analyst@fraudx.ai', password: 'password123' },
  organisation: { email: 'admin@fraudx.ai', password: 'password123' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('fraudx_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [selectedRole, setSelectedRole] = useState(() => user?.role || null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('fraudx_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Restore authenticated session on mount
  useEffect(() => {
    const token = localStorage.getItem('fraudx_token');
    if (token) {
      api.auth.me()
        .then((userData) => {
          setUser(userData);
          setSelectedRole(userData.role);
          setIsAuthenticated(true);
          localStorage.setItem('fraudx_user', JSON.stringify(userData));
        })
        .catch(() => {
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('fraudx_token');
          localStorage.removeItem('fraudx_user');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const completeLogin = (authData) => {
    if (authData?.token?.access_token) {
      localStorage.setItem('fraudx_token', authData.token.access_token);
      localStorage.setItem('fraudx_user', JSON.stringify(authData.user));
      setUser(authData.user);
      setSelectedRole(authData.user.role);
      setIsAuthenticated(true);
      return authData.user;
    }
    return null;
  };

  const login = async (roleOrCreds) => {
    let email, password, role;
    if (typeof roleOrCreds === 'string') {
      role = roleOrCreds;
      const def = DEFAULT_ROLE_CREDENTIALS[role] || DEFAULT_ROLE_CREDENTIALS.customer;
      email = def.email;
      password = def.password;
    } else {
      email = roleOrCreds.email;
      password = roleOrCreds.password;
      role = roleOrCreds.role;
    }

    try {
      const data = await api.auth.login(email, password, role);
      if (data.mfa_required) {
        return data; // Return challenge metadata (challenge_id, email, etc.)
      }
      if (data.token?.access_token) {
        return completeLogin(data);
      }
      return data;
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  };

  const verifyMfa = async (payload) => {
    try {
      const data = await api.auth.verifyMfa(payload);
      if (data.token?.access_token) {
        return completeLogin(data);
      }
      return data;
    } catch (err) {
      console.error('MFA verification failed:', err);
      throw err;
    }
  };

  const resendMfa = async (payload) => {
    try {
      return await api.auth.resendMfa(payload);
    } catch (err) {
      console.error('Resend verification code failed:', err);
      throw err;
    }
  };

  const register = async (userData) => {
    try {
      await api.auth.register(userData);
      return await login({
        email: userData.email,
        password: userData.password,
        role: userData.role || 'customer',
      });
    } catch (err) {
      console.error('Registration failed:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('fraudx_token');
      localStorage.removeItem('fraudx_user');
      setUser(null);
      setSelectedRole(null);
      setIsAuthenticated(false);
    }
  };

  const value = useMemo(() => ({
    user,
    selectedRole,
    isAuthenticated,
    isLoading,
    login,
    verifyMfa,
    resendMfa,
    completeLogin,
    register,
    logout,
    setSelectedRole,
  }), [user, selectedRole, isAuthenticated, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
