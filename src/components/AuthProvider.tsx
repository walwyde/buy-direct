// components/AuthProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { authService } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      try {
        setLoading(true);
        
        // Try to get current user
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        
        if (!currentUser) {
          // Try to refresh session
          const refreshed = await authService.refreshSession();
          if (refreshed) {
            const refreshedUser = await authService.getCurrentUser();
            setUser(refreshedUser);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Set up auth state change listener
    const { data: { subscription } } = authService.setupAuthListener(setUser);

    // Auto-refresh session every 30 minutes
    const refreshInterval = setInterval(async () => {
      await authService.refreshSession();
    }, 30 * 60 * 1000); // 30 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};