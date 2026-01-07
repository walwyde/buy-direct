// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'directsource-auth-token',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-application-name': 'directsource',
    },
  },
});

// Helper to get authenticated client
export const getAuthenticatedClient = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.warn('No active session found');
    return supabase;
  }
  
  // Return client with session
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    },
    global: {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
      }
    }
  });
};

// Cart methods

// lib/supabase.ts - Updated cartService
// In your lib/supabase.ts file, add these cart service functions

export const cartService = {
  // Get user's cart from Supabase
  async getUserCart(userId: string): Promise<CartItem[]> {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          products (*)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      return data?.map(item => ({
        ...item.products,
        quantity: item.quantity
      })) || [];
    } catch (error) {
      console.error('Error fetching cart:', error);
      return [];
    }
  },

  // Add item to cart in Supabase
  async addToCart(userId: string, productId: string, quantity: number): Promise<boolean> {
    try {
      // First check if item already exists in cart
      const { data: existing } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

      if (existing) {
        // Update quantity if exists
        const { error } = await supabase
          .from('cart_items')
          .update({ 
            quantity: existing.quantity + quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new item
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: userId,
            product_id: productId,
            quantity,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return false;
    }
  },

  // Update cart item quantity
  async updateCartItem(cartItemId: string, quantity: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ 
          quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', cartItemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating cart:', error);
      return false;
    }
  },

  // Remove item from cart
  async removeFromCart(userId: string, productId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return false;
    }
  },

  // Clear entire cart
  async clearCart(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }
};