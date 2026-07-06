/**
 * authStore.ts
 * 
 * Mobile Auth State Management (React Context + AsyncStorage)
 * ──────────────────────────────────────────────────────────
 * Features:
 * - Secure token storage (AsyncStorage)
 * - Auto-refresh before expiry
 * - Login/logout state management
 * - API client integration
 * - Offline support (token available offline)
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  role: string | null;
  loading: boolean;
  error: string | null;
  login: (userId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auto-refresh token before expiry
  useEffect(() => {
    const checkTokenExpiry = async () => {
      try {
        const accessToken = await SecureStore.getItemAsync('accessToken');
        const expiresAt = await AsyncStorage.getItem('tokenExpiresAt');

        if (accessToken && expiresAt) {
          const now = Date.now();
          const expiryTime = parseInt(expiresAt);
          const timeUntilExpiry = expiryTime - now;

          // Refresh if less than 5 minutes until expiry
          if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
            await refreshToken();
          }
        }
      } catch (err) {
        console.error('Token expiry check failed:', err);
      }
    };

    const interval = setInterval(checkTokenExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // On app load, restore session
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const userJson = await AsyncStorage.getItem('user');

      if (accessToken && userJson) {
        const userData = JSON.parse(userJson);
        setUser(userData);
        setRole(userData.role);
        setIsAuthenticated(true);

        // Set auth header for API client
        api.setAuthToken(accessToken);
      }
    } catch (err) {
      console.error('Session restore failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userId: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      // Call backend login endpoint
      const response = await api.post('/api/auth/login', { userId, password });
      const { accessToken, refreshToken, expiresIn, user: userData } = response.data;

      // Store tokens securely
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('tokenExpiresAt', (Date.now() + expiresIn * 1000).toString());

      // Set auth header
      api.setAuthToken(accessToken);

      setUser(userData);
      setRole(userData.role);
      setIsAuthenticated(true);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Login failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call backend logout
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        await api.post('/api/auth/logout', { refreshToken }).catch(() => {
          // Logout endpoint may fail if token invalid, ignore
        });
      }

      // Clear storage
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('tokenExpiresAt');

      // Clear auth state
      api.setAuthToken(null);
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const refreshToken = async () => {
    try {
      const refreshTokenStr = await SecureStore.getItemAsync('refreshToken');
      if (!refreshTokenStr) throw new Error('No refresh token');

      const response = await api.post('/api/auth/refresh', { refreshToken: refreshTokenStr });
      const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;

      // Update tokens
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', newRefreshToken);
      await AsyncStorage.setItem('tokenExpiresAt', (Date.now() + expiresIn * 1000).toString());

      api.setAuthToken(accessToken);
    } catch (err) {
      // Token refresh failed, logout user
      await logout();
      throw err;
    }
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user || !role) return false;

    // Admin has all permissions
    if (role === 'ADMIN') return true;

    // Basic permission check (backend validates fully)
    const permissionMap: Record<string, Record<string, string[]>> = {
      'avatar:create': { create: ['AFFILIATE', 'ADMIN'] },
      'video:generate': { create: ['AFFILIATE', 'ADMIN'] },
      'user:profile': { read: ['USER', 'AFFILIATE', 'ADMIN'], update: ['USER', 'AFFILIATE', 'ADMIN'] },
      'admin:users': { manage: ['ADMIN'] },
    };

    const allowed = permissionMap[resource]?.[action] || [];
    return allowed.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        role,
        loading,
        error,
        login,
        logout,
        refreshToken,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
