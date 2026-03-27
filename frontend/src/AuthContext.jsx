import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nbme_token');
    if (!token) { setLoading(false); return; }
    api.auth.me()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem('nbme_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.auth.login(email, password);
    localStorage.setItem('nbme_token', token);
    setUser(user);
    return user;
  }, []);

  const signup = useCallback(async (email, password, name, agreedToTerms) => {
    const { token, user } = await api.auth.signup(email, password, name, agreedToTerms);
    localStorage.setItem('nbme_token', token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('nbme_token');
    setUser(null);
  }, []);

  const markEmailVerified = useCallback(() => {
    setUser(u => u ? { ...u, emailVerified: true } : u);
  }, []);

  const resendVerification = useCallback(() => api.auth.resendVerification(), []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, markEmailVerified, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
