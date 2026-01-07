'use client'

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  Home, 
  LogOut,
  User as UserIcon,
  Calendar,
  DollarSign,
  ShoppingBag,
  Settings,
  CreditCard,
  MapPin,
  Factory,
  AlertCircle,
  Shield,
  TrendingUp,
  Star,
  FileText,
  HelpCircle,
  Bell,
  ExternalLink,
  Download,
  RefreshCw,
  Eye,
  MessageSquare,
  Users,
  Building,
  Mail,
  Phone,
  Globe,
  BadgeCheck,
  XCircle,
  PackageCheck,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  customer_id: string;
  manufacturer_id: string;
  manufacturer?: {
    company_name: string;
    logo_url: string;
    location: string;
    verification_status: string;
  };
  customer?: {
    id: string;
    email: string;
    name: string;
    avatar_url: string;
  };
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string;
    category: string;
  }>;
  total_amount: number;
  status: 'awaiting_verification' | 'processing' | 'shipped' | 'delivered' | 'declined' | 'cancelled';
  payment_method: string;
  transaction_id?: string;
  account_name?: string;
  created_at: string;
  updated_at: string;
  shipping_address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
  notes?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  order_id?: string;
  is_read: boolean;
  created_at: string;
  type: 'order_update' | 'payment_update' | 'general';
}

interface UserStats {
  totalSpent: number;
  totalEarned: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
}

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [manufacturerProfile, setManufacturerProfile] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'settings' | 'stats' | 'notifications'>('orders');
  const [complaintModal, setComplaintModal] = useState<{
    isOpen: boolean;
    orderId?: string;
    manufacturerName?: string;
  }>({ isOpen: false });
  const [complaintText, setComplaintText] = useState('');
  const [stats, setStats] = useState<UserStats>({
    totalSpent: 0,
    totalEarned: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    averageOrderValue: 0
  });

  // Fetch user data, profile, and orders
  const fetchData = async () => {
    try {
      setRefreshing(true);
      
      // Get current authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        router.push('/auth');
        return;
      }

      // Set the authenticated user
      setUser(authUser);

      // Fetch user profile from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        
        // If user has manufacturer profile, fetch it
        if (profileData.role === 'manufacturer') {
          const { data: manufacturerData } = await supabase
            .from('manufacturers')
            .select('*')
            .eq('user_id', authUser.id)
            .single();

          setManufacturerProfile(manufacturerData);
        }

        // Fetch user's orders based on role
        let ordersQuery = supabase.from('orders').select(`
          *,
          manufacturers (
            company_name,
            logo_url,
            location,
            verification_status
          ),
          profiles!orders_customer_id_fkey (
            id,
            email,
            name,
            avatar_url
          )
        `);

        if (profileData.role === 'manufacturer') {
          // For manufacturers, get their manufacturer record first
          const { data: manufacturerData } = await supabase
            .from('manufacturers')
            .select('id')
            .eq('user_id', authUser.id)
            .single();

          if (manufacturerData) {
            // Then get orders where they are the manufacturer
            ordersQuery = ordersQuery.eq('manufacturer_id', manufacturerData.id);
          } else {
            // No manufacturer record found, set empty orders
            setOrders([]);
            setStats({
              totalSpent: 0,
              totalEarned: 0,
              totalOrders: 0,
              completedOrders: 0,
              pendingOrders: 0,
              cancelledOrders: 0,
              averageOrderValue: 0
            });
          }
        } else {
          // For customers, get orders where they are the customer
          ordersQuery = ordersQuery.eq('customer_id', authUser.id);
        }

        // Only execute the query if we have the proper conditions
        if (profileData.role !== 'manufacturer' || (profileData.role === 'manufacturer' && manufacturerProfile)) {
          const { data: ordersData, error: ordersError } = await ordersQuery
            .order('created_at', { ascending: false });

          if (!ordersError && ordersData) {
            setOrders(ordersData as Order[]);
            
            // Calculate statistics based on user role
            if (profileData.role === 'manufacturer') {
              // Manufacturer stats
              const totalEarned = ordersData.reduce((sum: number, order: any) => 
                sum + Number(order.total_amount || 0), 0);
              const totalOrders = ordersData.length;
              const completedOrders = ordersData.filter((order: any) => 
                ['delivered'].includes(order.status)).length;
              const pendingOrders = ordersData.filter((order: any) => 
                ['awaiting_verification', 'processing', 'shipped'].includes(order.status)).length;
              const cancelledOrders = ordersData.filter((order: any) => 
                ['cancelled', 'declined'].includes(order.status)).length;
              const averageOrderValue = totalOrders > 0 ? totalEarned / totalOrders : 0;
              
              setStats({
                totalSpent: 0,
                totalEarned,
                totalOrders,
                completedOrders,
                pendingOrders,
                cancelledOrders,
                averageOrderValue
              });
            } else {
              // Customer stats
              const totalSpent = ordersData.reduce((sum: number, order: any) => 
                sum + Number(order.total_amount || 0), 0);
              const totalOrders = ordersData.length;
              const completedOrders = ordersData.filter((order: any) => 
                ['delivered'].includes(order.status)).length;
              const pendingOrders = ordersData.filter((order: any) => 
                ['awaiting_verification', 'processing', 'shipped'].includes(order.status)).length;
              const cancelledOrders = ordersData.filter((order: any) => 
                ['cancelled', 'declined'].includes(order.status)).length;
              const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
              
              setStats({
                totalSpent,
                totalEarned: 0,
                totalOrders,
                completedOrders,
                pendingOrders,
                cancelledOrders,
                averageOrderValue
              });
            }
          } else if (ordersError) {
            console.error('Error fetching orders:', ordersError);
            toast.error('Failed to load orders');
          }
        }
      } else {
        // If no profile exists, set basic user info
        setProfile({
          id: authUser.id,
          email: authUser.email,
          name: authUser.email?.split('@')[0] || 'User',
          role: 'customer'
        });
      }

      // Fetch user notifications
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!notificationError && notificationData) {
        setNotifications(notificationData);
      }

    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscription for order updates based on role
    const channel = supabase
      .channel('user_orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          // Check if this order is relevant to the current user
          let isRelevant = false;
          
          if (profile?.role === 'manufacturer' && manufacturerProfile) {
            // For manufacturers, check if order belongs to them
            isRelevant = payload.new.manufacturer_id === manufacturerProfile.id;
          } else if (profile?.role === 'customer') {
            // For customers, check if order belongs to them
            isRelevant = payload.new.customer_id === user?.id;
          }

          if (isRelevant) {
            // Refresh orders
            await fetchData();

            // Add notification for status change
            if (payload.new.status !== payload.old?.status) {
              const notification: Notification = {
                id: `notif-${Date.now()}`,
                title: 'Order Status Updated',
                message: `Order #${payload.new.id.slice(-8)} is now ${payload.new.status.replace('_', ' ')}`,
                order_id: payload.new.id,
                is_read: false,
                created_at: new Date().toISOString(),
                type: 'order_update'
              };

              setNotifications(prev => [notification, ...prev]);
              
              // Show toast notification
              toast.success(`Order status updated: ${payload.new.status.replace('_', ' ')}`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.role, manufacturerProfile?.id, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    toast.success('Signed out successfully');
  };

  const handleRefresh = () => {
    fetchData();
    toast.success('Refreshing data...');
  };

  const handleFileComplaint = async () => {
    if (!complaintText.trim() || !complaintModal.orderId) {
      toast.error('Please enter complaint details');
      return;
    }

    try {
      const { error } = await supabase
        .from('complaints')
        .insert({
          order_id: complaintModal.orderId,
          from_user_id: user?.id,
          to_user_id: profile?.role === 'manufacturer' 
            ? orders.find(o => o.id === complaintModal.orderId)?.customer_id
            : orders.find(o => o.id === complaintModal.orderId)?.manufacturer_id,
          subject: `Complaint for Order: ${complaintModal.orderId}`,
          message: complaintText,
          status: 'open',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setComplaintModal({ isOpen: false });
      setComplaintText('');
      
      toast.success('Complaint filed successfully! Platform admin will review your concern.');
      
    } catch (error) {
      console.error('Error filing complaint:', error);
      toast.error('Failed to file complaint. Please try again.');
    }
  };

  // const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
  //   try {
  //     const { error } = await supabase
  //       .from('orders')
  //       .update({
  //         status: newStatus,
  //         updated_at: new Date().toISOString()
  //       })
  //       .eq('id', orderId);

  //     if (error) throw error;

  //     toast.success(`Order status updated to ${newStatus.replace('_', ' ')}!`);

      
  //   } catch (error) {
  //     console.error('Error updating order status:', error);
  //     toast.error('Failed to update order status');
  //   }
  // };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) throw error;

    // Update the order in local state
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      )
    );

    // Also update stats if needed
    setStats(prevStats => {
      if (newStatus === 'delivered') {
        return {
          ...prevStats,
          completedOrders: prevStats.completedOrders + 1,
          pendingOrders: Math.max(0, prevStats.pendingOrders - 1)
        };
      } else if (newStatus === 'cancelled' || newStatus === 'declined') {
        return {
          ...prevStats,
          cancelledOrders: prevStats.cancelledOrders + 1,
          pendingOrders: Math.max(0, prevStats.pendingOrders - 1)
        };
      } else if (newStatus === 'processing' || newStatus === 'shipped') {
        // Check if coming from awaiting_verification
        const order = orders.find(o => o.id === orderId);
        if (order?.status === 'awaiting_verification') {
          return {
            ...prevStats,
            pendingOrders: prevStats.pendingOrders + 1
          };
        }
      }
      return prevStats;
    });

    // Add a notification for the status change
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      title: 'Order Status Updated',
      message: `Order #${orderId.slice(-8)} is now ${newStatus.replace('_', ' ')}`,
      order_id: orderId,
      is_read: false,
      created_at: new Date().toISOString(),
      type: 'order_update'
    };
    
    setNotifications(prev => [notification, ...prev]);

    toast.success(`Order status updated to ${newStatus.replace('_', ' ')}!`);

  } catch (error) {
    console.error('Error updating order status:', error);
    toast.error('Failed to update order status');
  }
};

  const handleRateCustomer = (customerId: string, customerName: string) => {
    // This would open a rating modal in a real app
    toast.success(`Rating modal would open for ${customerName}`);
  };

  const handleDownloadInvoice = (order: Order) => {
    // Generate invoice data
    const invoiceData = {
      orderId: order.id,
      date: new Date(order.created_at).toLocaleDateString(),
      customerName: profile?.role === 'manufacturer' ? order.customer?.name : profile?.name,
      manufacturerName: order.manufacturer?.company_name || manufacturerProfile?.company_name,
      items: order.items,
      total: order.total_amount,
      status: order.status,
      role: profile?.role
    };

    // Create and download invoice
    const invoiceText = `
      DIRECTSOURCE ${profile?.role === 'manufacturer' ? 'MANUFACTURER' : 'CUSTOMER'} INVOICE
      ${'='.repeat(50)}
      Order ID: ${invoiceData.orderId}
      Date: ${invoiceData.date}
      ${profile?.role === 'manufacturer' ? 'Customer' : 'Manufacturer'}: ${profile?.role === 'manufacturer' ? invoiceData.customerName : invoiceData.manufacturerName}
      ${profile?.role === 'manufacturer' ? 'Manufacturer' : 'Customer'}: ${profile?.role === 'manufacturer' ? invoiceData.manufacturerName : invoiceData.customerName}
      
      Items:
      ${invoiceData.items?.map(item => `  • ${item.name} (x${item.quantity}) - $${item.price * item.quantity}`).join('\n') || 'No items'}
      
      Total: $${invoiceData.total}
      Status: ${invoiceData.status.toUpperCase()}
      
      Thank you for choosing DirectSource!
    `;

    const blob = new Blob([invoiceText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${order.id}.txt`;
    a.click();
    
    toast.success('Invoice downloaded!');
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-blue-500" />;
      case 'processing':
        return <Package className="w-5 h-5 text-amber-500" />;
      case 'awaiting_verification':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'declined':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'awaiting_verification':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserDisplayName = () => {
    if (profile?.role === 'manufacturer' && manufacturerProfile?.company_name) {
      return manufacturerProfile.company_name;
    }
    return profile?.name || user?.email?.split('@')[0] || 'User';
  };

  const isManufacturer = profile?.role === 'manufacturer';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserIcon className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Please Sign In</h2>
          <p className="text-slate-600 mb-8">You need to be signed in to view your profile.</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/auth')}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium mb-4 transition-colors"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </button>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black text-slate-900">My Profile</h1>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-slate-500">
              {isManufacturer ? 'Manage your manufacturing orders and factory' : 'Manage your direct sourcing orders and account'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* User Stats Card */}
        <div className={`bg-gradient-to-r ${isManufacturer ? 'from-blue-500 to-cyan-600' : 'from-indigo-500 to-purple-600'} rounded-3xl p-8 text-white mb-8`}>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
                {isManufacturer ? (
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                    {manufacturerProfile?.logo_url ? (
                      <img 
                        src={manufacturerProfile.logo_url} 
                        alt={manufacturerProfile.company_name}
                        className="w-full h-full rounded-2xl object-cover"
                      />
                    ) : (
                      <Building className="w-12 h-12" />
                    )}
                  </div>
                ) : profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.name}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  <UserIcon className="w-12 h-12" />
                )}
              </div>
              {unreadNotifications > 0 && (
                <div className="absolute -top-2 -right-2">
                  <div className="bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                    {unreadNotifications}
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{getUserDisplayName()}</h2>
                {isManufacturer && manufacturerProfile?.verification_status === 'verified' && (
                  <BadgeCheck className="w-6 h-6 text-yellow-300" />
                )}
              </div>
              <p className="text-white/80">{user.email}</p>
              {isManufacturer && manufacturerProfile?.location && (
                <p className="text-white/80 flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  {manufacturerProfile.location}
                </p>
              )}
              <div className="flex flex-wrap gap-6 mt-6">
                <div>
                  <div className="text-sm text-white/60">Member Since</div>
                  <div className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {user.created_at ? formatDate(user.created_at) : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-white/60">Total Orders</div>
                  <div className="text-lg font-bold flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    {stats.totalOrders}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-white/60">
                    {isManufacturer ? 'Total Earned' : 'Total Spent'}
                  </div>
                  <div className="text-lg font-bold flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    ${isManufacturer ? stats.totalEarned.toFixed(2) : stats.totalSpent.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-white/60">Success Rate</div>
                  <div className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {stats.totalOrders > 0 
                      ? `${Math.round((stats.completedOrders / stats.totalOrders) * 100)}%`
                      : '0%'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-8 bg-white rounded-2xl p-1">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 px-4 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 px-4 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'notifications'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            Alerts {unreadNotifications > 0 && `(${unreadNotifications})`}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 px-4 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'stats'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Stats
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8">
          {activeTab === 'orders' ? (
            orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {isManufacturer ? 'No Orders Yet' : 'No Orders Yet'}
                </h3>
                <p className="text-slate-600 mb-8">
                  {isManufacturer 
                    ? 'Orders from customers will appear here'
                    : 'Start sourcing directly from verified manufacturers!'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {!isManufacturer && (
                    <>
                      <button
                        onClick={() => router.push('/')}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                      >
                        Browse Products
                      </button>
                      <button
                        onClick={() => router.push('/manufacturers')}
                        className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                      >
                        Explore Factories
                      </button>
                    </>
                  )}
                  {isManufacturer && (
                    <button
                      onClick={() => router.push(`/manufacturer-dashboard/${user.id}`)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                    >
                      Go to Manufacturer Dashboard
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900">
                    {isManufacturer ? 'Manufacturing Orders' : 'Order History'}
                  </h3>
                  <div className="text-sm text-slate-500">
                    {stats.pendingOrders} pending • {stats.completedOrders} completed
                  </div>
                </div>

                {orders.map((order) => (
                  <div key={order.id} className="border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow" id={`order-${order.id}`}>
                    {/* Order Header */}
                    <div className="p-6 border-b border-slate-100 bg-slate-50">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(order.status)}
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                              {order.status.replace('_', ' ').toUpperCase()}
                            </span>
                            {!isManufacturer && order.manufacturer?.verification_status === 'verified' && (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                <Shield className="w-3 h-3 inline mr-1" />
                                VERIFIED
                              </span>
                            )}
                            {isManufacturer && (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                <Users className="w-3 h-3 inline mr-1" />
                                CUSTOMER ORDER
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-900">Order #{order.id.slice(-8)}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            {isManufacturer ? (
                              <>
                                {order.customer?.avatar_url ? (
                                  <img 
                                    src={order.customer.avatar_url} 
                                    alt={order.customer.name}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <UserIcon className="w-4 h-4 text-slate-400" />
                                )}
                                <span className="text-sm text-slate-600">
                                  {order.customer?.name || order.customer?.email || 'Customer'}
                                </span>
                                {order.customer?.email && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    <span className="text-sm text-slate-500">{order.customer.email}</span>
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                {order.manufacturer?.logo_url ? (
                                  <img 
                                    src={order.manufacturer.logo_url} 
                                    alt={order.manufacturer.company_name}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <Factory className="w-4 h-4 text-slate-400" />
                                )}
                                <span className="text-sm text-slate-600">
                                  {order.manufacturer?.company_name || 'Manufacturer'}
                                </span>
                                {order.manufacturer?.location && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    <span className="text-sm text-slate-500">{order.manufacturer.location}</span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-slate-900">${Number(order.total_amount).toFixed(2)}</div>
                          <div className="text-sm text-slate-500 flex items-center gap-1 justify-end mt-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(order.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="p-6">
                      <h4 className="font-bold text-slate-900 mb-4">Items ({order.items?.length || 0})</h4>
                      <div className="space-y-4">
                        {order.items?.map((item, index) => (
                          <div key={item.id || index} className="flex gap-4">
                            <img
                              src={item.imageUrl || '/placeholder.jpg'}
                              alt={item.name}
                              className="w-16 h-16 rounded-xl object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.jpg';
                              }}
                            />
                            <div className="flex-1">
                              <h5 className="font-bold text-slate-900">{item.name}</h5>
                              <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-1">
                                <span>Quantity: {item.quantity}</span>
                                <span>Price: ${item.price?.toFixed(2)} each</span>
                                <span>Category: {item.category}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-900">
                                ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order Footer */}
                      <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="text-sm text-slate-500">
                          <div className="flex items-center gap-2 mb-1">
                            <CreditCard className="w-4 h-4" />
                            Payment: {order.payment_method?.replace('_', ' ').toUpperCase() || 'N/A'}
                            {order.transaction_id && (
                              <span className="text-xs bg-slate-100 px-2 py-1 rounded">Ref: {order.transaction_id}</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            Last updated: {formatDate(order.updated_at)}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {isManufacturer ? (
                            // Manufacturer actions
                            <>
                              {order.status === 'awaiting_verification' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, 'processing')}
                                    className="px-3 py-2 bg-green-600 text-white text-sm font-bold hover:bg-green-700 rounded-xl transition-colors flex items-center gap-1"
                                  >
                                    <PackageCheck className="w-4 h-4" />
                                    Accept Order
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, 'declined')}
                                    className="px-3 py-2 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 rounded-xl transition-colors flex items-center gap-1"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Decline
                                  </button>
                                </>
                              )}
                              {order.status === 'processing' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                                  className="px-3 py-2 bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-1"
                                >
                                  <Truck className="w-4 h-4" />
                                  Mark as Shipped
                                </button>
                              )}
                              {order.status === 'shipped' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                  className="px-3 py-2 bg-green-600 text-white text-sm font-bold hover:bg-green-700 rounded-xl transition-colors flex items-center gap-1"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Mark Delivered
                                </button>
                              )}
                            </>
                          ) : (
                            // Customer actions
                            <>
                              {order.status === 'shipped' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                  className="px-3 py-2 bg-green-600 text-white text-sm font-bold hover:bg-green-700 rounded-xl transition-colors flex items-center gap-1"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Mark Delivered
                                </button>
                              )}
                              {order.status === 'delivered' && (
                                <button
                                  onClick={() => handleRateCustomer(order.manufacturer_id, order.manufacturer?.company_name || 'Manufacturer')}
                                  className="px-3 py-2 bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 rounded-xl transition-colors flex items-center gap-1"
                                >
                                  <Star className="w-4 h-4" />
                                  Rate Experience
                                </button>
                              )}
                            </>
                          )}
                          
                          <button
                            onClick={() => handleDownloadInvoice(order)}
                            className="px-3 py-2 bg-blue-50 text-blue-600 text-sm font-bold hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Invoice
                          </button>
                          <button
                            onClick={() => setComplaintModal({
                              isOpen: true,
                              orderId: order.id,
                              manufacturerName: isManufacturer ? order.customer?.name : order.manufacturer?.company_name
                            })}
                            className="px-3 py-2 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 rounded-xl transition-colors flex items-center gap-1"
                          >
                            <AlertCircle className="w-4 h-4" />
                            Report Issue
                          </button>
                          {!isManufacturer && order.manufacturer_id && (
                            <button
                              onClick={() => router.push(`/manufacturer-products/${order.manufacturer_id}`)}
                              className="px-3 py-2 bg-slate-50 text-slate-700 text-sm font-bold hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Store
                            </button>
                          )}
                          {isManufacturer && order.customer_id && (
                            <button
                              onClick={() => handleRateCustomer(order.customer_id, order.customer?.name || 'Customer')}
                              className="px-3 py-2 bg-purple-50 text-purple-600 text-sm font-bold hover:bg-purple-100 rounded-xl transition-colors flex items-center gap-1"
                            >
                              <Star className="w-4 h-4" />
                              Rate Customer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'notifications' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Notifications</h3>
                <button
                  onClick={() => {
                    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                    toast.success('All notifications marked as read');
                  }}
                  className="text-sm text-indigo-600 font-bold hover:text-indigo-800"
                >
                  Mark all as read
                </button>
              </div>
              
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-slate-900 mb-2">No notifications</h4>
                  <p className="text-slate-600">You'll get notified here about order updates</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      onClick={() => handleMarkNotificationRead(notification.id)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${
                        !notification.is_read
                          ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          notification.type === 'order_update' ? 'bg-green-100 text-green-600' :
                          notification.type === 'payment_update' ? 'bg-blue-100 text-blue-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {notification.type === 'order_update' ? (
                            <Package className="w-4 h-4" />
                          ) : notification.type === 'payment_update' ? (
                            <CreditCard className="w-4 h-4" />
                          ) : (
                            <Bell className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="font-bold text-slate-900">{notification.title}</p>
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            {formatDate(notification.created_at)}
                          </p>
                          {notification.order_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Scroll to the order
                                document.getElementById(`order-${notification.order_id}`)?.scrollIntoView({
                                  behavior: 'smooth'
                                });
                                setActiveTab('orders');
                              }}
                              className="text-xs text-indigo-600 font-bold hover:text-indigo-800 mt-2"
                            >
                              View Order
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'stats' ? (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-6">
                  {isManufacturer ? 'Manufacturing Statistics' : 'Sourcing Statistics'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                    <div className="text-3xl font-black text-blue-700 mb-2">
                      ${isManufacturer ? stats.totalEarned.toFixed(2) : stats.totalSpent.toFixed(2)}
                    </div>
                    <div className="text-sm font-bold text-blue-600">
                      {isManufacturer ? 'Total Earned' : 'Total Spent'}
                    </div>
                    <div className="text-xs text-blue-500 mt-1">All-time {isManufacturer ? 'earnings' : 'sourcing'}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                    <div className="text-3xl font-black text-green-700 mb-2">{stats.totalOrders}</div>
                    <div className="text-sm font-bold text-green-600">Total Orders</div>
                    <div className="text-xs text-green-500 mt-1">{stats.completedOrders} completed</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
                    <div className="text-3xl font-black text-amber-700 mb-2">{stats.pendingOrders}</div>
                    <div className="text-sm font-bold text-amber-600">Pending Orders</div>
                    <div className="text-xs text-amber-500 mt-1">In production/shipping</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                    <div className="text-3xl font-black text-purple-700 mb-2">
                      {stats.totalOrders > 0 
                        ? `${Math.round((stats.completedOrders / stats.totalOrders) * 100)}%`
                        : '0%'
                      }
                    </div>
                    <div className="text-sm font-bold text-purple-600">Success Rate</div>
                    <div className="text-xs text-purple-500 mt-1">Order completion</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-4">
                  {isManufacturer ? 'Customer History' : 'Manufacturer History'}
                </h4>
                <div className="space-y-4">
                  {isManufacturer ? (
                    // Manufacturer view: Show customers
                    Array.from(new Set(orders.map(o => o.customer_id))).filter(Boolean).map((customerId, index) => {
                      const customerOrders = orders.filter(o => o.customer_id === customerId);
                      const customer = customerOrders[0]?.customer;
                      const totalSpent = customerOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{customer?.name || customer?.email || 'Customer'}</div>
                              <div className="text-sm text-slate-500">
                                {customerOrders.length} orders • ${totalSpent.toFixed(2)} spent
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRateCustomer(customerId!, customer?.name || 'Customer')}
                              className="px-3 py-2 bg-amber-50 text-amber-600 text-sm font-bold hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-1"
                            >
                              <Star className="w-3 h-3" />
                              Rate
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Customer view: Show manufacturers
                    Array.from(new Set(orders.map(o => o.manufacturer?.company_name))).filter(Boolean).map((manufacturer, index) => {
                      const manufacturerOrders = orders.filter(o => o.manufacturer?.company_name === manufacturer);
                      const manufacturerId = manufacturerOrders[0]?.manufacturer_id;
                      const totalSpent = manufacturerOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <Factory className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{manufacturer}</div>
                              <div className="text-sm text-slate-500">
                                {manufacturerOrders.length} orders • ${totalSpent.toFixed(2)} spent
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => router.push(`/manufacturer-products/${manufacturerId}`)}
                              className="px-3 py-2 bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Store
                            </button>
                            <button
                              onClick={() => handleRateCustomer(manufacturerId!, manufacturer!)}
                              className="px-3 py-2 bg-amber-50 text-amber-600 text-sm font-bold hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-1"
                            >
                              <Star className="w-3 h-3" />
                              Rate
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-4">Order Status Distribution</h4>
                <div className="space-y-3">
                  {['awaiting_verification', 'processing', 'shipped', 'delivered', 'cancelled', 'declined'].map(status => {
                    const count = orders.filter(o => o.status === status).length;
                    const percentage = orders.length > 0 ? (count / orders.length) * 100 : 0;
                    
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status)}
                          <span className="text-sm font-medium text-slate-700 capitalize">
                            {status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-slate-200 rounded-full h-2">
                            <div 
                              className={`h-full rounded-full ${
                                status === 'delivered' ? 'bg-green-500' :
                                status === 'shipped' ? 'bg-blue-500' :
                                status === 'processing' ? 'bg-amber-500' :
                                status === 'awaiting_verification' ? 'bg-orange-500' :
                                status === 'declined' ? 'bg-red-500' :
                                'bg-slate-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold text-slate-900 w-8 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-6">Account Information</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={profile?.name || ''}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
                    />
                    <p className="text-slate-500 text-sm mt-1">Contact support to update your name</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={user.email}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">Account Type</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={profile?.role?.toUpperCase() || 'CUSTOMER'}
                        readOnly
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 uppercase font-bold"
                      />
                      {isManufacturer && (
                        <button
                          onClick={() => router.push(`/manufacturer-dashboard/${user.id}`)}
                          className="px-4 py-3 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2"
                        >
                          <Factory className="w-4 h-4" />
                          Factory Dashboard
                        </button>
                      )}
                    </div>
                  </div>

                  {isManufacturer && manufacturerProfile && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">Company Name</label>
                        <input
                          type="text"
                          value={manufacturerProfile.company_name}
                          readOnly
                          className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">Location</label>
                        <input
                          type="text"
                          value={manufacturerProfile.location || 'Not specified'}
                          readOnly
                          className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">Verification Status</label>
                        <div className={`px-4 py-3 rounded-xl border font-bold flex items-center gap-2 ${
                          manufacturerProfile.verification_status === 'verified'
                            ? 'bg-green-50 text-green-800 border-green-200'
                            : manufacturerProfile.verification_status === 'pending'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-50 text-slate-800 border-slate-200'
                        }`}>
                          {manufacturerProfile.verification_status === 'verified' && <BadgeCheck className="w-5 h-5" />}
                          {manufacturerProfile.verification_status?.toUpperCase() || 'UNVERIFIED'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {isManufacturer && (
                <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-100">
                  <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Factory className="w-5 h-5" />
                    Manufacturer Account
                  </h4>
                  <p className="text-blue-700 text-sm mb-4">
                    You have manufacturer dashboard access. Manage your factory profile, products, and orders.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => router.push(`/manufacturer-dashboard/${user.id}`)}
                      className="px-4 py-2 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Factory className="w-4 h-4" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => router.push(`/manufacturer-products/${user.id}`)}
                      className="px-4 py-2 bg-white text-blue-600 font-bold hover:bg-blue-50 rounded-xl border border-blue-200 transition-colors flex items-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      My Products
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                  <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Need Help?
                  </h4>
                  <p className="text-blue-700 text-sm mb-4">
                    Having issues with an order? Get support from our team.
                  </p>
                  <button
                    onClick={() => setComplaintModal({ isOpen: true })}
                    className="px-4 py-2 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-xl transition-colors"
                  >
                    Contact Support
                  </button>
                </div>

                <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                  <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Account Actions
                  </h4>
                  <p className="text-red-700 text-sm mb-4">
                    These actions are permanent and cannot be undone.
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl transition-colors"
                  >
                    Sign Out of All Devices
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Complaint Modal */}
      {complaintModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setComplaintModal({ isOpen: false })}
          />
          <div className="relative bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">File a Complaint</h3>
                {complaintModal.manufacturerName && (
                  <p className="text-sm text-slate-500">
                    Regarding: {complaintModal.manufacturerName}
                  </p>
                )}
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              {complaintModal.orderId && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Order ID</label>
                  <input
                    type="text"
                    value={complaintModal.orderId || ''}
                    readOnly
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Issue Details</label>
                <textarea
                  value={complaintText}
                  onChange={e => setComplaintText(e.target.value)}
                  className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                  placeholder="Describe the issue in detail. Include specific problems, dates, and any relevant information..."
                />
                <p className="text-xs text-slate-500 mt-1">Platform admin will review your complaint within 24 hours.</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleFileComplaint}
                disabled={!complaintText.trim()}
                className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                  complaintText.trim()
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Submit Complaint
              </button>
              <button
                onClick={() => setComplaintModal({ isOpen: false })}
                className="px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

// 'use client'

// import React, { useEffect, useState } from 'react';
// import { supabase } from '@/lib/supabase';
// import { useRouter } from 'next/navigation';
// import { 
//   Package, 
//   Truck, 
//   CheckCircle, 
//   Clock, 
//   Home, 
//   LogOut,
//   User as UserIcon,
//   Calendar,
//   DollarSign,
//   ShoppingBag,
//   Settings,
//   CreditCard,
//   MapPin,
//   Factory,
//   AlertCircle,
//   Shield,
//   TrendingUp,
//   ChevronRight,
//   Star,
//   FileText,
//   HelpCircle,
//   MessageSquare,
//   Eye,
//   Download,
//   RefreshCw,
//   Archive,
//   Bell,
//   ExternalLink
// } from 'lucide-react';
// import toast from 'react-hot-toast';

// interface Order {
//   id: string;
//   customer_id: string;
//   manufacturer_id: string;
//   manufacturer?: {
//     company_name: string;
//     logo_url: string;
//     location: string;
//     verification_status: string;
//   };
//   items: Array<{
//     id: string;
//     name: string;
//     price: number;
//     quantity: number;
//     imageUrl: string;
//     category: string;
//   }>;
//   total_amount: number;
//   status: 'awaiting_verification' | 'processing' | 'shipped' | 'delivered' | 'declined' | 'cancelled';
//   payment_method: string;
//   transaction_id?: string;
//   account_name?: string;
//   created_at: string;
//   updated_at: string;
// }

// interface Notification {
//   id: string;
//   title: string;
//   message: string;
//   order_id?: string;
//   is_read: boolean;
//   created_at: string;
//   type: 'order_update' | 'payment_update' | 'general';
// }

// const ProfilePage: React.FC = () => {
//   const router = useRouter();
//   const [user, setUser] = useState<any>(null);
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [notifications, setNotifications] = useState<Notification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [activeTab, setActiveTab] = useState<'orders' | 'settings' | 'stats' | 'notifications'>('orders');
//   const [complaintModal, setComplaintModal] = useState<{
//     isOpen: boolean;
//     orderId?: string;
//     manufacturerName?: string;
//   }>({ isOpen: false });
//   const [complaintText, setComplaintText] = useState('');
//   const [stats, setStats] = useState({
//     totalSpent: 0,
//     totalOrders: 0,
//     completedOrders: 0,
//     pendingOrders: 0,
//     refunds: 0
//   });

//   // Fetch user data, orders, and notifications
//   const fetchData = async () => {
//     try {
//       setRefreshing(true);
      
//       // Get current authenticated user
//       const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
//       if (authError || !authUser) {
//         router.push('/auth');
//         return;
//       }

//       // Fetch user profile from profiles table
//       const { data: profileData } = await supabase
//         .from('profiles')
//         .select('*')
//         .eq('id', authUser.id)
//         .single();

//       if (profileData) {
//         setUser({
//           id: profileData.id,
//           email: profileData.email,
//           name: profileData.full_name || profileData.email?.split('@')[0] || 'User',
//           avatar_url: profileData.avatar_url,
//           created_at: profileData.created_at,
//           role: profileData.role || 'customer'
//         });
//       } else {
//         // If no profile exists, create basic user object from auth
//         setUser({
//           id: authUser.id,
//           email: authUser.email,
//           name: authUser.email?.split('@')[0] || 'User',
//           created_at: authUser.created_at,
//           role: 'customer'
//         });
//       }

//       // Fetch user's orders with manufacturer info
//       const { data: ordersData, error: ordersError } = await supabase
//         .from('orders')
//         .select(`
//           *,
//           manufacturers (
//             company_name,
//             logo_url,
//             location,
//             verification_status
//           )
//         `)
//         .eq('customer_id', authUser.id)
//         .order('created_at', { ascending: false });

//       if (!ordersError && ordersData) {
//         setOrders(ordersData as Order[]);
        
//         // Calculate statistics
//         const totalSpent = ordersData.reduce((sum: number, order: any) => 
//           sum + Number(order.total_amount || 0), 0);
//         const totalOrders = ordersData.length;
//         const completedOrders = ordersData.filter((order: any) => 
//           ['delivered'].includes(order.status)).length;
//         const pendingOrders = ordersData.filter((order: any) => 
//           ['awaiting_verification', 'processing', 'shipped'].includes(order.status)).length;
//         const refunds = ordersData.filter((order: any) => 
//           ['cancelled', 'declined'].includes(order.status)).length;
        
//         setStats({
//           totalSpent,
//           totalOrders,
//           completedOrders,
//           pendingOrders,
//           refunds
//         });
//       }

//       // Fetch user notifications
//       const { data: notificationData, error: notificationError } = await supabase
//         .from('notifications')
//         .select('*')
//         .eq('user_id', authUser.id)
//         .order('created_at', { ascending: false })
//         .limit(20);

//       if (!notificationError && notificationData) {
//         setNotifications(notificationData);
//       }

//     } catch (error) {
//       console.error('Error fetching profile data:', error);
//       toast.error('Failed to load profile data');
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     fetchData();

//     // Set up real-time subscription for order updates
//     const channel = supabase
//       .channel('user_orders')
//       .on(
//         'postgres_changes',
//         {
//           event: 'UPDATE',
//           schema: 'public',
//           table: 'orders',
//           filter: `customer_id=eq.${user?.id}`
//         },
//         (payload) => {
//           // Update order status in real-time
//           setOrders(prev =>
//             prev.map(order => 
//               order.id === payload.new.id ? { ...order, ...payload.new } : order
//             )
//           );

//           // Add notification for status change
//           if (payload.new.status !== payload.old.status) {
//             const notification: Notification = {
//               id: `notif-${Date.now()}`,
//               title: 'Order Status Updated',
//               message: `Order #${payload.new.id.slice(-8)} is now ${payload.new.status.replace('_', ' ')}`,
//               order_id: payload.new.id,
//               is_read: false,
//               created_at: new Date().toISOString(),
//               type: 'order_update'
//             };

//             setNotifications(prev => [notification, ...prev]);
            
//             // Show toast notification
//             toast.success(`Order status updated: ${payload.new.status.replace('_', ' ')}`);
//           }
//         }
//       )
//       .subscribe();

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [user?.id, router]);

//   const handleSignOut = async () => {
//     await supabase.auth.signOut();
//     router.push('/');
//     toast.success('Signed out successfully');
//   };

//   const handleRefresh = () => {
//     fetchData();
//     toast.success('Refreshing data...');
//   };

//   const handleFileComplaint = async () => {
//     if (!complaintText.trim() || !complaintModal.orderId) {
//       toast.error('Please enter complaint details');
//       return;
//     }

//     try {
//       const { error } = await supabase
//         .from('complaints')
//         .insert({
//           order_id: complaintModal.orderId,
//           from_user_id: user?.id,
//           to_user_id: orders.find(o => o.id === complaintModal.orderId)?.manufacturer_id,
//           subject: `Complaint for Order: ${complaintModal.orderId}`,
//           message: complaintText,
//           status: 'open',
//           created_at: new Date().toISOString()
//         });

//       if (error) throw error;

//       setComplaintModal({ isOpen: false });
//       setComplaintText('');
      
//       toast.success('Complaint filed successfully! Platform admin will review your concern.');
      
//     } catch (error) {
//       console.error('Error filing complaint:', error);
//       toast.error('Failed to file complaint. Please try again.');
//     }
//   };

//   const handleMarkAsDelivered = async (orderId: string) => {
//     try {
//       const { error } = await supabase
//         .from('orders')
//         .update({
//           status: 'delivered',
//           updated_at: new Date().toISOString()
//         })
//         .eq('id', orderId);

//       if (error) throw error;

//       toast.success('Order marked as delivered!');
      
//     } catch (error) {
//       console.error('Error marking as delivered:', error);
//       toast.error('Failed to update order status');
//     }
//   };

//   const handleRateManufacturer = (manufacturerId: string, manufacturerName: string) => {
//     // This would open a rating modal in a real app
//     toast.success(`Rating modal would open for ${manufacturerName}`);
//   };

//   const handleDownloadInvoice = (order: Order) => {
//     // Generate invoice data
//     const invoiceData = {
//       orderId: order.id,
//       date: new Date(order.created_at).toLocaleDateString(),
//       customerName: user?.name,
//       manufacturerName: order.manufacturer?.company_name,
//       items: order.items,
//       total: order.total_amount,
//       status: order.status
//     };

//     // Create and download invoice
//     const invoiceText = `
//       DIRECTSOURCE INVOICE
//       --------------------
//       Order ID: ${invoiceData.orderId}
//       Date: ${invoiceData.date}
//       Customer: ${invoiceData.customerName}
//       Manufacturer: ${invoiceData.manufacturerName}
      
//       Items:
//       ${invoiceData.items.map(item => `  • ${item.name} (x${item.quantity}) - $${item.price * item.quantity}`).join('\n')}
      
//       Total: $${invoiceData.total}
//       Status: ${invoiceData.status.toUpperCase()}
      
//       Thank you for choosing DirectSource!
//     `;

//     const blob = new Blob([invoiceText], { type: 'text/plain' });
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `invoice-${order.id}.txt`;
//     a.click();
    
//     toast.success('Invoice downloaded!');
//   };

//   const handleMarkNotificationRead = async (notificationId: string) => {
//     try {
//       await supabase
//         .from('notifications')
//         .update({ is_read: true })
//         .eq('id', notificationId);

//       setNotifications(prev =>
//         prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
//       );
//     } catch (error) {
//       console.error('Error marking notification read:', error);
//     }
//   };

//   const unreadNotifications = notifications.filter(n => !n.is_read).length;

//   const getStatusIcon = (status: string) => {
//     switch (status) {
//       case 'delivered':
//         return <CheckCircle className="w-5 h-5 text-green-500" />;
//       case 'shipped':
//         return <Truck className="w-5 h-5 text-blue-500" />;
//       case 'processing':
//         return <Package className="w-5 h-5 text-amber-500" />;
//       case 'awaiting_verification':
//         return <Clock className="w-5 h-5 text-orange-500" />;
//       case 'declined':
//       case 'cancelled':
//         return <AlertCircle className="w-5 h-5 text-red-500" />;
//       default:
//         return <Clock className="w-5 h-5 text-slate-500" />;
//     }
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'delivered':
//         return 'bg-green-100 text-green-800 border-green-200';
//       case 'shipped':
//         return 'bg-blue-100 text-blue-800 border-blue-200';
//       case 'processing':
//         return 'bg-amber-100 text-amber-800 border-amber-200';
//       case 'awaiting_verification':
//         return 'bg-orange-100 text-orange-800 border-orange-200';
//       case 'declined':
//         return 'bg-red-100 text-red-800 border-red-200';
//       case 'cancelled':
//         return 'bg-slate-100 text-slate-800 border-slate-200';
//       default:
//         return 'bg-slate-100 text-slate-800 border-slate-200';
//     }
//   };

//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString('en-US', {
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
//           <p className="text-slate-600 text-lg font-medium">Loading your profile...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!user) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center max-w-md mx-auto p-8">
//           <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
//             <UserIcon className="w-10 h-10 text-slate-400" />
//           </div>
//           <h2 className="text-2xl font-bold text-slate-900 mb-4">Please Sign In</h2>
//           <p className="text-slate-600 mb-8">You need to be signed in to view your profile.</p>
//           <div className="space-y-3">
//             <button
//               onClick={() => router.push('/auth')}
//               className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
//             >
//               Sign In
//             </button>
//             <button
//               onClick={() => router.push('/')}
//               className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
//             >
//               Back to Home
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
//       {/* Header */}
//       <div className="max-w-7xl mx-auto px-4 py-8">
//         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
//           <div>
//             <button
//               onClick={() => router.push('/')}
//               className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium mb-4 transition-colors"
//             >
//               <Home className="w-4 h-4" />
//               Back to Home
//             </button>
//             <div className="flex items-center gap-4">
//               <h1 className="text-4xl font-black text-slate-900">My Profile</h1>
//               <button
//                 onClick={handleRefresh}
//                 disabled={refreshing}
//                 className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
//                 title="Refresh data"
//               >
//                 <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
//               </button>
//             </div>
//             <p className="text-slate-500">Manage your direct sourcing orders and account</p>
//           </div>
//           <div className="flex gap-3">
//             <button
//               onClick={() => router.push('/')}
//               className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
//             >
//               <Home className="w-4 h-4" />
//               Home
//             </button>
//             <button
//               onClick={handleSignOut}
//               className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
//             >
//               <LogOut className="w-4 h-4" />
//               Sign Out
//             </button>
//           </div>
//         </div>

//         {/* User Stats Card */}
//         <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-8 text-white mb-8">
//           <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
//             <div className="relative">
//               <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
//                 {user.avatar_url ? (
//                   <img 
//                     src={user.avatar_url} 
//                     alt={user.name}
//                     className="w-full h-full rounded-2xl object-cover"
//                   />
//                 ) : (
//                   <UserIcon className="w-12 h-12" />
//                 )}
//               </div>
//               {unreadNotifications > 0 && (
//                 <div className="absolute -top-2 -right-2">
//                   <div className="bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
//                     {unreadNotifications}
//                   </div>
//                 </div>
//               )}
//             </div>
//             <div className="flex-1">
//               <h2 className="text-2xl font-bold mb-2">{user.name}</h2>
//               <p className="text-white/80">{user.email}</p>
//               <div className="flex flex-wrap gap-6 mt-6">
//                 <div>
//                   <div className="text-sm text-white/60">Member Since</div>
//                   <div className="text-lg font-bold flex items-center gap-2">
//                     <Calendar className="w-4 h-4" />
//                     {formatDate(user.created_at)}
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-sm text-white/60">Total Orders</div>
//                   <div className="text-lg font-bold flex items-center gap-2">
//                     <ShoppingBag className="w-4 h-4" />
//                     {stats.totalOrders}
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-sm text-white/60">Total Spent</div>
//                   <div className="text-lg font-bold flex items-center gap-2">
//                     <DollarSign className="w-4 h-4" />
//                     ${stats.totalSpent.toFixed(2)}
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-sm text-white/60">Success Rate</div>
//                   <div className="text-lg font-bold flex items-center gap-2">
//                     <TrendingUp className="w-4 h-4" />
//                     {stats.totalOrders > 0 
//                       ? `${Math.round((stats.completedOrders / stats.totalOrders) * 100)}%`
//                       : '0%'
//                     }
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Tabs */}
//         <div className="flex border-b border-slate-200 mb-8 bg-white rounded-2xl p-1">
//           <button
//             onClick={() => setActiveTab('orders')}
//             className={`flex-1 px-4 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
//               activeTab === 'orders'
//                 ? 'bg-indigo-600 text-white shadow-lg'
//                 : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
//             }`}
//           >
//             <Package className="w-4 h-4" />
//             Orders ({orders.length})
//           </button>
//           <button
//             onClick={() => setActiveTab('notifications')}
//             className={`flex-1 px-4 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
//               activeTab === 'notifications'
//                 ? 'bg-indigo-600 text-white shadow-lg'
//                 : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
//             }`}
//           >
//             <Bell className="w-4 h-4" />
//             Alerts {unreadNotifications > 0 && `(${unreadNotifications})`}
//           </button>
//           <button
//             onClick={() => setActiveTab('stats')}
//             className={`flex-1 px-4 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
//               activeTab === 'stats'
//                 ? 'bg-indigo-600 text-white shadow-lg'
//                 : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
//             }`}
//           >
//             <TrendingUp className="w-4 h-4" />
//             Stats
//           </button>
//           <button
//             onClick={() => setActiveTab('settings')}
//             className={`flex-1 px-4 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
//               activeTab === 'settings'
//                 ? 'bg-indigo-600 text-white shadow-lg'
//                 : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
//             }`}
//           >
//             <Settings className="w-4 h-4" />
//             Settings
//           </button>
//         </div>

//         {/* Content Area */}
//         <div className="bg-white rounded-3xl border border-slate-200 p-8">
//           {activeTab === 'orders' ? (
//             orders.length === 0 ? (
//               <div className="text-center py-12">
//                 <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
//                 <h3 className="text-xl font-bold text-slate-900 mb-2">No Orders Yet</h3>
//                 <p className="text-slate-600 mb-8">Start sourcing directly from verified manufacturers!</p>
//                 <div className="flex flex-col sm:flex-row gap-3 justify-center">
//                   <button
//                     onClick={() => router.push('/')}
//                     className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
//                   >
//                     Browse Products
//                   </button>
//                   <button
//                     onClick={() => router.push('/manufacturers')}
//                     className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
//                   >
//                     Explore Factories
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <div className="space-y-6">
//                 <div className="flex justify-between items-center mb-4">
//                   <h3 className="text-xl font-bold text-slate-900">Order History</h3>
//                   <div className="text-sm text-slate-500">
//                     {stats.pendingOrders} pending • {stats.completedOrders} completed
//                   </div>
//                 </div>

//                 {orders.map((order) => (
//                   <div key={order.id} className="border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
//                     {/* Order Header */}
//                     <div className="p-6 border-b border-slate-100 bg-slate-50">
//                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
//                         <div>
//                           <div className="flex items-center gap-3 mb-2">
//                             {getStatusIcon(order.status)}
//                             <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
//                               {order.status.replace('_', ' ').toUpperCase()}
//                             </span>
//                             {order.manufacturer?.verification_status === 'verified' && (
//                               <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
//                                 <Shield className="w-3 h-3 inline mr-1" />
//                                 VERIFIED
//                               </span>
//                             )}
//                           </div>
//                           <h3 className="font-bold text-slate-900">Order #{order.id.slice(-8)}</h3>
//                           <div className="flex items-center gap-2 mt-2">
//                             {order.manufacturer?.logo_url ? (
//                               <img 
//                                 src={order.manufacturer.logo_url} 
//                                 alt={order.manufacturer.company_name}
//                                 className="w-6 h-6 rounded-full object-cover"
//                               />
//                             ) : (
//                               <Factory className="w-4 h-4 text-slate-400" />
//                             )}
//                             <span className="text-sm text-slate-600">
//                               {order.manufacturer?.company_name || 'Manufacturer'}
//                             </span>
//                             {order.manufacturer?.location && (
//                               <>
//                                 <span className="text-slate-300">•</span>
//                                 <MapPin className="w-3 h-3 text-slate-400" />
//                                 <span className="text-sm text-slate-500">{order.manufacturer.location}</span>
//                               </>
//                             )}
//                           </div>
//                         </div>
//                         <div className="text-right">
//                           <div className="text-2xl font-black text-slate-900">${Number(order.total_amount).toFixed(2)}</div>
//                           <div className="text-sm text-slate-500 flex items-center gap-1 justify-end mt-1">
//                             <Calendar className="w-3 h-3" />
//                             {formatDate(order.created_at)}
//                           </div>
//                         </div>
//                       </div>
//                     </div>

//                     {/* Order Items */}
//                     <div className="p-6">
//                       <h4 className="font-bold text-slate-900 mb-4">Items ({order.items?.length || 0})</h4>
//                       <div className="space-y-4">
//                         {order.items?.map((item, index) => (
//                           <div key={item.id || index} className="flex gap-4">
//                             <img
//                               src={item.imageUrl || '/placeholder.jpg'}
//                               alt={item.name}
//                               className="w-16 h-16 rounded-xl object-cover"
//                               onError={(e) => {
//                                 e.currentTarget.src = '/placeholder.jpg';
//                               }}
//                             />
//                             <div className="flex-1">
//                               <h5 className="font-bold text-slate-900">{item.name}</h5>
//                               <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-1">
//                                 <span>Quantity: {item.quantity}</span>
//                                 <span>Price: ${item.price?.toFixed(2)} each</span>
//                                 <span>Category: {item.category}</span>
//                               </div>
//                             </div>
//                             <div className="text-right">
//                               <div className="font-bold text-slate-900">
//                                 ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
//                               </div>
//                             </div>
//                           </div>
//                         ))}
//                       </div>

//                       {/* Order Footer */}
//                       <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
//                         <div className="text-sm text-slate-500">
//                           <div className="flex items-center gap-2 mb-1">
//                             <CreditCard className="w-4 h-4" />
//                             Payment: {order.payment_method?.replace('_', ' ').toUpperCase() || 'N/A'}
//                             {order.transaction_id && (
//                               <span className="text-xs bg-slate-100 px-2 py-1 rounded">Ref: {order.transaction_id}</span>
//                             )}
//                           </div>
//                           <div className="text-xs text-slate-400">
//                             Last updated: {formatDate(order.updated_at)}
//                           </div>
//                         </div>
//                         <div className="flex flex-wrap gap-2">
//                           {order.status === 'shipped' && (
//                             <button
//                               onClick={() => handleMarkAsDelivered(order.id)}
//                               className="px-3 py-2 bg-green-600 text-white text-sm font-bold hover:bg-green-700 rounded-xl transition-colors flex items-center gap-1"
//                             >
//                               <CheckCircle className="w-4 h-4" />
//                               Mark Delivered
//                             </button>
//                           )}
//                           {order.status === 'delivered' && (
//                             <button
//                               onClick={() => handleRateManufacturer(order.manufacturer_id, order.manufacturer?.company_name || 'Manufacturer')}
//                               className="px-3 py-2 bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 rounded-xl transition-colors flex items-center gap-1"
//                             >
//                               <Star className="w-4 h-4" />
//                               Rate Experience
//                             </button>
//                           )}
//                           <button
//                             onClick={() => handleDownloadInvoice(order)}
//                             className="px-3 py-2 bg-blue-50 text-blue-600 text-sm font-bold hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-1"
//                           >
//                             <Download className="w-4 h-4" />
//                             Invoice
//                           </button>
//                           <button
//                             onClick={() => setComplaintModal({
//                               isOpen: true,
//                               orderId: order.id,
//                               manufacturerName: order.manufacturer?.company_name
//                             })}
//                             className="px-3 py-2 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 rounded-xl transition-colors flex items-center gap-1"
//                           >
//                             <AlertCircle className="w-4 h-4" />
//                             Report Issue
//                           </button>
//                           <button
//                             onClick={() => router.push(`/manufacturer-products/${order.manufacturer_id}`)}
//                             className="px-3 py-2 bg-slate-50 text-slate-700 text-sm font-bold hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1"
//                           >
//                             <ExternalLink className="w-4 h-4" />
//                             View Store
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )
//           ) : activeTab === 'notifications' ? (
//             <div className="space-y-4">
//               <div className="flex justify-between items-center mb-6">
//                 <h3 className="text-xl font-bold text-slate-900">Notifications</h3>
//                 <button
//                   onClick={() => {
//                     setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
//                     toast.success('All notifications marked as read');
//                   }}
//                   className="text-sm text-indigo-600 font-bold hover:text-indigo-800"
//                 >
//                   Mark all as read
//                 </button>
//               </div>
              
//               {notifications.length === 0 ? (
//                 <div className="text-center py-12">
//                   <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
//                   <h4 className="text-lg font-bold text-slate-900 mb-2">No notifications</h4>
//                   <p className="text-slate-600">You'll get notified here about order updates</p>
//                 </div>
//               ) : (
//                 <div className="space-y-3">
//                   {notifications.map(notification => (
//                     <div
//                       key={notification.id}
//                       onClick={() => handleMarkNotificationRead(notification.id)}
//                       className={`p-4 border rounded-xl cursor-pointer transition-all ${
//                         !notification.is_read
//                           ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
//                           : 'bg-white border-slate-200 hover:bg-slate-50'
//                       }`}
//                     >
//                       <div className="flex items-start gap-3">
//                         <div className={`p-2 rounded-lg ${
//                           notification.type === 'order_update' ? 'bg-green-100 text-green-600' :
//                           notification.type === 'payment_update' ? 'bg-blue-100 text-blue-600' :
//                           'bg-slate-100 text-slate-600'
//                         }`}>
//                           {notification.type === 'order_update' ? (
//                             <Package className="w-4 h-4" />
//                           ) : notification.type === 'payment_update' ? (
//                             <CreditCard className="w-4 h-4" />
//                           ) : (
//                             <Bell className="w-4 h-4" />
//                           )}
//                         </div>
//                         <div className="flex-1">
//                           <div className="flex justify-between items-start">
//                             <p className="font-bold text-slate-900">{notification.title}</p>
//                             {!notification.is_read && (
//                               <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
//                             )}
//                           </div>
//                           <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
//                           <p className="text-xs text-slate-400 mt-2">
//                             {formatDate(notification.created_at)}
//                           </p>
//                           {notification.order_id && (
//                             <button
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 // Scroll to the order
//                                 document.getElementById(`order-${notification.order_id}`)?.scrollIntoView({
//                                   behavior: 'smooth'
//                                 });
//                               }}
//                               className="text-xs text-indigo-600 font-bold hover:text-indigo-800 mt-2"
//                             >
//                               View Order
//                             </button>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           ) : activeTab === 'stats' ? (
//             <div className="space-y-8">
//               <div>
//                 <h3 className="text-xl font-bold text-slate-900 mb-6">Sourcing Statistics</h3>
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                   <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
//                     <div className="text-3xl font-black text-blue-700 mb-2">${stats.totalSpent.toFixed(2)}</div>
//                     <div className="text-sm font-bold text-blue-600">Total Spent</div>
//                     <div className="text-xs text-blue-500 mt-1">All-time sourcing</div>
//                   </div>
//                   <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
//                     <div className="text-3xl font-black text-green-700 mb-2">{stats.totalOrders}</div>
//                     <div className="text-sm font-bold text-green-600">Total Orders</div>
//                     <div className="text-xs text-green-500 mt-1">{stats.completedOrders} completed</div>
//                   </div>
//                   <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
//                     <div className="text-3xl font-black text-amber-700 mb-2">{stats.pendingOrders}</div>
//                     <div className="text-sm font-bold text-amber-600">Pending Orders</div>
//                     <div className="text-xs text-amber-500 mt-1">In production/shipping</div>
//                   </div>
//                   <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
//                     <div className="text-3xl font-black text-purple-700 mb-2">
//                       {stats.totalOrders > 0 
//                         ? `${Math.round((stats.completedOrders / stats.totalOrders) * 100)}%`
//                         : '0%'
//                       }
//                     </div>
//                     <div className="text-sm font-bold text-purple-600">Success Rate</div>
//                     <div className="text-xs text-purple-500 mt-1">Order completion</div>
//                   </div>
//                 </div>
//               </div>

//               <div>
//                 <h4 className="font-bold text-slate-900 mb-4">Manufacturer History</h4>
//                 <div className="space-y-4">
//                   {Array.from(new Set(orders.map(o => o.manufacturer?.company_name))).filter(Boolean).map((manufacturer, index) => {
//                     const manufacturerOrders = orders.filter(o => o.manufacturer?.company_name === manufacturer);
//                     const manufacturerId = manufacturerOrders[0]?.manufacturer_id;
//                     const totalSpent = manufacturerOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
                    
//                     return (
//                       <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
//                         <div className="flex items-center gap-3">
//                           <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
//                             <Factory className="w-5 h-5 text-indigo-600" />
//                           </div>
//                           <div>
//                             <div className="font-bold text-slate-900">{manufacturer}</div>
//                             <div className="text-sm text-slate-500">
//                               {manufacturerOrders.length} orders • ${totalSpent.toFixed(2)} spent
//                             </div>
//                           </div>
//                         </div>
//                         <div className="flex gap-2">
//                           <button
//                             onClick={() => router.push(`/manufacturer-products/${manufacturerId}`)}
//                             className="px-3 py-2 bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1"
//                           >
//                             <ExternalLink className="w-3 h-3" />
//                             Store
//                           </button>
//                           <button
//                             onClick={() => handleRateManufacturer(manufacturerId!, manufacturer!)}
//                             className="px-3 py-2 bg-amber-50 text-amber-600 text-sm font-bold hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-1"
//                           >
//                             <Star className="w-3 h-3" />
//                             Rate
//                           </button>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>

//               <div>
//                 <h4 className="font-bold text-slate-900 mb-4">Order Status Distribution</h4>
//                 <div className="space-y-3">
//                   {['awaiting_verification', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => {
//                     const count = orders.filter(o => o.status === status).length;
//                     const percentage = orders.length > 0 ? (count / orders.length) * 100 : 0;
                    
//                     return (
//                       <div key={status} className="flex items-center justify-between">
//                         <div className="flex items-center gap-2">
//                           {getStatusIcon(status)}
//                           <span className="text-sm font-medium text-slate-700 capitalize">
//                             {status.replace('_', ' ')}
//                           </span>
//                         </div>
//                         <div className="flex items-center gap-3">
//                           <div className="w-32 bg-slate-200 rounded-full h-2">
//                             <div 
//                               className={`h-full rounded-full ${
//                                 status === 'delivered' ? 'bg-green-500' :
//                                 status === 'shipped' ? 'bg-blue-500' :
//                                 status === 'processing' ? 'bg-amber-500' :
//                                 status === 'awaiting_verification' ? 'bg-orange-500' :
//                                 'bg-red-500'
//                               }`}
//                               style={{ width: `${percentage}%` }}
//                             ></div>
//                           </div>
//                           <span className="text-sm font-bold text-slate-900 w-8 text-right">
//                             {count}
//                           </span>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             </div>
//           ) : (
//             <div className="space-y-8">
//               <div>
//                 <h3 className="text-xl font-bold text-slate-900 mb-6">Account Information</h3>
//                 <div className="space-y-6">
//                   <div>
//                     <label className="block text-sm font-bold text-slate-900 mb-2">Full Name</label>
//                     <input
//                       type="text"
//                       value={user.name}
//                       readOnly
//                       className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
//                     />
//                     <p className="text-slate-500 text-sm mt-1">Contact support to update your name</p>
//                   </div>
                  
//                   <div>
//                     <label className="block text-sm font-bold text-slate-900 mb-2">Email Address</label>
//                     <input
//                       type="email"
//                       value={user.email}
//                       readOnly
//                       className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
//                     />
//                   </div>
                  
//                   <div>
//                     <label className="block text-sm font-bold text-slate-900 mb-2">Account Type</label>
//                     <div className="flex items-center gap-2">
//                       <input
//                         type="text"
//                         value={user.role?.toUpperCase() || 'CUSTOMER'}
//                         readOnly
//                         className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 uppercase font-bold"
//                       />
//                       {user.role === 'manufacturer' && (
//                         <button
//                           onClick={() => router.push(`/manufacturer-dashboard/${user.id}`)}
//                           className="px-4 py-3 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-xl transition-colors whitespace-nowrap flex items-center gap-2"
//                         >
//                           <Factory className="w-4 h-4" />
//                           Factory Dashboard
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {user.role === 'manufacturer' && (
//                 <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
//                   <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
//                     <Factory className="w-5 h-5" />
//                     Manufacturer Account
//                   </h4>
//                   <p className="text-indigo-700 text-sm mb-4">
//                     You have manufacturer dashboard access. Manage your factory profile, products, and orders.
//                   </p>
//                   <div className="flex gap-3">
//                     <button
//                       onClick={() => router.push(`/manufacturer-dashboard/${user.id}`)}
//                       className="px-4 py-2 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2"
//                     >
//                       <Factory className="w-4 h-4" />
//                       Dashboard
//                     </button>
//                     <button
//                       onClick={() => router.push(`/manufacturer-products/${user.id}`)}
//                       className="px-4 py-2 bg-white text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl border border-indigo-200 transition-colors flex items-center gap-2"
//                     >
//                       <Package className="w-4 h-4" />
//                       My Products
//                     </button>
//                   </div>
//                 </div>
//               )}

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
//                   <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
//                     <HelpCircle className="w-5 h-5" />
//                     Need Help?
//                   </h4>
//                   <p className="text-blue-700 text-sm mb-4">
//                     Having issues with an order? Get support from our team.
//                   </p>
//                   <button
//                     onClick={() => setComplaintModal({ isOpen: true })}
//                     className="px-4 py-2 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-xl transition-colors"
//                   >
//                     Contact Support
//                   </button>
//                 </div>

//                 <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
//                   <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
//                     <AlertCircle className="w-5 h-5" />
//                     Account Actions
//                   </h4>
//                   <p className="text-red-700 text-sm mb-4">
//                     These actions are permanent and cannot be undone.
//                   </p>
//                   <button
//                     onClick={handleSignOut}
//                     className="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl transition-colors"
//                   >
//                     Sign Out of All Devices
//                   </button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Complaint Modal */}
//       {complaintModal.isOpen && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
//             onClick={() => setComplaintModal({ isOpen: false })}
//           />
//           <div className="relative bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
//             <div className="flex items-center gap-3 mb-6">
//               <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
//                 <AlertCircle className="w-6 h-6 text-red-600" />
//               </div>
//               <div>
//                 <h3 className="text-xl font-bold text-slate-900">File a Complaint</h3>
//                 {complaintModal.manufacturerName && (
//                   <p className="text-sm text-slate-500">Regarding: {complaintModal.manufacturerName}</p>
//                 )}
//               </div>
//             </div>
            
//             <div className="space-y-4 mb-6">
//               {complaintModal.orderId && (
//                 <div>
//                   <label className="block text-sm font-bold text-slate-700 mb-2">Order ID</label>
//                   <input
//                     type="text"
//                     value={complaintModal.orderId || ''}
//                     readOnly
//                     className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
//                   />
//                 </div>
//               )}
//               <div>
//                 <label className="block text-sm font-bold text-slate-700 mb-2">Issue Details</label>
//                 <textarea
//                   value={complaintText}
//                   onChange={e => setComplaintText(e.target.value)}
//                   className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
//                   placeholder="Describe the issue in detail. Include specific problems, dates, and any relevant information..."
//                 />
//                 <p className="text-xs text-slate-500 mt-1">Platform admin will review your complaint within 24 hours.</p>
//               </div>
//             </div>
            
//             <div className="flex gap-3">
//               <button
//                 onClick={handleFileComplaint}
//                 disabled={!complaintText.trim()}
//                 className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
//                   complaintText.trim()
//                     ? 'bg-red-600 text-white hover:bg-red-700'
//                     : 'bg-slate-100 text-slate-400 cursor-not-allowed'
//                 }`}
//               >
//                 Submit Complaint
//               </button>
//               <button
//                 onClick={() => setComplaintModal({ isOpen: false })}
//                 className="px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ProfilePage;

// 'use client'

// import React, { useEffect, useState } from 'react';
// import { supabase } from '@/lib/supabase';
// import { useRouter } from 'next/navigation';
// import { 
//   Package, 
//   Truck, 
//   CheckCircle, 
//   Clock, 
//   Home, 
//   LogOut,
//   User as UserIcon,
//   Calendar,
//   DollarSign,
//   ShoppingBag,
//   Settings,
//   CreditCard,
//   MapPin,
//   Factory,
//   AlertCircle,
//   Shield,
//   TrendingUp,
//   ChevronRight,
//   Star,
//   FileText,
//   HelpCircle
// } from 'lucide-react';

// interface Order {
//   id: string;
//   customer_id: string;
//   manufacturer_id: string;
//   manufacturer?: {
//     company_name: string;
//     logo_url: string;
//     location: string;
//   };
//   items: Array<{
//     name: string;
//     price: number;
//     quantity: number;
//     imageUrl: string;
//     category: string;
//   }>;
//   total_amount: number;
//   status: 'awaiting_verification' | 'processing' | 'shipped' | 'delivered' | 'declined' | 'cancelled';
//   payment_method: string;
//   transaction_id?: string;
//   account_name?: string;
//   created_at: string;
//   updated_at: string;
// }

// const ProfilePage: React.FC = () => {
//   const router = useRouter();
//   const [user, setUser] = useState<any>(null);
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState<'orders' | 'settings' | 'stats'>('orders');
//   const [complaintModal, setComplaintModal] = useState<{
//     isOpen: boolean;
//     orderId?: string;
//     manufacturerName?: string;
//   }>({ isOpen: false });
//   const [complaintText, setComplaintText] = useState('');
//   const [stats, setStats] = useState({
//     totalSpent: 0,
//     totalOrders: 0,
//     completedOrders: 0,
//     pendingOrders: 0
//   });

//   // Fetch user data and orders
//   useEffect(() => {
//     const fetchUserAndOrders = async () => {
//       try {
//         setLoading(true);
        
//         // Get current authenticated user
//         const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
//         if (authError || !authUser) {
//           router.push('/auth');
//           return;
//         }

//         // Fetch user profile from profiles table
//         const { data: profileData } = await supabase
//           .from('profiles')
//           .select('*')
//           .eq('id', authUser.id)
//           .single();

//         if (profileData) {
//           setUser({
//             id: profileData.id,
//             email: profileData.email,
//             name: profileData.full_name || profileData.email?.split('@')[0] || 'User',
//             avatar_url: profileData.avatar_url,
//             created_at: profileData.created_at,
//             role: profileData.role || 'customer'
//           });
//         } else {
//           // If no profile exists, create basic user object from auth
//           setUser({
//             id: authUser.id,
//             email: authUser.email,
//             name: authUser.email?.split('@')[0] || 'User',
//             created_at: authUser.created_at,
//             role: 'customer'
//           });
//         }

//         // Fetch user's orders with manufacturer info
//         const { data: ordersData, error: ordersError } = await supabase
//           .from('orders')
//           .select(`
//             *,
//             manufacturers (
//               company_name,
//               logo_url,
//               location,
//               verification_status
//             )
//           `)
//           .eq('customer_id', authUser.id)
//           .order('created_at', { ascending: false });

//         if (!ordersError && ordersData) {
//           setOrders(ordersData as Order[]);
          
//           // Calculate statistics
//           const totalSpent = ordersData.reduce((sum: number, order: any) => 
//             sum + Number(order.total_amount || 0), 0);
//           const totalOrders = ordersData.length;
//           const completedOrders = ordersData.filter((order: any) => 
//             ['delivered', 'completed'].includes(order.status)).length;
//           const pendingOrders = ordersData.filter((order: any) => 
//             ['awaiting_verification', 'processing', 'shipped'].includes(order.status)).length;
          
//           setStats({
//             totalSpent,
//             totalOrders,
//             completedOrders,
//             pendingOrders
//           });
//         }

//       } catch (error) {
//         console.error('Error fetching profile data:', error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchUserAndOrders();
//   }, [router]);

//   const handleSignOut = async () => {
//     await supabase.auth.signOut();
//     router.push('/');
//   };

//   const handleFileComplaint = async () => {
//     if (!complaintText.trim() || !complaintModal.orderId) {
//       alert('Please enter complaint details');
//       return;
//     }

//     try {
//       const { error } = await supabase
//         .from('complaints')
//         .insert({
//           order_id: complaintModal.orderId,
//           from_user_id: user?.id,
//           to_user_id: orders.find(o => o.id === complaintModal.orderId)?.manufacturer_id,
//           subject: `Complaint for Order: ${complaintModal.orderId}`,
//           message: complaintText,
//           status: 'open',
//           created_at: new Date().toISOString()
//         });

//       if (error) throw error;

//       setComplaintModal({ isOpen: false });
//       setComplaintText('');
      
//       alert('Complaint filed successfully! Platform admin will review your concern.');
      
//     } catch (error) {
//       console.error('Error filing complaint:', error);
//       alert('Failed to file complaint. Please try again.');
//     }
//   };

//   const getStatusIcon = (status: string) => {
//     switch (status) {
//       case 'delivered':
//       case 'completed':
//         return <CheckCircle className="w-5 h-5 text-green-500" />;
//       case 'shipped':
//         return <Truck className="w-5 h-5 text-blue-500" />;
//       case 'processing':
//         return <Package className="w-5 h-5 text-amber-500" />;
//       case 'awaiting_verification':
//         return <Clock className="w-5 h-5 text-orange-500" />;
//       case 'declined':
//         return <AlertCircle className="w-5 h-5 text-red-500" />;
//       default:
//         return <Clock className="w-5 h-5 text-slate-500" />;
//     }
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'delivered':
//       case 'completed':
//         return 'bg-green-100 text-green-800 border-green-200';
//       case 'shipped':
//         return 'bg-blue-100 text-blue-800 border-blue-200';
//       case 'processing':
//         return 'bg-amber-100 text-amber-800 border-amber-200';
//       case 'awaiting_verification':
//         return 'bg-orange-100 text-orange-800 border-orange-200';
//       case 'declined':
//         return 'bg-red-100 text-red-800 border-red-200';
//       case 'cancelled':
//         return 'bg-slate-100 text-slate-800 border-slate-200';
//       default:
//         return 'bg-slate-100 text-slate-800 border-slate-200';
//     }
//   };

//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString('en-US', {
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric'
//     });
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
//           <p className="text-slate-600 text-lg font-medium">Loading your profile...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!user) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center max-w-md mx-auto p-8">
//           <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
//             <UserIcon className="w-10 h-10 text-slate-400" />
//           </div>
//           <h2 className="text-2xl font-bold text-slate-900 mb-4">Please Sign In</h2>
//           <p className="text-slate-600 mb-8">You need to be signed in to view your profile.</p>
//           <div className="space-y-3">
//             <button
//               onClick={() => router.push('/auth')}
//               className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
//             >
//               Sign In
//             </button>
//             <button
//               onClick={() => router.push('/')}
//               className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
//             >
//               Back to Home
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
//       {/* Header */}
//       <div className="max-w-6xl mx-auto px-4 py-8">
//         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
//           <div>
//             <button
//               onClick={() => router.push('/')}
//               className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-medium mb-4 transition-colors"
//             >
//               <Home className="w-4 h-4" />
//               Back to Home
//             </button>
//             <h1 className="text-4xl font-black text-slate-900 mb-2">My Profile</h1>
//             <p className="text-slate-500">Manage your direct sourcing orders and account</p>
//           </div>
//           <div className="flex gap-3">
//             <button
//               onClick={() => router.push('/')}
//               className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors flex items-center gap-2"
//             >
//               <Home className="w-4 h-4" />
//               Home
//             </button>
//             <button
//               onClick={handleSignOut}
//               className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
//             >
//               <LogOut className="w-4 h-4" />
//               Sign Out
//             </button>
//           </div>
//         </div>

//         {/* User Stats Card */}
//         <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-8 text-white mb-8">
//           <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
//             <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
//               {user.avatar_url ? (
//                 <img 
//                   src={user.avatar_url} 
//                   alt={user.name}
//                   className="w-full h-full rounded-2xl object-cover"
//                 />
//               ) : (
//                 <UserIcon className="w-12 h-12" />
//               )}
//             </div>
//             <div className="flex-1">
//               <h2 className="text-2xl font-bold mb-2">{user.name}</h2>
//               <p className="text-white/80">{user.email}</p>
//               <div className="flex flex-wrap gap-6 mt-6">
//                 <div>
//                   <div className="text-sm text-white/60">Member Since</div>
//                   <div className="text-lg font-bold flex items-center gap-2">
//                     <Calendar className="w-4 h-4" />
//                     {formatDate(user.created_at)}
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-sm text-white/60">Total Orders</div>
//                   <div className="text-lg font-bold flex items-center gap-2">
//                     <ShoppingBag className="w-4 h-4" />
//                     {stats.totalOrders}
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-sm text-white/60">Total Spent</div>
//                   <div className="text-lg font-bold flex items-center gap-2">
//                     <DollarSign className="w-4 h-4" />
//                     ${stats.totalSpent.toFixed(2)}
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-sm text-white/60">Success Rate</div>
//                   <div className="text-lg font-bold flex items-center gap-2">
//                     <TrendingUp className="w-4 h-4" />
//                     {stats.totalOrders > 0 
//                       ? `${Math.round((stats.completedOrders / stats.totalOrders) * 100)}%`
//                       : '0%'
//                     }
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Tabs */}
//         <div className="flex border-b border-slate-200 mb-8 bg-white rounded-2xl p-1">
//           <button
//             onClick={() => setActiveTab('orders')}
//             className={`flex-1 px-6 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
//               activeTab === 'orders'
//                 ? 'bg-indigo-600 text-white shadow-lg'
//                 : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
//             }`}
//           >
//             <Package className="w-4 h-4" />
//             My Orders ({orders.length})
//           </button>
//           <button
//             onClick={() => setActiveTab('stats')}
//             className={`flex-1 px-6 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
//               activeTab === 'stats'
//                 ? 'bg-indigo-600 text-white shadow-lg'
//                 : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
//             }`}
//           >
//             <TrendingUp className="w-4 h-4" />
//             Statistics
//           </button>
//           <button
//             onClick={() => setActiveTab('settings')}
//             className={`flex-1 px-6 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
//               activeTab === 'settings'
//                 ? 'bg-indigo-600 text-white shadow-lg'
//                 : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
//             }`}
//           >
//             <Settings className="w-4 h-4" />
//             Settings
//           </button>
//         </div>

//         {/* Content Area */}
//         <div className="bg-white rounded-3xl border border-slate-200 p-8">
//           {activeTab === 'orders' ? (
//             orders.length === 0 ? (
//               <div className="text-center py-12">
//                 <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
//                 <h3 className="text-xl font-bold text-slate-900 mb-2">No Orders Yet</h3>
//                 <p className="text-slate-600 mb-8">Start sourcing directly from verified manufacturers!</p>
//                 <div className="flex flex-col sm:flex-row gap-3 justify-center">
//                   <button
//                     onClick={() => router.push('/')}
//                     className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
//                   >
//                     Browse Products
//                   </button>
//                   <button
//                     onClick={() => router.push('/manufacturers')}
//                     className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
//                   >
//                     Explore Factories
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <div className="space-y-6">
//                 <div className="flex justify-between items-center mb-4">
//                   <h3 className="text-xl font-bold text-slate-900">Order History</h3>
//                   <div className="text-sm text-slate-500">
//                     {stats.pendingOrders} pending • {stats.completedOrders} completed
//                   </div>
//                 </div>

//                 {orders.map((order) => (
//                   <div key={order.id} className="border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
//                     {/* Order Header */}
//                     <div className="p-6 border-b border-slate-100 bg-slate-50">
//                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
//                         <div>
//                           <div className="flex items-center gap-3 mb-2">
//                             {getStatusIcon(order.status)}
//                             <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
//                               {order.status.replace('_', ' ').toUpperCase()}
//                             </span>
//                             {order.manufacturer?.verification_status === 'verified' && (
//                               <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
//                                 <Shield className="w-3 h-3 inline mr-1" />
//                                 VERIFIED
//                               </span>
//                             )}
//                           </div>
//                           <h3 className="font-bold text-slate-900">Order #{order.id.slice(-8)}</h3>
//                           <div className="flex items-center gap-2 mt-2">
//                             {order.manufacturer?.logo_url ? (
//                               <img 
//                                 src={order.manufacturer.logo_url} 
//                                 alt={order.manufacturer.company_name}
//                                 className="w-6 h-6 rounded-full object-cover"
//                               />
//                             ) : (
//                               <Factory className="w-4 h-4 text-slate-400" />
//                             )}
//                             <span className="text-sm text-slate-600">
//                               {order.manufacturer?.company_name || 'Manufacturer'}
//                             </span>
//                             {order.manufacturer?.location && (
//                               <>
//                                 <span className="text-slate-300">•</span>
//                                 <MapPin className="w-3 h-3 text-slate-400" />
//                                 <span className="text-sm text-slate-500">{order.manufacturer.location}</span>
//                               </>
//                             )}
//                           </div>
//                         </div>
//                         <div className="text-right">
//                           <div className="text-2xl font-black text-slate-900">${Number(order.total_amount).toFixed(2)}</div>
//                           <div className="text-sm text-slate-500 flex items-center gap-1 justify-end mt-1">
//                             <Calendar className="w-3 h-3" />
//                             {formatDate(order.created_at)}
//                           </div>
//                         </div>
//                       </div>
//                     </div>

//                     {/* Order Items */}
//                     <div className="p-6">
//                       <h4 className="font-bold text-slate-900 mb-4">Items ({order.items?.length || 0})</h4>
//                       <div className="space-y-4">
//                         {order.items?.map((item, index) => (
//                           <div key={index} className="flex gap-4">
//                             <img
//                               src={item.imageUrl || '/placeholder.jpg'}
//                               alt={item.name}
//                               className="w-16 h-16 rounded-xl object-cover"
//                               onError={(e) => {
//                                 e.currentTarget.src = '/placeholder.jpg';
//                               }}
//                             />
//                             <div className="flex-1">
//                               <h5 className="font-bold text-slate-900">{item.name}</h5>
//                               <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-1">
//                                 <span>Quantity: {item.quantity}</span>
//                                 <span>Price: ${item.price?.toFixed(2)} each</span>
//                                 <span>Category: {item.category}</span>
//                               </div>
//                             </div>
//                             <div className="text-right">
//                               <div className="font-bold text-slate-900">
//                                 ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
//                               </div>
//                             </div>
//                           </div>
//                         ))}
//                       </div>

//                       {/* Order Footer */}
//                       <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
//                         <div className="text-sm text-slate-500">
//                           <div className="flex items-center gap-2">
//                             <CreditCard className="w-4 h-4" />
//                             Payment: {order.payment_method?.replace('_', ' ').toUpperCase() || 'N/A'}
//                             {order.transaction_id && (
//                               <span className="text-xs bg-slate-100 px-2 py-1 rounded">Ref: {order.transaction_id}</span>
//                             )}
//                           </div>
//                         </div>
//                         <div className="flex gap-2">
//                           {order.status === 'awaiting_verification' && (
//                             <button
//                               onClick={() => {
//                                 // Mark as paid for bank transfers
//                                 alert('This would notify the manufacturer about your payment');
//                               }}
//                               className="px-4 py-2 bg-green-600 text-white font-bold hover:bg-green-700 rounded-xl transition-colors flex items-center gap-2"
//                             >
//                               <CheckCircle className="w-4 h-4" />
//                               Mark as Paid
//                             </button>
//                           )}
//                           <button
//                             onClick={() => setComplaintModal({
//                               isOpen: true,
//                               orderId: order.id,
//                               manufacturerName: order.manufacturer?.company_name
//                             })}
//                             className="px-4 py-2 bg-red-50 text-red-600 font-bold hover:bg-red-100 rounded-xl transition-colors flex items-center gap-2"
//                           >
//                             <AlertCircle className="w-4 h-4" />
//                             Report Issue
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )
//           ) : activeTab === 'stats' ? (
//             <div className="space-y-8">
//               <div>
//                 <h3 className="text-xl font-bold text-slate-900 mb-6">Sourcing Statistics</h3>
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                   <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
//                     <div className="text-3xl font-black text-blue-700 mb-2">${stats.totalSpent.toFixed(2)}</div>
//                     <div className="text-sm font-bold text-blue-600">Total Spent</div>
//                     <div className="text-xs text-blue-500 mt-1">All-time sourcing</div>
//                   </div>
//                   <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
//                     <div className="text-3xl font-black text-green-700 mb-2">{stats.totalOrders}</div>
//                     <div className="text-sm font-bold text-green-600">Total Orders</div>
//                     <div className="text-xs text-green-500 mt-1">{stats.completedOrders} completed</div>
//                   </div>
//                   <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
//                     <div className="text-3xl font-black text-amber-700 mb-2">{stats.pendingOrders}</div>
//                     <div className="text-sm font-bold text-amber-600">Pending Orders</div>
//                     <div className="text-xs text-amber-500 mt-1">In production/shipping</div>
//                   </div>
//                   <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
//                     <div className="text-3xl font-black text-purple-700 mb-2">
//                       {stats.totalOrders > 0 
//                         ? `${Math.round((stats.completedOrders / stats.totalOrders) * 100)}%`
//                         : '0%'
//                       }
//                     </div>
//                     <div className="text-sm font-bold text-purple-600">Success Rate</div>
//                     <div className="text-xs text-purple-500 mt-1">Order completion</div>
//                   </div>
//                 </div>
//               </div>

//               <div>
//                 <h4 className="font-bold text-slate-900 mb-4">Manufacturer History</h4>
//                 <div className="space-y-4">
//                   {Array.from(new Set(orders.map(o => o.manufacturer?.company_name))).filter(Boolean).map((manufacturer, index) => (
//                     <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
//                       <div className="flex items-center gap-3">
//                         <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
//                           <Factory className="w-5 h-5 text-indigo-600" />
//                         </div>
//                         <div>
//                           <div className="font-bold text-slate-900">{manufacturer}</div>
//                           <div className="text-sm text-slate-500">
//                             {orders.filter(o => o.manufacturer?.company_name === manufacturer).length} orders
//                           </div>
//                         </div>
//                       </div>
//                       <button
//                         onClick={() => router.push(`/manufacturer-products/${orders.find(o => o.manufacturer?.company_name === manufacturer)?.manufacturer_id}`)}
//                         className="text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-1"
//                       >
//                         View Store
//                         <ChevronRight className="w-4 h-4" />
//                       </button>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           ) : (
//             <div className="space-y-8">
//               <div>
//                 <h3 className="text-xl font-bold text-slate-900 mb-6">Account Information</h3>
//                 <div className="space-y-6">
//                   <div>
//                     <label className="block text-sm font-bold text-slate-900 mb-2">Full Name</label>
//                     <input
//                       type="text"
//                       value={user.name}
//                       readOnly
//                       className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
//                     />
//                     <p className="text-slate-500 text-sm mt-1">Contact support to update your name</p>
//                   </div>
                  
//                   <div>
//                     <label className="block text-sm font-bold text-slate-900 mb-2">Email Address</label>
//                     <input
//                       type="email"
//                       value={user.email}
//                       readOnly
//                       className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
//                     />
//                   </div>
                  
//                   <div>
//                     <label className="block text-sm font-bold text-slate-900 mb-2">Account Type</label>
//                     <div className="flex items-center gap-2">
//                       <input
//                         type="text"
//                         value={user.role?.toUpperCase() || 'CUSTOMER'}
//                         readOnly
//                         className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 uppercase font-bold"
//                       />
//                       {user.role === 'manufacturer' && (
//                         <button
//                           onClick={() => router.push('/manufacturer-dashboard/'+user.id)}
//                           className="px-4 py-3 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-xl transition-colors whitespace-nowrap"
//                         >
//                           Factory Dashboard
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {user.role === 'manufacturer' && (
//                 <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
//                   <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
//                     <Factory className="w-5 h-5" />
//                     Manufacturer Account
//                   </h4>
//                   <p className="text-indigo-700 text-sm mb-4">
//                     You have manufacturer dashboard access. Manage your factory profile, products, and orders.
//                   </p>
//                   <div className="flex gap-3">
//                     <button
//                       onClick={() => router.push('/manufacturer-dashboard/'+user.id)}
//                       className="px-4 py-2 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-xl transition-colors"
//                     >
//                       Dashboard
//                     </button>
//                     <button
//                       onClick={() => router.push('/manufacturer-products')}
//                       className="px-4 py-2 bg-white text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl border border-indigo-200 transition-colors"
//                     >
//                       Manage Products
//                     </button>
//                   </div>
//                 </div>
//               )}

//               <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
//                 <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
//                   <AlertCircle className="w-5 h-5" />
//                   Account Actions
//                 </h4>
//                 <p className="text-red-700 text-sm mb-4">
//                   These actions are permanent and cannot be undone.
//                 </p>
//                 <button
//                   onClick={handleSignOut}
//                   className="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl transition-colors"
//                 >
//                   Sign Out of All Devices
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Complaint Modal */}
//       {complaintModal.isOpen && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div
//             className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
//             onClick={() => setComplaintModal({ isOpen: false })}
//           />
//           <div className="relative bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
//             <div className="flex items-center gap-3 mb-6">
//               <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
//                 <AlertCircle className="w-6 h-6 text-red-600" />
//               </div>
//               <div>
//                 <h3 className="text-xl font-bold text-slate-900">File a Complaint</h3>
//                 {complaintModal.manufacturerName && (
//                   <p className="text-sm text-slate-500">Regarding: {complaintModal.manufacturerName}</p>
//                 )}
//               </div>
//             </div>
            
//             <div className="space-y-4 mb-6">
//               <div>
//                 <label className="block text-sm font-bold text-slate-700 mb-2">Order ID</label>
//                 <input
//                   type="text"
//                   value={complaintModal.orderId || ''}
//                   readOnly
//                   className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-bold text-slate-700 mb-2">Issue Details</label>
//                 <textarea
//                   value={complaintText}
//                   onChange={e => setComplaintText(e.target.value)}
//                   className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
//                   placeholder="Describe the issue in detail. Include specific problems, dates, and any relevant information..."
//                 />
//                 <p className="text-xs text-slate-500 mt-1">Platform admin will review your complaint within 24 hours.</p>
//               </div>
//             </div>
            
//             <div className="flex gap-3">
//               <button
//                 onClick={handleFileComplaint}
//                 disabled={!complaintText.trim()}
//                 className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
//                   complaintText.trim()
//                     ? 'bg-red-600 text-white hover:bg-red-700'
//                     : 'bg-slate-100 text-slate-400 cursor-not-allowed'
//                 }`}
//               >
//                 Submit Complaint
//               </button>
//               <button
//                 onClick={() => setComplaintModal({ isOpen: false })}
//                 className="px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ProfilePage;
