import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { registerPush } from '../services/push';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('zumadash_token'));

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const res = await api.get('/api/users/me');
          setUser(res.data.user);
          registerPush().catch(() => {});
        } catch (err) {
          localStorage.removeItem('zumadash_token');
          setToken(null);
          delete api.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('zumadash_token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    registerPush().catch(() => {});
    return userData;
  };

  const register = async (data) => {
    const res = await api.post('/api/auth/register', data);
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('zumadash_token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    registerPush().catch(() => {});
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('zumadash_token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return null;
    try {
      const res = await api.get('/api/users/me');
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, refreshUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
