import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api.js';

interface SecurityModeContextType {
  securityMode: 'on' | 'off';
  isSecure: boolean;
  isLoading: boolean;
  toggleSecurityMode: (desiredMode?: 'on' | 'off') => Promise<void>;
  refreshMode: () => Promise<void>;
}

const SecurityModeContext = createContext<SecurityModeContextType | undefined>(undefined);

export const SecurityModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [securityMode, setSecurityMode] = useState<'on' | 'off'>('on');
  const [isSecure, setIsSecure] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshMode = async () => {
    try {
      const data = await apiRequest<{ securityMode: 'on' | 'off'; isSecure: boolean }>('/api/v1/security-mode');
      if (data && data.securityMode) {
        setSecurityMode(data.securityMode);
        setIsSecure(data.isSecure);
      }
    } catch (err) {
      // Default to secure on error
      console.warn('Could not fetch security mode status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshMode();
    // Poll mode every 5 seconds to keep all open tabs synchronized
    const interval = setInterval(refreshMode, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleSecurityMode = async (desiredMode?: 'on' | 'off') => {
    const nextMode = desiredMode || (securityMode === 'on' ? 'off' : 'on');
    setIsLoading(true);
    try {
      const res = await apiRequest<{ securityMode: 'on' | 'off'; isSecure: boolean }>('/admin/security-mode', {
        method: 'POST',
        body: { mode: nextMode },
      });
      if (res && res.securityMode) {
        setSecurityMode(res.securityMode);
        setIsSecure(res.isSecure);
      }
    } catch (err: any) {
      console.error('Failed to toggle security mode:', err);
      alert(err.message || 'Failed to toggle security mode. Administrator privileges required.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SecurityModeContext.Provider value={{ securityMode, isSecure, isLoading, toggleSecurityMode, refreshMode }}>
      {children}
    </SecurityModeContext.Provider>
  );
};

export function useSecurityMode() {
  const ctx = useContext(SecurityModeContext);
  if (!ctx) {
    throw new Error('useSecurityMode must be used within a SecurityModeProvider');
  }
  return ctx;
}

