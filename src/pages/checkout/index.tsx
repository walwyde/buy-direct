'use client'

import React, { useState, useMemo, useEffect } from 'react';
import { CartItem, Order } from '@/types';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Shield, Truck, Package, Factory, ArrowLeft, CreditCard, Banknote, User } from 'lucide-react';

const CheckoutPage: React.FC = () => {
  const router = useRouter();
  
  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer'>('card');
  const [accountName, setAccountName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch current user and cart data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get current authenticated user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUserId(authUser?.id || null);

        if (authUser) {
          // Fetch user profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();
          
          if (profileData) {
            setUser({
              id: profileData.id,
              email: profileData.email,
              name: profileData.full_name || profileData.email?.split('@')[0] || 'User',
              avatar_url: profileData.avatar_url
            });
          }

          // Fetch cart from Supabase for logged-in user
          const { data: cartData, error } = await supabase
            .from('cart_items')
            .select(`
              *,
              products (
                id,
                name,
                description,
                price,
                retail_price_estimation,
                category,
                stock,
                image_url,
                specifications,
                manufacturer_id,
                minimum_order_quantity,
                is_featured
              )
            `)
            .eq('user_id', authUser.id);

          if (error) {
            console.error('Error fetching cart:', error);
            // Fallback to localStorage
            const savedCart = localStorage.getItem('ds_guest_cart');
            if (savedCart) {
              setCart(JSON.parse(savedCart));
            }
          } else if (cartData) {
            const cartItems: CartItem[] = cartData.map(item => ({
              id: item.products.id,
              name: item.products.name,
              description: item.products.description,
              price: Number(item.products.price),
              retailPriceEstimation: Number(item.products.retail_price_estimation),
              category: item.products.category,
              stock: item.products.stock,
              imageUrl: item.products.image_url,
              specifications: item.products.specifications,
              manufacturerId: item.products.manufacturer_id,
              minimumOrderQuantity: item.products.minimum_order_quantity,
              isFeatured: item.products.is_featured,
              quantity: item.quantity
            }));
            setCart(cartItems);
          }
        } else {
          // Guest user - load from localStorage
          const savedCart = localStorage.getItem('ds_guest_cart');
          if (savedCart) {
            setCart(JSON.parse(savedCart));
          }
        }
      } catch (error) {
        console.error('Error fetching checkout data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate totals
  const subtotal = useMemo(() => cart.reduce((s, i) => s + (i.price * i.quantity), 0), [cart]);
  const shipping = cart.length > 0 ? 10 : 0; // Flat shipping fee
  const total = subtotal + shipping;

  // Group items by manufacturer
  const manufacturerGroups = useMemo(() => {
    const groups = new Map<string, { manufacturerId: string; items: CartItem[]; total: number }>();
    
    cart.forEach(item => {
      if (!groups.has(item.manufacturerId)) {
        groups.set(item.manufacturerId, {
          manufacturerId: item.manufacturerId,
          items: [],
          total: 0
        });
      }
      const group = groups.get(item.manufacturerId)!;
      group.items.push(item);
      group.total += item.price * item.quantity;
    });
    
    return Array.from(groups.values());
  }, [cart]);

  // Get manufacturer names for display
  const [manufacturerNames, setManufacturerNames] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const fetchManufacturerNames = async () => {
      if (manufacturerGroups.length === 0) return;
      
      const manufacturerIds = manufacturerGroups.map(g => g.manufacturerId);
      const { data } = await supabase
        .from('manufacturers')
        .select('id, company_name')
        .in('id', manufacturerIds);
      
      if (data) {
        const names: Record<string, string> = {};
        data.forEach(m => {
          names[m.id] = m.company_name;
        });
        setManufacturerNames(names);
      }
    };
    
    fetchManufacturerNames();
  }, [manufacturerGroups]);

  // Replace the handleSubmit function with this corrected version:

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!user || !userId) {
    alert('Please sign in to complete your order');
    router.push('/auth');
    return;
  }

  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }

  setIsProcessing(true);

  try {
    // Create orders for each manufacturer
    const createdOrders = [];
    
    for (const group of manufacturerGroups) {
      const orderData = {
        customer_id: userId,
        manufacturer_id: group.manufacturerId,
        items: group.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
          category: item.category,
          manufacturerId: item.manufacturerId
        })),
        total_amount: group.total + (shipping / manufacturerGroups.length),
        status: paymentMethod === 'card' ? 'processing' : 'awaiting_verification',
        payment_method: paymentMethod,
        account_name: paymentMethod === 'bank_transfer' ? accountName : null,
        transaction_id: paymentMethod === 'bank_transfer' 
          ? 'DS-' + Math.random().toString(36).substring(2, 8).toUpperCase()
          : null
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;
      createdOrders.push(data);
      
      // First, fetch the current manufacturer stats
      const { data: manufacturerData, error: fetchError } = await supabase
        .from('manufacturers')
        .select('total_sales, revenue')
        .eq('id', group.manufacturerId)
        .single();

      if (fetchError) {
        console.error('Error fetching manufacturer stats:', fetchError);
        continue; // Skip stats update but continue with order creation
      }

      // Update manufacturer stats with client-side calculation
      const newTotalSales = (manufacturerData?.total_sales || 0) + group.items.length;
      const newRevenue = (parseFloat(manufacturerData?.revenue || 0) || 0) + group.total;

      const { error: updateError } = await supabase
        .from('manufacturers')
        .update({
          total_sales: newTotalSales,
          revenue: newRevenue,
          updated_at: new Date().toISOString()
        })
        .eq('id', group.manufacturerId);

      if (updateError) {
        console.error('Error updating manufacturer stats:', updateError);
        // Don't throw here, continue with order flow
      }
    }

    // Get the first order ID for display
    if (createdOrders.length > 0) {
      setOrderId(createdOrders[0].id);
    }

    // Clear cart from Supabase
    if (userId) {
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);
    }
    
    // Also clear localStorage
    localStorage.removeItem('ds_guest_cart');
    setCart([]);

    // Success
    setOrderPlaced(true);
    
    // Redirect after 5 seconds
    setTimeout(() => {
      router.push('/profile-page/'+userId);
    }, 5000);

  } catch (error) {
    console.error('Error placing order:', error);
    alert('Failed to place order. Please try again.');
  } finally {
    setIsProcessing(false);
  }
};

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
    
  //   if (!user || !userId) {
  //     alert('Please sign in to complete your order');
  //     router.push('/auth');
  //     return;
  //   }

  //   if (cart.length === 0) {
  //     alert('Your cart is empty');
  //     return;
  //   }

  //   setIsProcessing(true);

  //   try {
  //     // Create orders for each manufacturer
  //     const createdOrders = [];
      
  //     for (const group of manufacturerGroups) {
  //       const orderData = {
  //         customer_id: userId,
  //         manufacturer_id: group.manufacturerId,
  //         items: group.items.map(item => ({
  //           id: item.id,
  //           name: item.name,
  //           price: item.price,
  //           quantity: item.quantity,
  //           imageUrl: item.imageUrl,
  //           category: item.category,
  //           manufacturerId: item.manufacturerId
  //         })),
  //         total_amount: group.total + (shipping / manufacturerGroups.length),
  //         status: paymentMethod === 'card' ? 'processing' : 'awaiting_verification',
  //         payment_method: paymentMethod,
  //         account_name: paymentMethod === 'bank_transfer' ? accountName : null,
  //         transaction_id: paymentMethod === 'bank_transfer' 
  //           ? 'DS-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  //           : null
  //       };

  //       const { data, error } = await supabase
  //         .from('orders')
  //         .insert(orderData)
  //         .select()
  //         .single();

  //       if (error) throw error;
  //       createdOrders.push(data);
        
  //       // Update manufacturer stats
  //       await supabase
  //         .from('manufacturers')
  //         .update({
  //           total_sales: supabase.raw('COALESCE(total_sales, 0) + ?', [group.items.length]),
  //           revenue: supabase.raw('COALESCE(revenue, 0) + ?', [group.total]),
  //           updated_at: new Date().toISOString()
  //         })
  //         .eq('id', group.manufacturerId);
  //     }

  //     // Get the first order ID for display
  //     if (createdOrders.length > 0) {
  //       setOrderId(createdOrders[0].id);
  //     }

  //     // Clear cart from Supabase
  //     if (userId) {
  //       await supabase
  //         .from('cart_items')
  //         .delete()
  //         .eq('user_id', userId);
  //     }
      
  //     // Also clear localStorage
  //     localStorage.removeItem('ds_guest_cart');
  //     setCart([]);

  //     // Success
  //     setOrderPlaced(true);
      
  //     // Redirect after 5 seconds
  //     setTimeout(() => {
  //       router.push('/profile');
  //     }, 5000);

  //   } catch (error) {
  //     console.error('Error placing order:', error);
  //     alert('Failed to place order. Please try again.');
  //   } finally {
  //     setIsProcessing(false);
  //   }
  // };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="max-w-md w-full mx-auto p-8 text-center">
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <Check className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 mb-3">Order Confirmed!</h1>
            <p className="text-slate-600 text-lg">
              Your direct sourcing order has been placed successfully.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl mb-8">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-bold text-slate-900">Order Placed</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Truck className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-sm font-bold text-slate-900">In Production</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-bold text-slate-900">Quality Check</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 mb-4">
              <p className="text-sm text-slate-600 mb-1">Order ID</p>
              <p className="font-black text-slate-900 text-lg">{orderId}</p>
            </div>

            <div className="bg-green-50 rounded-2xl p-4 mb-4">
              <p className="text-green-800 text-sm">
                You will be redirected to your profile page in a few seconds...
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/profile')}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors"
            >
              Go to Profile Now
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">Checkout</h1>
          <p className="text-slate-500 font-medium">Securing your direct-from-source essentials.</p>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-sm font-bold text-slate-700">{user.name}</span>
            </div>
          )}
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 font-bold text-sm uppercase tracking-widest hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-12 h-12 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Your cart is empty</h2>
          <p className="text-slate-600 mb-8">Add products from manufacturers to get started.</p>
          <div className="space-y-3 max-w-xs mx-auto">
            <button
              onClick={() => router.push('/')}
              className="w-full px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              Browse Products
            </button>
            <button
              onClick={() => router.push('/manufacturers')}
              className="w-full px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Explore Factories
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side: Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Summary
              </h3>
              
              {/* Manufacturer Groups */}
              {manufacturerGroups.map((group, groupIndex) => (
                <div key={group.manufacturerId} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Factory className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">
                        {manufacturerNames[group.manufacturerId] || `Manufacturer #${groupIndex + 1}`}
                      </p>
                      <p className="text-sm text-slate-500">{group.items.length} item(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">${group.total.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 ml-12">
                    {group.items.map((item) => (
                      <div key={item.id} className="flex gap-4 items-center p-3 hover:bg-slate-50 rounded-xl transition-colors">
                        <img 
                          src={item.imageUrl || '/placeholder.jpg'} 
                          className="w-16 h-16 rounded-xl object-cover"
                          alt={item.name}
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.jpg';
                          }}
                        />
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900">{item.name}</h4>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                            Qty: {item.quantity} • ${item.price.toFixed(2)} each
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Order Totals */}
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Direct Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-2xl font-black text-slate-900 pt-3 border-t border-slate-100">
                  <span>Total Amount</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Continue Shopping Button */}
            <button 
              onClick={() => router.push('/')}
              className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Continue Shopping
            </button>
          </div>

          {/* Right Side: Payment & User Info */}
          <div className="space-y-6">
            {/* User Info Card */}
            {user && (
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{user.name}</h3>
                    <p className="text-white/80 text-sm">{user.email}</p>
                  </div>
                </div>
                <div className="text-sm text-white/60">
                  Shipping details will be requested after order confirmation
                </div>
              </div>
            )}

            {/* Payment Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                {paymentMethod === 'card' ? (
                  <CreditCard className="w-5 h-5" />
                ) : (
                  <Banknote className="w-5 h-5" />
                )}
                Payment Method
              </h3>
              
              {/* Payment Method Toggle */}
              <div className="flex bg-slate-50 p-1 rounded-2xl mb-6">
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    paymentMethod === 'card' 
                      ? 'bg-white shadow-sm text-indigo-600' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Card
                </button>
                <button 
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    paymentMethod === 'bank_transfer' 
                      ? 'bg-white shadow-sm text-indigo-600' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Bank Transfer
                </button>
              </div>

              {/* Payment Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {paymentMethod === 'card' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">
                        Secure Demo Payment
                      </p>
                      <p className="text-indigo-900 text-sm font-medium">
                        Card payments are automatically approved for this demo platform.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Card Number</label>
                      <input 
                        type="text" 
                        placeholder="•••• •••• •••• ••••" 
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Expiry Date</label>
                        <input 
                          type="text" 
                          placeholder="MM/YY" 
                          className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">CVV</label>
                        <input 
                          type="text" 
                          placeholder="•••" 
                          className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 bg-slate-900 rounded-2xl text-white">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">
                        Bank Transfer Details
                      </p>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Bank Name</span>
                          <span className="font-bold">DirectSource Bank</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Account Number</span>
                          <span className="font-bold">0044558822</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Routing Number</span>
                          <span className="font-bold">021000021</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm">Reference</span>
                          <span className="font-bold text-indigo-400">Use your email</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <p className="text-amber-800 text-sm font-medium">
                        Transfer the exact total amount. Include your email in the transfer notes. Your order will be confirmed after verification.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Your Account Name</label>
                      <input 
                        type="text" 
                        required
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Name as it appears on your bank account" 
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button 
                  disabled={isProcessing || !user}
                  type="submit"
                  className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all ${
                    isProcessing 
                      ? 'bg-slate-400 cursor-wait' 
                      : !user
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-95'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing Order...
                    </span>
                  ) : !user ? (
                    'Please Sign In to Checkout'
                  ) : paymentMethod === 'card' ? (
                    'Pay Now & Source Direct'
                  ) : (
                    'Confirm Bank Transfer'
                  )}
                </button>

                {/* Sign In Prompt */}
                {!user && (
                  <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                    <p className="text-red-800 text-sm font-medium text-center mb-3">
                      You must be signed in to complete your order.
                    </p>
                    <button
                      onClick={() => router.push('/auth')}
                      className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                    >
                      Sign In Now
                    </button>
                  </div>
                )}

                {/* Security Note */}
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-center text-xs text-slate-500 font-medium">
                    <Shield className="w-3 h-3 inline-block mr-1" />
                    Secured with DirectSource encryption
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;

// import React, { useState, useMemo } from 'react';
// import { CartItem, Order, User } from '@/types';

// interface CheckoutPageProps {
//   cart: CartItem[];
//   user: User;
//   onPlaceOrder: (order: Order) => void;
//   onCancel: () => void;
// }

// const CheckoutPage: React.FC<CheckoutPageProps> = ({ cart, user, onPlaceOrder, onCancel }) => {
//   const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer'>('card');
//   const [accountName, setAccountName] = useState('');
//   const [isProcessing, setIsProcessing] = useState(false);

//   const subtotal = useMemo(() => cart.reduce((s, i) => s + (i.price * i.quantity), 0), [cart]);
//   const shipping = 10; // Flat direct shipping fee
//   const total = subtotal + shipping;

//   // Group items by manufacturer for order splitting demo
//   const manufacturerIds = useMemo(() => Array.from(new Set(cart.map(i => i.manufacturerId))), [cart]);

//   // Generate a mock transaction ID for bank transfer
//   const transactionId = useMemo(() => 'DS-' + Math.random().toString(36).substring(2, 8).toUpperCase(), []);

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsProcessing(true);

//     // Simulate short delay
//     setTimeout(() => {
//       // In a real app, we might create multiple orders if there are items from multiple manufacturers
//       // For this demo, we create one order per manufacturer involved
//       manufacturerIds.forEach(mId => {
//         const mItems = cart.filter(i => i.manufacturerId === mId);
//         const mTotal = mItems.reduce((s, i) => s + (i.price * i.quantity), 0) + (shipping / manufacturerIds.length);
        
//         const newOrder: Order = {
//           id: 'ORD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
//           customerId: user.id,
//           manufacturerId: mId,
//           items: mItems,
//           totalAmount: mTotal,
//           status: paymentMethod === 'card' ? 'processing' : 'awaiting_verification',
//           paymentMethod: paymentMethod,
//           transactionId: paymentMethod === 'bank_transfer' ? transactionId : undefined,
//           accountName: paymentMethod === 'bank_transfer' ? accountName : undefined,
//           createdAt: new Date().toISOString()
//         };
//         onPlaceOrder(newOrder);
//       });
//       setIsProcessing(false);
//     }, 1500);
//   };

//   return (
//     <div className="max-w-6xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
//       <div className="mb-8">
//         <h1 className="text-4xl font-black text-slate-900 mb-2">Checkout</h1>
//         <p className="text-slate-500 font-medium">Securing your direct-from-source essentials.</p>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
//         {/* Left Side: Order Summary */}
//         <div className="lg:col-span-2 space-y-8">
//           <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
//             <h3 className="text-xl font-black text-slate-900 mb-6">Order Summary</h3>
//             <div className="space-y-6">
//               {cart.map((item) => (
//                 <div key={item.id} className="flex gap-4 items-center">
//                   <img src={item.imageUrl} className="w-20 h-20 rounded-2xl object-cover" alt={item.name} />
//                   <div className="flex-grow">
//                     <h4 className="font-bold text-slate-900">{item.name}</h4>
//                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Qty: {item.quantity}</p>
//                   </div>
//                   <div className="text-right">
//                     <p className="font-black text-slate-900">${(item.price * item.quantity).toFixed(2)}</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//             <div className="mt-8 pt-8 border-t border-slate-50 space-y-2">
//               <div className="flex justify-between text-slate-500 font-medium">
//                 <span>Subtotal</span>
//                 <span>${subtotal.toFixed(2)}</span>
//               </div>
//               <div className="flex justify-between text-slate-500 font-medium">
//                 <span>Direct Shipping</span>
//                 <span>${shipping.toFixed(2)}</span>
//               </div>
//               <div className="flex justify-between text-2xl font-black text-slate-900 pt-4">
//                 <span>Total</span>
//                 <span>${total.toFixed(2)}</span>
//               </div>
//             </div>
//           </div>

//           <button 
//             onClick={onCancel}
//             className="text-slate-400 font-bold text-sm uppercase tracking-widest hover:text-indigo-600 transition-colors"
//           >
//             ← Continue Shopping
//           </button>
//         </div>

//         {/* Right Side: Payment */}
//         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl h-fit sticky top-24">
//           <h3 className="text-xl font-black text-slate-900 mb-6">Payment Method</h3>
          
//           <div className="flex bg-slate-50 p-1 rounded-2xl mb-8">
//             <button 
//               onClick={() => setPaymentMethod('card')}
//               className={`flex-grow py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${paymentMethod === 'card' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
//             >
//               Card
//             </button>
//             <button 
//               onClick={() => setPaymentMethod('bank_transfer')}
//               className={`flex-grow py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${paymentMethod === 'bank_transfer' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
//             >
//               Bank Transfer
//             </button>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-6">
//             {paymentMethod === 'card' ? (
//               <div className="space-y-4">
//                 <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mb-6">
//                   <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Demo Mode</p>
//                   <p className="text-indigo-900 text-sm font-medium">Card payments are automatically approved for this demo platform.</p>
//                 </div>
//                 <div>
//                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Card Number</label>
//                   <input type="text" placeholder="•••• •••• •••• ••••" className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
//                 </div>
//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Expiry</label>
//                     <input type="text" placeholder="MM/YY" className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
//                   </div>
//                   <div>
//                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">CVV</label>
//                     <input type="text" placeholder="•••" className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               <div className="space-y-6">
//                 <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
//                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Transfer Details</p>
//                   <div className="space-y-3">
//                     <div className="flex justify-between">
//                       <span className="text-slate-400 text-xs">Bank</span>
//                       <span className="font-bold text-sm">DirectSource Hub Bank</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-slate-400 text-xs">Account #</span>
//                       <span className="font-bold text-sm">0044558822</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-slate-400 text-xs">Trans ID</span>
//                       <span className="font-bold text-sm text-indigo-400">{transactionId}</span>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
//                   <p className="text-amber-800 text-[10px] font-medium leading-relaxed">
//                     Transfer the total amount to the account above using the <strong>Trans ID</strong> as your reference. Your order will be confirmed once the manufacturer verifies the funds.
//                   </p>
//                 </div>

//                 <div>
//                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Your Account Name</label>
//                   <input 
//                     type="text" 
//                     required
//                     value={accountName}
//                     onChange={(e) => setAccountName(e.target.value)}
//                     placeholder="e.g. Johnathan Smith" 
//                     className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" 
//                   />
//                 </div>
//               </div>
//             )}

//             <button 
//               disabled={isProcessing}
//               type="submit"
//               className={`w-full py-5 rounded-2xl font-black text-white shadow-xl transition-all active:scale-[0.98] ${isProcessing ? 'bg-slate-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
//             >
//               {isProcessing ? 'Processing Order...' : paymentMethod === 'card' ? 'Pay Now & Source Direct' : 'I Have Made The Transfer'}
//             </button>
//           </form>

//           <p className="text-center text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-8">
//             Secured by DirectSource Node-Encrypt
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CheckoutPage;
