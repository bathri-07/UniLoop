import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'student' | 'admin' | 'moderator';
  isVerified: boolean;
  isSuspended: boolean;
  college: {
    _id: string;
    name: string;
    campusLocation: string;
    pickupLocations: string[];
  } | string;
  avatar?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  demoLogin: (account: 'priya' | 'rahul') => Promise<boolean>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    collegeId: string;
    phone: string;
  }) => Promise<{ success: boolean; message: string; verificationUrl?: string; rawToken?: string }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('uniloop_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on initial load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('uniloop_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data.data?.user) {
            setUser(res.data.data.user);
          } else {
            localStorage.removeItem('uniloop_token');
            setToken(null);
          }
        } catch {
          localStorage.removeItem('uniloop_token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success) {
        const { token: receivedToken, user: receivedUser } = res.data.data;
        localStorage.setItem('uniloop_token', receivedToken);
        setToken(receivedToken);
        setUser(receivedUser);
        return true;
      }
      setError(res.data?.message || 'Login failed');
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setError(msg);
      return false;
    }
  };

  /**
   * 1-Click Demo Login: Logs in with pre-seeded IIT Bombay student accounts
   * without requiring manual password entry.
   */
  const demoLogin = async (account: 'priya' | 'rahul'): Promise<boolean> => {
    const credentials = {
      priya: {
        email: 'priya.senior@iitb.ac.in',
        password: 'DemoPassword123!'
      },
      rahul: {
        email: 'rahul.mech26@iitb.ac.in',
        password: 'DemoPassword123!'
      }
    };

    const cred = credentials[account];
    return login(cred.email, cred.password);
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
    collegeId: string;
    phone: string;
  }) => {
    setError(null);
    try {
      const res = await api.post('/auth/register', payload);
      return {
        success: true,
        message: res.data.message,
        verificationUrl: res.data.data?.verificationUrl,
        rawToken: res.data.data?.rawToken
      };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      setError(msg);
      return {
        success: false,
        message: msg
      };
    }
  };

  const verifyEmail = async (verificationToken: string) => {
    setError(null);
    try {
      const res = await api.get(`/auth/verify-email?token=${verificationToken}`);
      return {
        success: true,
        message: res.data.message || 'Email verified successfully!'
      };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Verification failed';
      return {
        success: false,
        message: msg
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('uniloop_token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        login,
        demoLogin,
        register,
        verifyEmail,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
