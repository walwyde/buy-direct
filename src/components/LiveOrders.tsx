import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, Truck, Globe, TrendingUp, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';

interface LiveOrdersProps {
  initialOrders?: Order[];
}

const LiveOrders: React.FC<LiveOrdersProps> = ({ initialOrders = [] }) => {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [animation, setAnimation] = useState(false);
  const [stats, setStats] = useState({
    todayOrders: 0,
    inTransit: 0,
    avgDelivery: 0,
    satisfaction: 98.7
  });

  useEffect(() => {
    // Initial fetch
    fetchOrders();
    fetchStats();

    // Set up real-time subscription
    const subscription = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchOrders();
          fetchStats();
        }
      )
      .subscribe();

    // Time updater
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
      setAnimation(true);
      setTimeout(() => setAnimation(false), 500);
    }, 5000);

    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchOrders();
    }, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(timeInterval);
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:profiles(*),
          manufacturer:manufacturers(*)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        setOrders(data as Order[]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Today's orders count
      const { count: todayOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // In-transit orders count
      const { count: inTransit } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['shipped', 'out_for_delivery']);

      // Get delivered orders for average delivery time calculation
      const { data: deliveredOrders } = await supabase
        .from('orders')
        .select('created_at, updated_at')
        .eq('status', 'delivered')
        .limit(100);

      let avgDelivery = 9.2; // Default fallback
      if (deliveredOrders && deliveredOrders.length > 0) {
        const totalHours = deliveredOrders.reduce((sum, order) => {
          const created = new Date(order.created_at);
          const delivered = new Date(order.updated_at);
          const hours = (delivered.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          return sum + hours;
        }, 0);
        avgDelivery = parseFloat((totalHours / deliveredOrders.length).toFixed(1));
      }

      setStats({
        todayOrders: todayOrders || 0,
        inTransit: inTransit || 0,
        avgDelivery,
        satisfaction: 98.7 // This would come from a separate ratings table
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'awaiting_verification':
      case 'processing':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'shipped':
      case 'out_for_delivery':
        return <Truck className="w-4 h-4 text-blue-500" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <Clock className="w-4 h-4 text-red-500" />;
      default:
        return <Package className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'awaiting_verification':
      case 'processing':
        return 'bg-amber-100 text-amber-800';
      case 'shipped':
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusText = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const getCountryFromCustomer = (customer: any) => {
    // Assuming customer profile has country field
    return customer?.country || 'Unknown';
  };

  const getProductType = (items: any[]) => {
    if (!items || !Array.isArray(items) || items.length === 0) return 'Mixed';
    
    // Check if all items have the same category
    const categories = items.map(item => item.product?.category || item.category);
    const uniqueCategories = [...new Set(categories.filter(Boolean))];
    
    if (uniqueCategories.length === 1) return uniqueCategories[0];
    if (uniqueCategories.length === 0) return 'General';
    return 'Mixed';
  };

  const handleRefresh = () => {
    fetchOrders();
    fetchStats();
  };

  return (
    <section className="py-12">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-3xl p-8 text-white overflow-hidden relative">
          {/* Animated background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-white/10 ${animation ? 'animate-pulse' : ''}`}>
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    Live Orders Dashboard
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  </h3>
                  <p className="text-white/70">Real-time factory-to-customer shipments</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                  title="Refresh orders"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <div className="text-right">
                  <div className="text-sm text-white/70">Last Updated</div>
                  <div className="text-lg font-bold">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm text-white/70">Today's Orders</span>
                </div>
                <div className="text-3xl font-bold">{stats.todayOrders}</div>
              </div>
              <div className="bg-white/10 rounded-2xl p-4">
                <div className="text-sm text-white/70 mb-2">In Transit</div>
                <div className="text-3xl font-bold text-blue-300">{stats.inTransit}</div>
              </div>
              <div className="bg-white/10 rounded-2xl p-4">
                <div className="text-sm text-white/70 mb-2">Avg. Delivery</div>
                <div className="text-3xl font-bold text-green-300">{stats.avgDelivery} days</div>
              </div>
              <div className="bg-white/10 rounded-2xl p-4">
                <div className="text-sm text-white/70 mb-2">Satisfaction</div>
                <div className="text-3xl font-bold text-amber-300">{stats.satisfaction}%</div>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="bg-white/5 rounded-2xl p-4 border border-white/10 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/20 rounded-lg" />
                        <div>
                          <div className="h-5 w-24 bg-white/20 rounded mb-2" />
                          <div className="h-4 w-32 bg-white/20 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : orders.length > 0 ? (
                orders.slice(0, 5).map((order, index) => {
                  const itemsArray = Array.isArray(order.items) ? order.items : [];
                  const itemCount = itemsArray.length;
                  const productType = getProductType(itemsArray);
                  const country = getCountryFromCustomer(order.customer);
                  const totalAmount = typeof order.total_amount === 'number' 
                    ? order.total_amount 
                    : parseFloat(order.total_amount) || 0;

                  return (
                    <div
                      key={order.id}
                      className="bg-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors group border border-white/10"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                          </div>
                          <div>
                            <div className="font-bold">{order.id?.slice(0, 8)}...</div>
                            <div className="text-sm text-white/70">
                              {productType} • {itemCount} item{itemCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-white/50" />
                            <span className="text-sm">{country}</span>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-bold">${totalAmount.toLocaleString()}</div>
                            <div className="text-sm text-white/70">
                              {getTimeAgo(order.created_at)}
                            </div>
                          </div>
                          
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Empty state
                <div className="text-center py-8 bg-white/5 rounded-2xl">
                  <Package className="w-12 h-12 mx-auto text-white/30 mb-4" />
                  <h4 className="text-lg font-semibold mb-2">No orders yet</h4>
                  <p className="text-white/70">Orders will appear here as they come in</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-300"></div>
                </div>
                <span className="text-sm text-white/70">Live data updating</span>
              </div>
              <button 
                onClick={() => window.location.href = '/orders'}
                className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold transition-colors"
              >
                View All Orders →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveOrders;
// import React, { useState, useEffect } from 'react';
// import { Package, Clock, CheckCircle, Truck, Globe, TrendingUp } from 'lucide-react';
// import { Order } from '@/types';

// interface LiveOrdersProps {
//   orders: Order[];
// }

// const LiveOrders: React.FC<LiveOrdersProps> = ({ orders }) => {
//   const [currentTime, setCurrentTime] = useState(new Date());
//   const [animation, setAnimation] = useState(false);

//   useEffect(() => {
//     const timer = setInterval(() => {
//       setCurrentTime(new Date());
//       setAnimation(true);
//       setTimeout(() => setAnimation(false), 500);
//     }, 5000);

//     return () => clearInterval(timer);
//   }, []);

//   const getStatusIcon = (status: string) => {
//     switch (status) {
//       case 'processing': return <Clock className="w-4 h-4 text-amber-500" />;
//       case 'shipped': return <Truck className="w-4 h-4 text-blue-500" />;
//       case 'delivered': return <CheckCircle className="w-4 h-4 text-green-500" />;
//       default: return <Package className="w-4 h-4 text-slate-500" />;
//     }
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'processing': return 'bg-amber-100 text-amber-800';
//       case 'shipped': return 'bg-blue-100 text-blue-800';
//       case 'delivered': return 'bg-green-100 text-green-800';
//       default: return 'bg-slate-100 text-slate-800';
//     }
//   };

//   const generateMockOrders = () => {
//     const countries = ['USA', 'Germany', 'Japan', 'UK', 'Australia', 'Canada', 'France'];
//     const products = ['Electronics', 'Apparel', 'Home Goods', 'Industrial', 'Automotive'];
    
//     return Array.from({ length: 8 }, (_, i) => ({
//       id: `ORD-${1000 + i}`,
//       customerId: `CUST-${Math.floor(Math.random() * 1000)}`,
//       manufacturerId: `FACT-${Math.floor(Math.random() * 100)}`,
//       totalAmount: Math.floor(Math.random() * 5000) + 1000,
//       status: ['processing', 'shipped', 'delivered'][Math.floor(Math.random() * 3)] as any,
//       items: Math.floor(Math.random() * 5) + 1,
//       country: countries[Math.floor(Math.random() * countries.length)],
//       productType: products[Math.floor(Math.random() * products.length)],
//       timeAgo: `${Math.floor(Math.random() * 60)} minutes ago`
//     }));
//   };

//   const displayOrders = orders.length > 0 ? orders.slice(0, 5) : generateMockOrders();

//   return (
//     <section className="py-12">
//       <div className="max-w-6xl mx-auto">
//         <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-3xl p-8 text-white overflow-hidden relative">
//           {/* Animated background elements */}
//           <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/20 to-transparent rounded-full blur-3xl" />
//           <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-3xl" />
          
//           <div className="relative z-10">
//             <div className="flex items-center justify-between mb-8">
//               <div className="flex items-center gap-4">
//                 <div className={`p-3 rounded-xl bg-white/10 ${animation ? 'animate-pulse' : ''}`}>
//                   <Package className="w-6 h-6" />
//                 </div>
//                 <div>
//                   <h3 className="text-2xl font-bold flex items-center gap-3">
//                     Live Orders Dashboard
//                     <span className="flex h-2 w-2">
//                       <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
//                       <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
//                     </span>
//                   </h3>
//                   <p className="text-white/70">Real-time factory-to-customer shipments</p>
//                 </div>
//               </div>
//               <div className="text-right">
//                 <div className="text-sm text-white/70">Last Updated</div>
//                 <div className="text-lg font-bold">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
//               </div>
//             </div>

//             {/* Stats Overview */}
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
//               <div className="bg-white/10 rounded-2xl p-4">
//                 <div className="flex items-center gap-2 mb-2">
//                   <TrendingUp className="w-4 h-4" />
//                   <span className="text-sm text-white/70">Today's Orders</span>
//                 </div>
//                 <div className="text-3xl font-bold">47</div>
//               </div>
//               <div className="bg-white/10 rounded-2xl p-4">
//                 <div className="text-sm text-white/70 mb-2">In Transit</div>
//                 <div className="text-3xl font-bold text-blue-300">23</div>
//               </div>
//               <div className="bg-white/10 rounded-2xl p-4">
//                 <div className="text-sm text-white/70 mb-2">Avg. Delivery</div>
//                 <div className="text-3xl font-bold text-green-300">9.2 days</div>
//               </div>
//               <div className="bg-white/10 rounded-2xl p-4">
//                 <div className="text-sm text-white/70 mb-2">Satisfaction</div>
//                 <div className="text-3xl font-bold text-amber-300">98.7%</div>
//               </div>
//             </div>

//             {/* Orders List */}
//             <div className="space-y-4">
//               {displayOrders.map((order, index) => (
//                 <div 
//                   key={order.id}
//                   className="bg-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors group border border-white/10"
//                   style={{ animationDelay: `${index * 100}ms` }}
//                 >
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center gap-4">
//                       <div className={`p-2 rounded-lg ${getStatusColor(order.status)}`}>
//                         {getStatusIcon(order.status)}
//                       </div>
//                       <div>
//                         <div className="font-bold">{order.id}</div>
//                         <div className="text-sm text-white/70">{order.productType} • {order.items} items</div>
//                       </div>
//                     </div>
                    
//                     <div className="flex items-center gap-6">
//                       <div className="flex items-center gap-2">
//                         <Globe className="w-4 h-4 text-white/50" />
//                         <span className="text-sm">{order.country}</span>
//                       </div>
                      
//                       <div className="text-right">
//                         <div className="font-bold">${order?.totalAmount?.toLocaleString()}</div>
//                         <div className="text-sm text-white/70">{order.timeAgo}</div>
//                       </div>
                      
//                       <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
//                         {order.status.toUpperCase()}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             {/* Footer */}
//             <div className="mt-8 pt-6 border-t border-white/20 flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <div className="flex space-x-1">
//                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
//                   <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
//                   <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-300"></div>
//                 </div>
//                 <span className="text-sm text-white/70">Live data updating every 5 seconds</span>
//               </div>
//               <button className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold transition-colors">
//                 View All Orders →
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default LiveOrders;