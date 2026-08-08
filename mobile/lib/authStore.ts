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
import { API_BASE } from '@/constants/config';

type AuthUser = {
  userId: string;
  affiliateId?: string;
  role?: string;
  [key: string]: unknown;
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  role: string | null;
  loading: boolean;
  error: string | null;
  login: (userId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
const EXPIRES_AT_KEY = 'tokenExpiresAt';

async function postAuth(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `${path} failed (${res.status})`);
  }
  return data;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh token before expiry
  useEffect(() => {
    const checkTokenExpiry = async () => {
      try {
        const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
        const expiresAt = await AsyncStorage.getItem(EXPIRES_AT_KEY);

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
      const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      const userJson = await AsyncStorage.getItem(USER_KEY);

      if (accessToken && userJson) {
        const userData = JSON.parse(userJson) as AuthUser;
        setUser(userData);
        setRole(String(userData.role || 'AFFILIATE').toUpperCase());
        setIsAuthenticated(true);
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
      const response = await postAuth('/api/auth/login', { userId, password });
      const accessToken = String(response.accessToken || '');
      const refreshToken = String(response.refreshToken || '');
      const expiresIn = Number(response.expiresIn || 3600);
      const userData = (response.user || { userId, role: 'AFFILIATE' }) as AuthUser;
      if (!accessToken || !refreshToken) {
        throw new Error('Authentication response missing tokens');
      }

      await AsyncStorage.multiSet([
        [ACCESS_TOKEN_KEY, accessToken],
        [REFRESH_TOKEN_KEY, refreshToken],
        [USER_KEY, JSON.stringify(userData)],
        [EXPIRES_AT_KEY, (Date.now() + expiresIn * 1000).toString()],
      ]);

      setUser(userData);
      setRole(String(userData.role || 'AFFILIATE').toUpperCase());
      setIsAuthenticated(true);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call backend logout
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await postAuth('/api/auth/logout', { refreshToken }).catch(() => {
          // Logout endpoint may fail if token invalid, ignore
        });
      }

      // Clear storage
      await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, EXPIRES_AT_KEY]);
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const refreshToken = async () => {
    try {
      const refreshTokenStr = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshTokenStr) throw new Error('No refresh token');

      const response = await postAuth('/api/auth/refresh', { refreshToken: refreshTokenStr });
      const accessToken = String(response.accessToken || '');
      const newRefreshToken = String(response.refreshToken || '');
      const expiresIn = Number(response.expiresIn || 3600);
      if (!accessToken || !newRefreshToken) {
        throw new Error('Token refresh failed');
      }

      // Update tokens
      await AsyncStorage.multiSet([
        [ACCESS_TOKEN_KEY, accessToken],
        [REFRESH_TOKEN_KEY, newRefreshToken],
        [EXPIRES_AT_KEY, (Date.now() + expiresIn * 1000).toString()],
      ]);
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

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        isAuthenticated,
        user,
        role,
        loading,
        error,
        login,
        logout,
        refreshToken,
        hasPermission,
      },
    },
    children
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
