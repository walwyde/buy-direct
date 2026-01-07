// lib/auth.ts
import { User } from '@/types';
import { supabase } from './supabase';

export const authService = {
  // Get current session and user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log('No session found');
        return null;
      }

      // Get user profile from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData) {
        console.error('User profile not found:', userError);
        return null;
      }

      // Transform to User type
      const user: User = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        avatarUrl: userData.avatar_url,
        manufacturerId: userData.manufacturer_id,
        createdAt: userData.created_at,
        status: userData.status
      };

      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Check and refresh session if needed
  async refreshSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      return !error && !!session;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  },

  // Set up session persistence listener
  setupAuthListener(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const user = await this.getCurrentUser();
          callback(user);
        }
      } else if (event === 'SIGNED_OUT') {
        callback(null);
      }
    });
  }
};