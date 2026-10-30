import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../../types/index.js';
import { apiRequest } from '../../lib/api.js';
import { registerSocketUser, subscribeToSecurityStream, setSocketSession, disconnectSocket } from '../../lib/socket.js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchRoleQuick: (email: string, pass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await apiRequest<{
        id: string;
        email: string;
        fullName: string;
        role: User['role'];
        studentOrStaffId: string;
        department: string;
        status: User['status'];
        lastLoginAt?: string;
        sessionId?: string;
        csrfToken?: string;
      }>('/api/v1/auth/me');

      if (data && data.id) {
        const u: User = {
          id: data.id,
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          studentOrStaffId: data.studentOrStaffId,
          department: data.department,
          status: data.status,
          lastLoginAt: data.lastLoginAt,
        };
        setUser(u);
        if (data.sessionId) {
          sessionStorage.setItem('campus_session_id', data.sessionId);
          setSocketSession(data.sessionId);
        }
        if (data.csrfToken) {
          sessionStorage.setItem('campus_csrf_token', data.csrfToken);
        }
        registerSocketUser(u.id);
        if (u.role === 'admin') {
          subscribeToSecurityStream();
        }
      } else {
        setUser(null);
        sessionStorage.removeItem('campus_session_id');
        sessionStorage.removeItem('campus_csrf_token');
        disconnectSocket();
      }
    } catch {
      setUser(null);
      sessionStorage.removeItem('campus_session_id');
      sessionStorage.removeItem('campus_csrf_token');
      disconnectSocket();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    const res = await apiRequest<{ user: any; sessionId: string; csrfToken?: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password: pass },
    });

    const u: User = {
      id: res.user.id,
      email: res.user.email,
      fullName: res.user.fullName,
      role: res.user.role,
      studentOrStaffId: res.user.studentOrStaffId,
      department: res.user.department,
      status: res.user.status,
    };
    setUser(u);
    if (res.sessionId) {
      sessionStorage.setItem('campus_session_id', res.sessionId);
      setSocketSession(res.sessionId);
    }
    if (res.csrfToken) {
      sessionStorage.setItem('campus_csrf_token', res.csrfToken);
    }
    registerSocketUser(u.id);
    if (u.role === 'admin') {
      subscribeToSecurityStream();
    }
    return u;
  };

  const logout = async () => {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Continue cleanup on client
    }
    sessionStorage.removeItem('campus_session_id');
    sessionStorage.removeItem('campus_csrf_token');
    disconnectSocket();
    setUser(null);
  };

  const switchRoleQuick = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      await login(email, pass);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser, switchRoleQuick }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
