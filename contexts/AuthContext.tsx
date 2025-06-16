// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { apiService, User, LoginCredentials, RegisterData } from '../services/api'; //
import { useRouter } from 'expo-router'; // Import useRouter

// Platform-specific imports
let AsyncStorage: any;
if (Platform.OS !== 'web') {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>; //
  register: (userData: RegisterData) => Promise<void>; //
  logout: () => Promise<void>; //
  refreshToken: () => Promise<void>; //
  clearError: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined); //

export const useAuth = () => {
  const context = useContext(AuthContext); //
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider'); //
  }
  return context; //
};

interface AuthProviderProps {
  children: ReactNode;
}

// Cross-platform storage utility
class CrossPlatformStorage {
  static async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      // Web browser
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    } else {
      // React Native
      return AsyncStorage.getItem(key);
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } else {
      await AsyncStorage.setItem(key, value);
    }
  }

  static async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } else {
      await AsyncStorage.removeItem(key);
    }
  }

  static async clear(): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }
    } else {
      await AsyncStorage.clear();
    }
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null); //
  const [token, setToken] = useState<string | null>(null); //
  const [isLoading, setIsLoading] = useState(true); //
  const [error, setError] = useState<string | null>(null); //
  const isAuthenticated = !!user && !!token; //

  const router = useRouter(); // Initialize useRouter

  useEffect(() => {
    const loadStoredAuthData = async () => {
      try {
        setIsLoading(true);
        const storedToken = await CrossPlatformStorage.getItem('authToken'); //
        const storedUserData = await CrossPlatformStorage.getItem('userData'); //

        if (storedToken && storedUserData) {
          const parsedUser: User = JSON.parse(storedUserData); //
          setUser(parsedUser); //
          setToken(storedToken); //
          
          // Optional: Verify token with backend to ensure it's still valid
          try {
            await apiService.verifyToken(storedToken); //
          } catch (verifyError) {
            console.warn('Stored token invalid or expired, logging out:', verifyError); //
            await logout(); // Perform full logout if token is invalid
          }
        }
      } catch (e) {
        console.error('Failed to load stored auth data:', e); //
        setError('Failed to load session.'); //
      } finally {
        setIsLoading(false); //
      }
    };

    loadStoredAuthData();
  }, []);

  const clearError = () => {
    setError(null);
  };

  const login = async (credentials: LoginCredentials) => { //
    try {
      setIsLoading(true); //
      setError(null); //
      
      const response = await apiService.login(credentials); //
      
      setUser(response.user); //
      setToken(response.token); //
      
      // Store token and user data for persistence
      await CrossPlatformStorage.setItem('authToken', response.token); //
      await CrossPlatformStorage.setItem('userData', JSON.stringify(response.user)); //
    } catch (error: any) {
      console.error('Login failed:', error); //
      setError(error.message || 'Login failed. Please try again.'); //
      throw error; //
    } finally {
      setIsLoading(false); //
    }
  };

  const register = async (userData: RegisterData) => { //
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.register(userData); //
      setUser(response.user); //
      setToken(response.token); //
      await CrossPlatformStorage.setItem('authToken', response.token); //
      await CrossPlatformStorage.setItem('userData', JSON.stringify(response.user)); //
    } catch (error: any) {
      console.error('Registration failed:', error); //
      setError(error.message || 'Registration failed. Please try again.'); //
      throw error; //
    } finally {
      setIsLoading(false); //
    }
  };

  const refreshToken = async () => {
    try {
      setIsLoading(true); //
      setError(null); //
      if (!token) {
        throw new Error('No token available for refresh'); //
      }
      const response = await apiService.refreshToken(token); //
      setToken(response.token); //
      setUser(response.user); //
      await CrossPlatformStorage.setItem('authToken', response.token); //
      await CrossPlatformStorage.setItem('userData', JSON.stringify(response.user)); //
    } catch (error: any) {
      console.error('Token refresh failed:', error); //
      setError('Session expired. Please log in again.'); //
      // If refresh fails, logout the user
      await logout(); //
      throw error; //
    } finally {
      setIsLoading(false); //
    }
  };

  const logout = async () => { //
    try {
      setIsLoading(true); //
      setError(null); //
      
      // Call logout API endpoint if token exists
      if (token) {
        try {
          await apiService.logout(token); //
        } catch (logoutError: any) {
          // Continue with local logout even if API call fails
          console.warn('API logout failed, continuing with local logout:', logoutError.message); //
        }
      }
      
      // Clear local state
      setUser(null); //
      setToken(null); //
      
      // Clear stored data
      await CrossPlatformStorage.clear(); //

      // Redirect to login page
      router.replace('/login'); 

    } catch (error: any) {
      console.error('Logout failed:', error); //
      setError('Logout failed, but session was cleared locally.'); //
      // Even if there's an error, clear local state
      setUser(null); //
      setToken(null); //
    } finally {
      setIsLoading(false); //
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};