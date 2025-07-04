// contexts/AuthContext.tsx
import AsyncStorageRN from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { apiService, LoginCredentials, RegisterData, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  isAuthenticated: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Use static import and conditional assignment to avoid dynamic require
const AsyncStorage = Platform.OS === 'web' ? null : AsyncStorageRN;

// Cross-platform storage utility
class CrossPlatformStorage {
  static async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    } else if (AsyncStorage) {
      return AsyncStorage.getItem(key);
    }
    return null;
  }

  static async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } else if (AsyncStorage) {
      await AsyncStorage.setItem(key, value);
    }
  }

  static async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } else if (AsyncStorage) {
      await AsyncStorage.removeItem(key);
    }
  }

  static async clear(): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }
    } else if (AsyncStorage) {
      await AsyncStorage.clear();
    }
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = !!user && !!token;

  const router = useRouter();

  useEffect(() => {
    const loadStoredAuthData = async () => {
      try {
        setIsLoading(true);
        const storedToken = await CrossPlatformStorage.getItem('authToken');
        const storedUserData = await CrossPlatformStorage.getItem('userData');

        if (storedToken && storedUserData) {
          const parsedUser: User = JSON.parse(storedUserData);
          setUser(parsedUser);
          setToken(storedToken);

          try {
            await apiService.verifyToken(storedToken);
          } catch (verifyError) {
            console.warn('Stored token invalid or expired, logging out:', verifyError);
            await logout();
          }
        }
      } catch (e) {
        console.error('Failed to load stored auth data:', e);
        setError('Failed to load session.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuthData();
  }, []);

  const clearError = () => {
    setError(null);
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.login(credentials);

      setUser(response.user);
      setToken(response.token);

      await CrossPlatformStorage.setItem('authToken', response.token);
      await CrossPlatformStorage.setItem('userData', JSON.stringify(response.user));
    } catch (error: any) {
      console.error('Login failed:', error);
      setError(error.message || 'Login failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.register(userData);
      setUser(response.user);
      setToken(response.token);
      await CrossPlatformStorage.setItem('authToken', response.token);
      await CrossPlatformStorage.setItem('userData', JSON.stringify(response.user));
    } catch (error: any) {
      console.error('Registration failed:', error);
      setError(error.message || 'Registration failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!token) {
        throw new Error('No token available for refresh');
      }
      const response = await apiService.refreshToken(token);
      setToken(response.token);
      setUser(response.user);
      await CrossPlatformStorage.setItem('authToken', response.token);
      await CrossPlatformStorage.setItem('userData', JSON.stringify(response.user));
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      setError('Session expired. Please log in again.');
      await logout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (token) {
        try {
          await apiService.logout(token);
        } catch (logoutError: any) {
          console.warn('API logout failed, continuing with local logout:', logoutError.message);
        }
      }

      setUser(null);
      setToken(null);

      await CrossPlatformStorage.clear();

      router.replace('/');
    } catch (error: any) {
      console.error('Logout failed:', error);
      setError('Logout failed, but session was cleared locally.');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshToken,
    clearError,
    isAuthenticated,
    setUser,
    setToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};