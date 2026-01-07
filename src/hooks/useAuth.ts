// hooks/useAuth.ts
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

export const useAuthInitialization = () => {
  const { user, loading, setUser } = useAuth();

  // This hook can be used in your main App component
  return { user, loading, setUser };
};