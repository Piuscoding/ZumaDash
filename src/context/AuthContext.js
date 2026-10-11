import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { registerPush } from '../services/push';

const AuthContext = createContext();

function getDeviceFingerprint() {
  try {
    let fp = localStorage.getItem('zumadash_device_fp');
    if (!fp) {
      fp = `fp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem('zumadash_device_fp', fp);
    }
    return fp;
  } catch (_) {
    return `fp_tmp_${Date.now()}`;
  }
}



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
          const u = res.data.user || {};
          // Normalize flags so verify gate is reliable
          const normalized = {
            ...u,
            id: u._id || u.id,
            whatsappVerified: u.whatsappVerified === true,
            emailVerified: u.emailVerified === true,
          };
          setUser(normalized);
          if (normalized.whatsappVerified === true || normalized.role === 'admin') {
            registerPush().catch(() => {});
          }
        } catch (err) {
          // Only clear session on real auth rejection — never on network blips
          // (clearing here after register caused bounce to /login before verify)
          const status = err.response?.status;
          if (status === 401) {
            localStorage.removeItem('zumadash_token');
            setToken(null);
            setUser(null);
            delete api.defaults.headers.common['Authorization'];
          } else {
            console.warn('loadUser failed (keeping token):', err.message);
          }
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', {
      email,
      password,
      deviceFingerprint: getDeviceFingerprint(),
    });
    if (res.data.needsDeviceOtp && res.data.pendingToken) {
      sessionStorage.setItem('zumadash_pending_device', res.data.pendingToken);
      return {
        needsDeviceOtp: true,
        pendingToken: res.data.pendingToken,
        otpChannel: res.data.otpChannel || 'whatsapp',
        needsWhatsappVerification: false,
        ...res.data.user,
      };
    }
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('zumadash_token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    if (userData?.whatsappVerified !== false || userData?.role === 'admin') {
      registerPush().catch(() => {});
    }
    return {
      ...userData,
      needsWhatsappVerification: !!res.data.needsWhatsappVerification,
      needsDeviceOtp: false,
    };
  };

  const completeDeviceLogin = async (newToken, userData) => {
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
    if (!newToken) {
      throw new Error(res.data?.message || 'Registration did not return a session token');
    }
    const normalized = {
      ...userData,
      id: userData?.id || userData?._id,
      whatsappVerified: userData?.whatsappVerified === true,
      emailVerified: userData?.emailVerified === true,
    };
    localStorage.setItem('zumadash_token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setUser(normalized);
    setToken(newToken);
    const needsWa =
      res.data.needsWhatsappVerification === true ||
      normalized.whatsappVerified !== true ||
      (normalized.role !== 'admin' && normalized.whatsappVerified !== true);
    return {
      ...normalized,
      needsWhatsappVerification: !!needsWa,
      otpChannel: res.data.otpChannel || 'whatsapp',
      otpMessage: res.data.otpMessage || '',
      otpSent: res.data.otpSent,
    };
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
    <AuthContext.Provider
      value={{
        user,
        setUser,
        setToken,
        loading,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        needsWhatsappVerification:
          user &&
          user.role !== 'admin' &&
          user.whatsappVerified !== true &&
          user.emailVerified !== true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
