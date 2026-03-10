import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('godrive_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await authApi.me();
      setUser(data);
    } catch {
      localStorage.removeItem('godrive_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email, password) => {
    const { user: u, token } = await authApi.login(email, password);
    localStorage.setItem('godrive_token', token);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (data) => {
    const result = await authApi.register(data);
    if (result.requiresVerification) {
      return { requiresVerification: true, user: result.user };
    }
    if (result.token && result.user) {
      localStorage.setItem('godrive_token', result.token);
      setUser(result.user);
      return result.user;
    }
    throw new Error(result?.error || 'Registration failed');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('godrive_token');
    setUser(null);
    authApi.logout().catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
