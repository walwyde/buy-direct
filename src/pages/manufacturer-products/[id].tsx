'use client'

import React, { useEffect, useState } from 'react'
import { Manufacturer, Product, Order, OrderStatus, Notification } from '@/types'
import ProductCard from '@/components/ProductCard'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { Bell, Package, Truck, CreditCard, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface ManufacturerProductsPageProps {
  onAddToCart: (p: Product) => void
}

const ManufacturerProductsPage: React.FC<ManufacturerProductsPageProps> = ({ onAddToCart }) => {
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const params = useParams()
  const manufacturerId = params?.id as string

  const onViewProduct = (p: Product) => {
    router.push(`/product-detail/${p.id}`)
  }

  // Load manufacturer, products, and orders
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      // Load manufacturer
      const { data: m, error: mError } = await supabase
        .from('manufacturers')
        .select('*')
        .eq('id', manufacturerId)
        .single()

      if (mError || !m) {
        console.error('Manufacturer load failed:', mError)
        setLoading(false)
        return
      }

      const normalizedManufacturer: Manufacturer = {
        id: m.id,
        companyName: m.company_name,
        logoUrl: m.logo_url,
        bio: m.bio,
        location: m.location,
        establishedYear: m.established_year,
        verificationStatus: m.verification_status
      }

      setManufacturer(normalizedManufacturer)

      // Load products
      const { data: pData, error: pError } = await supabase
        .from('products')
        .select('*')
        .eq('manufacturer_id', manufacturerId)
        .order('created_at', { ascending: false })

      if (!pError && pData) {
        setProducts(
          pData.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: Number(p.price),
            retailPriceEstimation: Number(p.retail_price_estimation),
            category: p.category,
            stock: p.stock,
            imageUrl: p.image_url,
            specifications: p.specifications,
            manufacturerId: p.manufacturer_id,
            manufacturerName: normalizedManufacturer.companyName,
            isFeatured: p.is_featured,
            minimumOrderQuantity: p.minimum_order_quantity
          }))
        )
      }

      // Load orders for this manufacturer
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, profiles(full_name, email)')
        .eq('manufacturer_id', manufacturerId)
        .order('created_at', { ascending: false })

      if (!orderError && orderData) {
        setOrders(orderData)
      }

      // Load notifications
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('manufacturer_id', manufacturerId)
        .order('created_at', { ascending: false })

      if (!notificationError && notificationData) {
        setNotifications(notificationData)
      }

      setLoading(false)
    }

    loadData()
  }, [manufacturerId])

  // Set up real-time subscription for new orders
  useEffect(() => {
    if (!manufacturerId) return

    const channel = supabase
      .channel('manufacturer_orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `manufacturer_id=eq.${manufacturerId}`
        },
        async (payload) => {
          const newOrder = payload.new
          
          // Get customer info
          const { data: customerData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', newOrder.customer_id)
            .single()

          // Create notification
          const notification: Notification = {
            id: `notif-${Date.now()}`,
            title: 'New Order Received!',
            message: `${customerData?.full_name || 'A customer'} placed an order for $${newOrder.total_amount}`,
            order_id: newOrder.id,
            manufacturer_id: manufacturerId,
            customer_id: newOrder.customer_id,
            is_read: false,
            created_at: new Date().toISOString(),
            type: 'new_order'
          }

          // Add to Supabase
          await supabase.from('notifications').insert(notification)

          // Update local state
          setNotifications(prev => [notification, ...prev])
          setOrders(prev => [newOrder, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [manufacturerId])

  // Handle payment verification
  const handlePaymentVerification = async (orderId: string, approved: boolean) => {
    try {
      const newStatus: OrderStatus = approved ? 'processing' : 'cancelled'
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      // Update local state
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
      )

      // Create notification
      const notification: Notification = {
        id: `notif-${Date.now()}`,
        title: `Payment ${approved ? 'Approved' : 'Declined'}`,
        message: `Order #${orderId.slice(0, 8)} payment ${approved ? 'verified' : 'declined'}`,
        order_id: orderId,
        manufacturer_id: manufacturerId,
        is_read: false,
        created_at: new Date().toISOString(),
        type: 'payment_update'
      }

      await supabase.from('notifications').insert(notification)
      setNotifications(prev => [notification, ...prev])

    } catch (error) {
      console.error('Error verifying payment:', error)
    }
  }

  // Handle order status update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
      )

    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  // Mark notification as read
  const markNotificationRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error('Error marking notification read:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-medium">
        Loading manufacturer…
      </div>
    )
  }

  if (!manufacturer) {
    return (
      <div className="py-24 text-center text-slate-400 font-medium">
        Manufacturer not found.
      </div>
    )
  }

  const pendingPayments = orders.filter(o => o.status === 'awaiting_verification')
  const activeOrders = orders.filter(o => ['processing', 'shipped'].includes(o.status))

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Manufacturer Header with Notifications */}
      <div className="bg-white rounded-[3rem] p-8 md:p-12 mb-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
        <div className="relative">
          <img
            src={manufacturer.logoUrl}
            className="w-32 h-32 rounded-[2rem] object-cover shadow-2xl border-4 border-white ring-1 ring-slate-100"
            alt={manufacturer.companyName}
          />
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                </button>
                <span className="absolute -top-1 -right-1 bg-white text-red-500 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-grow">
          <div className="flex flex-wrap gap-2 items-center justify-center md:justify-start mb-4">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              {manufacturer.companyName}
            </h1>

            {manufacturer.verificationStatus === 'verified' && (
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black border border-blue-100 uppercase tracking-widest">
                Verified Global Hub
              </span>
            )}
          </div>

          <p className="text-slate-500 text-lg max-w-2xl mb-6">
            {manufacturer.bio}
          </p>

          <div className="flex flex-wrap gap-6 text-sm font-bold text-slate-400">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {manufacturer.location}
            </div>

            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Operating since {manufacturer.establishedYear}
            </div>

            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {products.length} products
            </div>

            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              {orders.length} orders
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="mb-8 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Recent Notifications</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              Close
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 10).map(notification => (
                <div
                  key={notification.id}
                  onClick={() => markNotificationRead(notification.id)}
                  className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      notification.type === 'new_order' ? 'bg-green-100 text-green-600' :
                      notification.type === 'payment_update' ? 'bg-blue-100 text-blue-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {notification.type === 'new_order' ? (
                        <Package className="w-4 h-4" />
                      ) : notification.type === 'payment_update' ? (
                        <CreditCard className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">{notification.title}</p>
                      <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <div className="mb-8 bg-amber-50 rounded-2xl border border-amber-100 overflow-hidden">
          <div className="p-4 bg-amber-100 border-b border-amber-200 flex justify-between items-center">
            <h3 className="font-bold text-amber-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Pending Payment Verifications ({pendingPayments.length})
            </h3>
          </div>
          <div className="divide-y divide-amber-100">
            {pendingPayments.map(order => (
              <div key={order.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-amber-100/50 transition-colors">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-amber-900">{order.account_name || 'Customer'}</p>
                    <span className="text-xs text-amber-600 font-bold uppercase tracking-widest">
                      ID: {order.transaction_id || order.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-sm text-amber-700 font-medium">
                    ${order.total_amount} • {Array.isArray(order.items) ? order.items.length : 0} items
                  </p>
                  <p className="text-xs text-amber-600 mt-1">Bank Transfer • Awaiting verification</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePaymentVerification(order.id, true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirm
                  </button>
                  <button
                    onClick={() => handlePaymentVerification(order.id, false)}
                    className="bg-white text-red-600 border border-red-100 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div className="mb-8 bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Active Orders ({activeOrders.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Order ID</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Customer</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Amount</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Status</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <p className="text-sm font-bold text-slate-900">#{order.id.slice(0, 8)}</p>
                    </td>
                    <td className="p-3">
                      <p className="text-sm text-slate-700">
                        {order.profiles?.full_name || order.customer_id?.slice(0, 8)}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="text-sm font-bold text-slate-900">${order.total_amount}</p>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        order.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {order.status === 'processing' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800"
                        >
                          Mark as Shipped
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 mb-8">
          Factory Store Catalogue
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              manufacturer={manufacturer}
              onAddToCart={onAddToCart}
              onViewDetails={onViewProduct}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default ManufacturerProductsPage


// import React, { useEffect, useState } from 'react'
// import { Manufacturer, Product } from '@/types'
// import ProductCard from '@/components/ProductCard'
// import { supabase } from '@/lib/supabase'
// import { useParams, useRouter } from 'next/navigation'

// interface ManufacturerProductsPageProps {
//   manufacturerId: string
//   onAddToCart: (p: Product) => void
//   onViewProduct: (p: Product) => void
// }


// const ManufacturerProductsPage: React.FC<ManufacturerProductsPageProps> = () => {
//   const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null)
//   const [products, setProducts] = useState<Product[]>([])
//   const [loading, setLoading] = useState(true)

// const router = useRouter();
//  const params = useParams();
//  const manufacturerId = params?.id as string;
//   console.log('ManufacturerProductsPage loaded for ID:', manufacturerId)

//   /* -------------------------
//      Load manufacturer + products
//   ------------------------- */
//   const onAddToCart = (p: Product) => {
//     console.log('Add to cart:', p)
//   }

//   const onViewProduct = (p: Product) => {
//     console.log('View product:', p)
//     router.push(`/product-detail/${p.id}`)
//   }
//   useEffect(() => {
//     const load = async () => {
//       setLoading(true)

//       /* Manufacturer */
//       const { data: m, error: mError } = await supabase
//         .from('manufacturers')
//         .select('*')
//         .eq('id', manufacturerId)
//         .single()

//       if (mError || !m) {
//         console.error('Manufacturer load failed:', mError)
//         setLoading(false)
//         return
//       }

//       const normalizedManufacturer: Manufacturer = {
//         id: m.id,
//         companyName: m.company_name,
//         logoUrl: m.logo_url,
//         bio: m.bio,
//         location: m.location,
//         establishedYear: m.established_year,
//         verificationStatus: m.verification_status
//       }

//       setManufacturer(normalizedManufacturer)

//       /* Products */
//       const { data: pData, error: pError } = await supabase
//         .from('products')
//         .select('*')
//         .eq('manufacturer_id', manufacturerId)
//         .order('created_at', { ascending: false })

//       if (!pError && pData) {
//         setProducts(
//           pData.map(p => ({
//             id: p.id,
//             name: p.name,
//             description: p.description,
//             price: Number(p.price),
//             retailPriceEstimation: Number(p.retail_price_estimation),
//             category: p.category,
//             stock: p.stock,
//             imageUrl: p.image_url,
//             specifications: p.specifications,
//             manufacturerId: p.manufacturer_id,
//             manufacturerName: normalizedManufacturer.companyName,
//             isFeatured: p.is_featured,
//             minimumOrderQuantity: p.minimum_order_quantity
//           }))
//         )
//       }

//       setLoading(false)
//     }

//     load()
//   }, [manufacturerId])

//   /* -------------------------
//      Guards
//   ------------------------- */
//   if (loading) {
//     return (
//       <div className="py-24 text-center text-slate-400 font-medium">
//         Loading manufacturer…
//       </div>
//     )
//   }

//   if (!manufacturer) {
//     return (
//       <div className="py-24 text-center text-slate-400 font-medium">
//         Manufacturer not found.
//       </div>
//     )
//   }

//   /* -------------------------
//      Render (OLD UI)
//   ------------------------- */
//   return (
//     <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
//       {/* Manufacturer Header */}
//       <div className="bg-white rounded-[3rem] p-8 md:p-12 mb-12 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
//         <img
//           src={manufacturer.logoUrl}
//           className="w-32 h-32 rounded-[2rem] object-cover shadow-2xl border-4 border-white ring-1 ring-slate-100"
//           alt={manufacturer.companyName}
//         />

//         <div className="flex-grow">
//           <div className="flex flex-wrap gap-2 items-center justify-center md:justify-start mb-4">
//             <h1 className="text-4xl font-black text-slate-900 tracking-tight">
//               {manufacturer.companyName}
//             </h1>

//             {manufacturer.verificationStatus === 'verified' && (
//               <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black border border-blue-100 uppercase tracking-widest">
//                 Verified Global Hub
//               </span>
//             )}
//           </div>

//           <p className="text-slate-500 text-lg max-w-2xl mb-6">
//             {manufacturer.bio}
//           </p>

//           <div className="flex flex-wrap gap-6 text-sm font-bold text-slate-400">
//             <div className="flex items-center gap-2">
//               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
//               </svg>
//               {manufacturer.location}
//             </div>

//             <div className="flex items-center gap-2">
//               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//               Operating since {manufacturer.establishedYear}
//             </div>
//           </div>
//         </div>

//         <div className="text-right flex flex-col items-center md:items-end justify-center">
//           <p className="text-3xl font-black text-indigo-600">
//             {products.length}
//           </p>
//           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
//             Active Direct Listings
//           </p>
//         </div>
//       </div>

//       {/* Products */}
//       <div className="mb-8">
//         <h2 className="text-2xl font-black text-slate-900 mb-8">
//           Factory Store Catalogue
//         </h2>

//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
//           {products.map(product => (
//             <ProductCard
//               key={product.id}
//               product={product}
//               manufacturer={manufacturer}
//               onAddToCart={onAddToCart}
//               onViewDetails={onViewProduct}
//             />
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// }

// export default ManufacturerProductsPage

// import React from 'react';
// import { Manufacturer, Product } from '../types';
// import ProductCard from './ProductCard';

// interface ManufacturerProductsPageProps {
//   manufacturer: Manufacturer;
//   products: Product[];
//   onAddToCart: (p: Product) => void;
//   onViewProduct: (p: Product) => void;
// }

// const ManufacturerProductsPage: React.FC<ManufacturerProductsPageProps> = ({ 
//   manufacturer, 
//   products, 
//   onAddToCart, 
//   onViewProduct 
// }) => {
//   return (
//     <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
//       <div className="bg-white rounded-[3rem] p-8 md:p-12 mb-12 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
//         <img 
//           src={manufacturer.logoUrl} 
//           className="w-32 h-32 rounded-[2rem] object-cover shadow-2xl border-4 border-white ring-1 ring-slate-100" 
//           alt={manufacturer.companyName} 
//         />
//         <div className="flex-grow">
//           <div className="flex flex-wrap gap-2 items-center justify-center md:justify-start mb-4">
//             <h1 className="text-4xl font-black text-slate-900 tracking-tight">{manufacturer.companyName}</h1>
//             {manufacturer.verificationStatus === 'verified' && (
//               <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black border border-blue-100 uppercase tracking-widest">
//                 Verified Global Hub
//               </span>
//             )}
//           </div>
//           <p className="text-slate-500 text-lg max-w-2xl mb-6">
//             {manufacturer.bio}
//           </p>
//           <div className="flex flex-wrap gap-6 text-sm font-bold text-slate-400">
//             <div className="flex items-center gap-2">
//               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
//               {manufacturer.location}
//             </div>
//             <div className="flex items-center gap-2">
//               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
//               Operating since {manufacturer.establishedYear}
//             </div>
//           </div>
//         </div>
//         <div className="text-right flex flex-col items-center md:items-end justify-center">
//             <p className="text-3xl font-black text-indigo-600">{products.length}</p>
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Direct Listings</p>
//         </div>
//       </div>

//       <div className="mb-8">
//         <h2 className="text-2xl font-black text-slate-900 mb-8">Factory Store Catalogue</h2>
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
//           {products.map(product => (
//             <ProductCard 
//               key={product.id} 
//               product={product} 
//               manufacturer={manufacturer}
//               onAddToCart={onAddToCart}
//               onViewDetails={onViewProduct}
//             />
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ManufacturerProductsPage;

// import React, { useEffect, useState } from 'react';
// import { Manufacturer, Product } from '../types';
// import ProductCard from './ProductCard';
// import { supabase } from '../lib/supabase';

// interface ManufacturerProductsPageProps {
//   manufacturerId: string;
//   onAddToCart: (p: Product) => void;
//   onViewProduct: (p: Product) => void;
// }

// const ManufacturerProductsPage: React.FC<ManufacturerProductsPageProps> = ({
//   manufacturerId,
//   onAddToCart,
//   onViewProduct
// }) => {
//   const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null);
//   const [products, setProducts] = useState<Product[]>([]);
//   const [loading, setLoading] = useState(true);

//   /* ---------------------------
//      Load manufacturer + products
//   --------------------------- */
//   useEffect(() => {
//     const loadData = async () => {
//       setLoading(true);

//       const { data: m, error: mError } = await supabase
//         .from('manufacturers')
//         .select('*')
//         .eq('id', manufacturerId)
//         .single();

//       if (mError || !m) {
//         console.error('Manufacturer load failed:', mError);
//         setLoading(false);
//         return;
//       }

//       setManufacturer(m);

//       const { data: pData, error: pError } = await supabase
//         .from('products')
//         .select('*')
//         .eq('manufacturer_id', manufacturerId)
//         .order('created_at', { ascending: false });

//       if (!pError && pData) {
//         setProducts(
//           pData.map(p => ({
//             id: p.id,
//             name: p.name,
//             description: p.description,
//             price: Number(p.price),
//             retailPriceEstimation: Number(p.retail_price_estimation),
//             category: p.category,
//             stock: p.stock,
//             imageUrl: p.image_url,
//             specifications: p.specifications,
//             manufacturerId: p.manufacturer_id,
//             manufacturerName: m.company_name,
//             isFeatured: p.is_featured,
//             minimumOrderQuantity: p.minimum_order_quantity
//           }))
//         );
//       }

//       setLoading(false);
//     };

//     loadData();
//   }, [manufacturerId]);

//   /* ---------------------------
//      UI Guards
//   --------------------------- */
//   if (loading) {
//     return (
//       <div className="py-24 text-center text-slate-400 font-medium">
//         Loading factory store…
//       </div>
//     );
//   }

//   if (!manufacturer) {
//     return (
//       <div className="py-24 text-center text-slate-400 font-medium">
//         Manufacturer not found.
//       </div>
//     );
//   }

//   /* ---------------------------
//      Render
//   --------------------------- */
//   return (
//     <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
//       <div className="bg-white rounded-[3rem] p-12 mb-12 border shadow-sm">
//         <h1 className="text-4xl font-black">{manufacturer.company_name}</h1>
//         <p className="text-slate-500 mt-4">{manufacturer.bio}</p>
//       </div>

//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
//         {products.map(product => (
//           <ProductCard
//             key={product.id}
//             product={product}
//             manufacturer={manufacturer}
//             onAddToCart={onAddToCart}
//             onViewDetails={onViewProduct}
//           />
//         ))}
//       </div>
//     </div>
//   );
// };

// export default ManufacturerProductsPage;
