// SOR SENTINEL — Auth Context
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User, SignupInitiateResponse } from '@/types';
import { authApi, tokenStorage, extractErrorMessage } from '@/services/api';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<SignupInitiateResponse>;
  completeSignupVerification: (email: string, otp: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  terms_accepted: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, try to restore session from stored token
  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      authApi.me()
        .then((res) => setUser(res.data))
        .catch(() => {
          tokenStorage.clearTokens();
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const res = await authApi.login(email, password);
    tokenStorage.setTokens(res.data.access_token, res.data.refresh_token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<SignupInitiateResponse> => {
    const res = await authApi.register(data);
    return res.data;
  }, []);

  const completeSignupVerification = useCallback(async (email: string, otp: string): Promise<User> => {
    const res = await authApi.verifySignupOtp(email, otp);
    tokenStorage.setTokens(res.data.access_token, res.data.refresh_token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    tokenStorage.clearTokens();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.data);
    } catch {
      logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        completeSignupVerification,
        logout,
        refreshUser,
        updateUser: setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
