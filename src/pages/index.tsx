'use client'

import React, { useState, useEffect, useMemo } from 'react';
import {
  Product,
  CartItem,
  Manufacturer,
  User,
  AppView,
  UserRole,
  Order,
  OrderStatus,
  Complaint,
  Notification
} from '@/types';
import { supabase, cartService } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import CartSidebar from '@/components/CartSidebar';
import AuthModal from '@/components/AuthModal';
import StatsBar from '@/components/StatsBar';
import FeaturedManufacturers from '@/components/FeaturedManufacturers';
import Testimonials from '@/components/Testimonials';
import SavingsCalculator from '@/components/SavingsCalculator';
import LiveOrders from '@/components/LiveOrders';
import SustainabilityImpact from '@/components/SustainabilityImpact';
import { ArrowRight, Check, Factory, Globe, Shield, Truck, Users, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const App: React.FC = () => {
  // -----------------------------
  // State
  // -----------------------------
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [platformStats, setPlatformStats] = useState({
    totalSavings: 0,
    activeFactories: 0,
    completedOrders: 0,
    carbonReduction: 0
  });
  
  const router = useRouter();
  const [currentView, setCurrentView] = useState<AppView>('marketplace');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [cartLoading, setCartLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // -----------------------------
  // AUTH PERSISTENCE - Get current user on load
  // -----------------------------
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        setAuthLoading(true);
        
        // Check if we have a stored session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Get user profile from users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userError) {
            console.error('User profile not found:', userError);
            // Create user if doesn't exist
            const { data: newUser } = await supabase
              .from('users')
              .insert({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                role: 'customer',
                avatar_url: session.user.user_metadata?.avatar_url,
                created_at: new Date().toISOString(),
                status: 'active'
              })
              .select()
              .single();

            if (newUser) {
              const transformedUser: User = {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role as UserRole,
                avatarUrl: newUser.avatar_url,
                manufacturerId: newUser.manufacturer_id,
                createdAt: newUser.created_at,
                status: newUser.status
              };
              setUser(transformedUser);
              toast.success(`Welcome back, ${transformedUser.name}!`);
            }
          } else if (userData) {
            const transformedUser: User = {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: userData.role as UserRole,
              avatarUrl: userData.avatar_url,
              manufacturerId: userData.manufacturer_id,
              createdAt: userData.created_at,
              status: userData.status
            };
            setUser(transformedUser);
          }
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      } finally {
        setAuthLoading(false);
      }
    };

    getCurrentUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // User just signed in - get their profile
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (userData) {
            const transformedUser: User = {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: userData.role as UserRole,
              avatarUrl: userData.avatar_url,
              manufacturerId: userData.manufacturer_id,
              createdAt: userData.created_at,
              status: userData.status
            };
            setUser(transformedUser);
            toast.success(`Welcome back, ${transformedUser.name}!`);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setCart([]);
          toast.success('Signed out successfully');
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refreshed, user is still logged in
          console.log('Token refreshed');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // -----------------------------
  // Load Data from Supabase
  // -----------------------------
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Helper function for safe queries
        const safeQuery = async (query: any) => {
          try {
            const { data, error } = await query;
            if (error) throw error;
            return { data: data || [] };
          } catch (err) {
            console.error('Query error:', err);
            return { data: [] };
          }
        };

        // Fetch all data in parallel
        const [
          { data: productRows },
          { data: manufacturerRows },
          { data: userRows },
          { data: orderRows },
          { data: complaintRows },
          { data: notificationRows }
        ] = await Promise.all([
          safeQuery(supabase.from('products').select('*, manufacturers(id, company_name, logo_url, verification_status)')),
          safeQuery(supabase.from('manufacturers').select('*').order('verification_status', { ascending: false })),
          safeQuery(supabase.from('users').select('*')),
          safeQuery(supabase.from('orders').select('*').order('created_at', { ascending: false })),
          safeQuery(supabase.from('complaints').select('*')),
          safeQuery(supabase.from('notifications').select('*').order('created_at', { ascending: false }))
        ]);

        // Transform products data
        if (productRows) {
          const transformedProducts = productRows.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: Number(p.price) || 0,
            retailPriceEstimation: p.retail_price_estimation 
              ? Number(p.retail_price_estimation) 
              : (Number(p.price) || 0) * 1.5,
            category: p.category || 'Uncategorized',
            stock: p.stock || 0,
            imageUrl: p.image_url || '/placeholder.jpg',
            specifications: p.specifications || {},
            manufacturerId: p.manufacturer_id,
            manufacturerName: p.manufacturers?.company_name,
            isFeatured: p.is_featured || false,
            minimumOrderQuantity: p.minimum_order_quantity || 1
          }));
          setProducts(transformedProducts);
        }

        // Transform manufacturers data
        if (manufacturerRows) {
          const transformedManufacturers = manufacturerRows.map((m: any) => ({
            id: m.id,
            companyName: m.company_name,
            logoUrl: m.logo_url,
            bio: m.bio,
            location: m.location,
            establishedYear: m.established_year,
            verificationStatus: m.verification_status,
            productCount: productRows?.filter((p: any) => p.manufacturer_id === m.id).length || 0
          }));
          setManufacturers(transformedManufacturers);
        }

        setUsers(userRows || []);
        setOrders(orderRows || []);
        setComplaints(complaintRows || []);
        setNotifications(notificationRows || []);

        // Calculate platform stats
        const totalSavings = orderRows?.reduce((acc: number, o: any) => 
          acc + (Number(o.total_amount) || 0) * 0.4, 0) || 0;
        
        setPlatformStats({
          totalSavings: Math.round(totalSavings),
          activeFactories: manufacturerRows?.length || 0,
          completedOrders: orderRows?.length || 0,
          carbonReduction: Math.round((orderRows?.length || 0) * 0.3)
        });

      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // -----------------------------
  // Cart Management with Persistence
  // -----------------------------
  useEffect(() => {
    const loadCart = async () => {
      try {
        setCartLoading(true);
        
        if (user) {
          // Load cart from Supabase for logged-in user
          const cartItems = await cartService.getUserCart(user.id);
          setCart(cartItems);
          console.log('Loaded user cart:', cartItems);
        } else {
          // Load guest cart from localStorage
          const guestCart = localStorage.getItem('directsource_guest_cart');
          if (guestCart) {
            try {
              const parsedCart = JSON.parse(guestCart);
              setCart(parsedCart);
              console.log('Loaded guest cart:', parsedCart);
            } catch (e) {
              console.error('Failed to load guest cart:', e);
              localStorage.removeItem('directsource_guest_cart');
            }
          }
        }
      } catch (error) {
        console.error('Error loading cart:', error);
      } finally {
        setCartLoading(false);
      }
    };

    loadCart();

    // Listen for auth state changes to migrate cart
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Migrate guest cart to user cart when user signs in
          const guestCart = localStorage.getItem('directsource_guest_cart');
          if (guestCart) {
            try {
              const parsedCart = JSON.parse(guestCart);
              console.log('Migrating guest cart:', parsedCart);
              
              for (const item of parsedCart) {
                await cartService.addToCart(session.user.id, item.id, item.quantity);
              }
              
              localStorage.removeItem('directsource_guest_cart');
              
              // Reload cart from Supabase
              const cartItems = await cartService.getUserCart(session.user.id);
              setCart(cartItems);
              
              toast.success('Cart migrated successfully!');
            } catch (error) {
              console.error('Error migrating cart:', error);
            }
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // -----------------------------
  // Cart Functions
  // -----------------------------
  const handleAddToCart = async (product: Product) => {
    if(user?.role === "manufacturer" || user?.role === "admin") return;
    // Check stock availability
    if (product.stock <= 0) {
      toast.error('This product is out of stock');
      return;
    }

    // If no user, store in localStorage
    if (!user) {
      const guestCart = JSON.parse(localStorage.getItem('directsource_guest_cart') || '[]');
      const existingItemIndex = guestCart.findIndex((item: any) => item.id === product.id);
      
      if (existingItemIndex > -1) {
        // Update quantity
        const newQuantity = guestCart[existingItemIndex].quantity + 1;
        if (newQuantity > product.stock) {
          toast.error(`Only ${product.stock} items available`);
          return;
        }
        guestCart[existingItemIndex].quantity = newQuantity;
      } else {
        // Add new item
        if (1 > product.stock) {
          toast.error(`Only ${product.stock} items available`);
          return;
        }
        guestCart.push({ 
          ...product, 
          quantity: 1,
          addedAt: new Date().toISOString()
        });
      }
      
      localStorage.setItem('directsource_guest_cart', JSON.stringify(guestCart));
      
      // Update cart state
      setCart(prev => {
        const existing = prev.find(i => i.id === product.id);
        if (existing) {
          return prev.map(i => 
            i.id === product.id 
              ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) } 
              : i
          );
        } else {
          return [...prev, { ...product, quantity: 1 }];
        }
      });
      
      toast.success(`${product.name} added to cart!`);
      setIsCartOpen(true);
      
      // Prompt sign in for better experience
      setTimeout(() => {
        if (!user) {
          setIsAuthModalOpen(true);
        }
      }, 2000);
      
      return;
    }

    // For logged-in users, sync with Supabase
    try {
      setCartLoading(true);
      
      // Check stock again with current cart quantity
      const currentCartItem = cart.find(i => i.id === product.id);
      const requestedQuantity = (currentCartItem?.quantity || 0) + 1;
      
      if (requestedQuantity > product.stock) {
        toast.error(`Only ${product.stock} items available in stock`);
        setCartLoading(false);
        return;
      }

      const success = await cartService.addToCart(user.id, product.id, 1);
      
      if (success) {
        // Update local cart state
        setCart(prev => {
          const existing = prev.find(i => i.id === product.id);
          if (existing) {
            return prev.map(i => 
              i.id === product.id 
                ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) } 
                : i
            );
          } else {
            return [...prev, { ...product, quantity: 1 }];
          }
        });
        
        toast.success(`${product.name} added to cart!`);
        setIsCartOpen(true);
      } else {
        toast.error('Failed to add item to cart. Please try again.');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    } finally {
      setCartLoading(false);
    }
  };

  const handleUpdateQty = async (productId: string, delta: number) => {
    const product = cart.find(i => i.id === productId);
    if (!product) return;

    const newQuantity = product.quantity + delta;
    
    // Check stock limits
    if (newQuantity > product.stock) {
      toast.error(`Only ${product.stock} items available`);
      return;
    }

    if (newQuantity < 1) {
      handleRemoveItem(productId);
      return;
    }

    if (user) {
      try {
        setCartLoading(true);
        // Update in Supabase
        const { data: cartItem } = await supabase
          .from('cart_items')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .single();

        if (cartItem) {
          await cartService.updateCartItem(cartItem.id, newQuantity);
        }

        // Update local state
        setCart(prev =>
          prev.map(i =>
            i.id === productId ? { ...i, quantity: newQuantity } : i
          )
        );
      } catch (error) {
        console.error('Error updating quantity:', error);
        toast.error('Failed to update quantity');
      } finally {
        setCartLoading(false);
      }
    } else {
      // Update guest cart in localStorage
      const guestCart = JSON.parse(localStorage.getItem('directsource_guest_cart') || '[]');
      const itemIndex = guestCart.findIndex((item: any) => item.id === productId);
      
      if (itemIndex > -1) {
        guestCart[itemIndex].quantity = newQuantity;
        localStorage.setItem('directsource_guest_cart', JSON.stringify(guestCart));
        
        // Update local state
        setCart(prev =>
          prev.map(i =>
            i.id === productId ? { ...i, quantity: newQuantity } : i
          )
        );
      }
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (user) {
      try {
        setCartLoading(true);
        const success = await cartService.removeFromCart(user.id, productId);
        
        if (success) {
          setCart(prev => prev.filter(i => i.id !== productId));
          toast.success('Item removed from cart.');
        }
      } catch (error) {
        console.error('Error removing item:', error);
        toast.error('Failed to remove item');
      } finally {
        setCartLoading(false);
      }
    } else {
      // Remove from guest cart
      const guestCart = JSON.parse(localStorage.getItem('directsource_guest_cart') || '[]');
      const newGuestCart = guestCart.filter((item: any) => item.id !== productId);
      localStorage.setItem('directsource_guest_cart', JSON.stringify(newGuestCart));
      
      // Update local state
      setCart(prev => prev.filter(i => i.id !== productId));
      toast.success('Item removed from cart.');
    }
  };

  // -----------------------------
  // Auth Handlers
  // -----------------------------
  const handleSignIn = async (newUser: User) => {
    const networkUser = users.find(u => u.email === newUser.email);
    if (networkUser?.status === 'suspended') {
      toast.error('This account has been restricted.');
      return;
    }
    
    setUser(newUser);
    
    // Migrate guest cart to user cart
    const guestCart = JSON.parse(localStorage.getItem('directsource_guest_cart') || '[]');
    if (guestCart.length > 0) {
      try {
        setCartLoading(true);
        for (const item of guestCart) {
          await cartService.addToCart(newUser.id, item.id, item.quantity);
        }
        localStorage.removeItem('directsource_guest_cart');
        
        // Load updated cart from Supabase
        const cartItems = await cartService.getUserCart(newUser.id);
        setCart(cartItems);
        toast.success('Cart migrated successfully!');
      } catch (error) {
        console.error('Error migrating cart:', error);
        toast.error('Failed to migrate cart');
      } finally {
        setCartLoading(false);
      }
    }
    
    toast.success(`Welcome back, ${newUser.name}!`);
    setIsAuthModalOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setCart([]);
      setCurrentView('marketplace');
      localStorage.removeItem('directsource_guest_cart');
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  // -----------------------------
  // Notifications
  // -----------------------------
  const addNotification = (userId: string, title: string, message: string) => {
    const newNotif: Notification = {
      id: 'NT-' + Math.random().toString(36).substring(2, 9),
      userId,
      title,
      message,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // -----------------------------
  // Scroll Effect
  // -----------------------------
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // -----------------------------
  // Realtime Subscriptions
  // -----------------------------
  useEffect(() => {
    const channelOrders = supabase
      .channel('orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
        setOrders(prev => {
          const exists = prev.find(o => o.id === payload.new.id);
          return exists ? prev.map(o => (o.id === payload.new.id ? payload.new : o)) : [payload.new, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelOrders);
    };
  }, []);

  // -----------------------------
  // Filtered Products
  // -----------------------------
  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);
  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory !== 'All') result = result.filter(p => p.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.manufacturerName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, selectedCategory, searchQuery]);

  const featuredProducts = useMemo(() => products.filter(p => p.isFeatured).slice(0, 4), [products]);
  const verifiedManufacturers = useMemo(() => 
    manufacturers.filter(m => m.verificationStatus === 'verified').slice(0, 4), 
    [manufacturers]
  );

  // -----------------------------
  // Hero Section Features
  // -----------------------------
  const heroFeatures = [
    { icon: <Shield className="w-6 h-6" />, text: 'Verified Factories', color: 'text-blue-500' },
    { icon: <Truck className="w-6 h-6" />, text: 'Direct Shipping', color: 'text-green-500' },
    { icon: <Zap className="w-6 h-6" />, text: '40-70% Savings', color: 'text-amber-500' },
    { icon: <Globe className="w-6 h-6" />, text: 'Global Network', color: 'text-purple-500' }
  ];

  // -----------------------------
  // Loading State
  // -----------------------------
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading DirectSource...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <Navbar
        cartCount={cart.reduce((sum, item) => sum + (item.quantity || 1), 0)}
        onCartClick={() => setIsCartOpen(true)}
        onViewChange={setCurrentView}
        currentView={currentView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        user={user}
        notifications={notifications.filter(n => n.userId === user?.id || (user?.role === UserRole.ADMIN && n.userId === 'u_admin'))}
        onMarkNotificationRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))}
        onSignInClick={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        
        {/* Animated Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold mb-6">
                <Zap className="w-4 h-4" />
                Revolutionizing Global Sourcing
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
                Source Directly from
                <span className="block bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  Verified Factories
                </span>
              </h1>
              
              <p className="text-xl text-white/80 mb-8 max-w-xl">
                Eliminate middlemen, reduce costs by 40-70%, and build direct relationships with 
                audited manufacturers worldwide. Join thousands of businesses already sourcing smarter.
              </p>
              
              {/* Stats */}
              <div className="flex flex-wrap gap-8 mb-10">
                <div>
                  <div className="text-3xl font-black text-white mb-1">
                    {platformStats.activeFactories.toLocaleString()}+
                  </div>
                  <div className="text-white/70 text-sm font-bold uppercase tracking-widest">
                    Verified Factories
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white mb-1">
                    ${platformStats.totalSavings.toLocaleString()}+
                  </div>
                  <div className="text-white/70 text-sm font-bold uppercase tracking-widest">
                    Customer Savings
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white mb-1">
                    {platformStats.completedOrders.toLocaleString()}+
                  </div>
                  <div className="text-white/70 text-sm font-bold uppercase tracking-widest">
                    Direct Orders
                  </div>
                </div>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                >
                  {user ? 'Continue Sourcing' : 'Start Free Sourcing'}
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentView('manufacturers')}
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/20"
                >
                  Explore Factories
                </button>
              </div>
              
              {/* Trust Badges */}
              <div className="mt-12 pt-8 border-t border-white/10">
                <p className="text-white/60 text-sm mb-4">Trusted by industry leaders</p>
                <div className="flex flex-wrap gap-6">
                  <div className="text-white/40 font-bold">ISO 9001 Certified</div>
                  <div className="text-white/40 font-bold">● Eco-Friendly</div>
                  <div className="text-white/40 font-bold">● 24/7 Support</div>
                  <div className="text-white/40 font-bold">● Secure Payments</div>
                </div>
              </div>
            </div>
            
            {/* Right Content - Hero Image/Video Placeholder */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="aspect-video bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <div className="text-center p-8">
                    <Factory className="w-24 h-24 text-white/30 mx-auto mb-6" />
                    <div className="text-white text-2xl font-bold mb-2">Live Factory Feed</div>
                    <p className="text-white/60">Real-time production monitoring</p>
                  </div>
                </div>
                
                {/* Floating Cards */}
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-2xl w-64">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Order Confirmed</div>
                      <div className="text-sm text-slate-500">Just now</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600">Factory: Shenzhen Electronics</div>
                </div>
                
                <div className="absolute -top-6 -right-6 bg-white rounded-2xl p-4 shadow-2xl w-64">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">New Factory Added</div>
                      <div className="text-sm text-slate-500">5 min ago</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600">Guangzhou Textiles Ltd.</div>
                </div>
              </div>
              
              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-4 mt-8">
                {heroFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className={`${feature.color} mb-2`}>{feature.icon}</div>
                    <div className="text-white text-sm font-bold">{feature.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        {/* Stats Bar */}
        <StatsBar stats={platformStats} />
        
        {/* Category Filter */}
        <div className="mb-12">
          <h2 className="text-3xl font-black text-slate-900 mb-6">Browse by Category</h2>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 8).map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  selectedCategory === category
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="mb-16">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black text-slate-900">Featured Products</h2>
            <button
              onClick={() => setCurrentView('marketplace')}
              className="text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-2"
            >
              View All Products
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 mb-4">No products found</div>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="text-indigo-600 font-bold hover:text-indigo-700"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredProducts.slice(0, 8).map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  manufacturer={manufacturers.find(m => m.id === p.manufacturerId)!}
                  onAddToCart={handleAddToCart}
                  onViewDetails={(product) => router.push(`/product-detail/${product.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Featured Manufacturers */}
        <div className="mb-16">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Verified Manufacturing Partners</h2>
              <p className="text-slate-600">Every factory is audited for quality, sustainability, and fair labor practices.</p>
            </div>
            <button
              onClick={() => router.push('/manufacturers')}
              className="text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-2"
            >
              View All Factories
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          {verifiedManufacturers.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl">
              <Factory className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <div className="text-slate-500">No verified manufacturers available</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {verifiedManufacturers.map((manufacturer) => {
                const manufacturerProducts = products.filter(p => p.manufacturerId === manufacturer.id);
                const featuredProduct = manufacturerProducts[0];
                
                return (
                  <div
                    key={manufacturer.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group"
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                          <img
                            src={manufacturer.logoUrl || '/placeholder.jpg'}
                            alt={manufacturer.companyName}
                            className="w-16 h-16 rounded-xl object-cover shadow-lg group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.jpg';
                            }}
                          />
                          {manufacturer.verificationStatus === 'verified' && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">{manufacturer.companyName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">{manufacturer.location}</span>
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                              VERIFIED
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-slate-600 text-sm line-clamp-2 mb-4">
                        {manufacturer.bio || 'Specialized manufacturer with quality certifications.'}
                      </p>
                      
                      {featuredProduct && (
                        <div className="bg-slate-50 rounded-xl p-3 mb-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={featuredProduct.imageUrl || '/placeholder.jpg'}
                              alt={featuredProduct.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-bold text-slate-900 truncate">
                                {featuredProduct.name}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900">
                                  ${featuredProduct.price.toFixed(2)}
                                </span>
                                <span className="text-xs text-green-600 font-bold">
                                  Save {Math.round((1 - featuredProduct.price / featuredProduct.retailPriceEstimation) * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        <div className="text-xs text-slate-500">
                          Est. {manufacturer.establishedYear || '2000'} • {manufacturerProducts.length} products
                        </div>
                        <button
                          onClick={() => router.push(`/manufacturer-products/${manufacturer.id}`)}
                          className="text-indigo-600 font-bold text-sm hover:text-indigo-700 flex items-center gap-1"
                        >
                          View Store
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Additional Sections */}
        <SavingsCalculator />
        <SustainabilityImpact carbonReduction={platformStats.carbonReduction} />
        <Testimonials />
        <LiveOrders orders={orders.slice(0, 5)} />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">DS</span>
                </div>
                <span className="text-2xl font-black">DirectSource</span>
              </div>
              <p className="text-slate-400 mb-6">
                Revolutionizing global manufacturing by connecting businesses directly with verified factories.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-6">Quick Links</h3>
              <ul className="space-y-3">
                <li><button onClick={() => setCurrentView('marketplace')} className="text-slate-400 hover:text-white transition-colors text-left">Marketplace</button></li>
                <li><button onClick={() => setCurrentView('manufacturers')} className="text-slate-400 hover:text-white transition-colors text-left">Factories</button></li>
                <li><button onClick={() => router.push('/process')} className="text-slate-400 hover:text-white transition-colors text-left">How It Works</button></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-lg font-bold mb-6">Resources</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Manufacturer Directory</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Quality Standards</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Help Center</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-bold mb-6">Contact Us</h3>
              <ul className="space-y-3">
                <li className="text-slate-400">support@directsource.com</li>
                <li className="text-slate-400">+1 (555) 123-4567</li>
              </ul>
              <div className="mt-8">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  {user ? 'Continue Sourcing' : 'Start Sourcing Now'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-slate-500 text-sm">
                © 2024 DirectSource. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Cart Sidebar */}
      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onRemove={handleRemoveItem}
        onUpdateQty={handleUpdateQty}
        onCheckout={() => router.push('/checkout')}
        loading={cartLoading}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleSignIn}
      />
    </div>
  );
};

export default App;
