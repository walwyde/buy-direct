import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Manufacturer, Product, Order, OrderStatus, Complaint, Notification } from '@/types'
import { Bell, CheckCircle, XCircle, Package, Truck, CreditCard, RefreshCw, AlertCircle } from 'lucide-react'

interface ManufacturerDashboardProps {
  onUpdateOrderStatus?: (orderId: string, newStatus: OrderStatus) => void
  onFileComplaint?: (complaint: Partial<Complaint>) => void
}

const ManufacturerDashboard: React.FC<ManufacturerDashboardProps> = ({
  onUpdateOrderStatus,
  onFileComplaint
}) => {
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  /* =========================
     DATA LOADING
  ========================= */
  const loadDashboard = async () => {
    setRefreshing(true)

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('No authenticated user')
      setRefreshing(false)
      setLoading(false)
      return
    }

    // 1. Get manufacturer by logged-in user
    const { data: manufacturerData, error: manufacturerError } =
      await supabase
        .from('manufacturers')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (manufacturerError || !manufacturerData) {
      console.error('Manufacturer not found')
      setRefreshing(false)
      setLoading(false)
      return
    }

    setManufacturer(manufacturerData)

    // 2. Get products
    const { data: productData } = await supabase
      .from('products')
      .select('*')
      .eq('manufacturer_id', manufacturerData.id)
      .order('created_at', { ascending: false })

    setProducts(productData || [])

    // 3. Get orders with customer details
    const { data: orderData } = await supabase
      .from('orders')
      .select(`
        *,
        customer:profiles(
          id,
          full_name,
          email,
          country
        )
      `)
      .eq('manufacturer_id', manufacturerData.id)
      .order('created_at', { ascending: false })

    setOrders(orderData || [])

    // 4. Get notifications
    const { data: notificationData } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'order_update')
      .or(`title.ilike.%order%,title.ilike.%payment%`)
      .order('created_at', { ascending: false })
      .limit(10)

    setNotifications(notificationData || [])

    setRefreshing(false)
    setLoading(false)
  }

  useEffect(() => {
    loadDashboard()

    // Set up real-time subscription for orders
    const subscription = supabase
      .channel('manufacturer_orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `manufacturer_id=eq.${manufacturer?.id}`
        },
        (payload) => {
          // Add notification for new order
          addNotification({
            title: 'New Order Received!',
            message: `Order #${payload.new.id.substring(0, 8)} placed with ${payload.new.items?.length || 0} items`,
            type: 'order_update',
            isRead: false
          })
          
          // Refresh orders
          loadDashboard()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [manufacturer?.id])

  /* =========================
     NOTIFICATION FUNCTIONS
  ========================= */
  const addNotification = async (notification: Partial<Notification>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('notifications')
      .insert({
        ...notification,
        user_id: user.id
      })
      .select()
      .single()

    if (data) {
      setNotifications(prev => [data, ...prev])
    }
  }

  const markNotificationRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ isRead: true })
      .eq('id', id)

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    )
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  /* =========================
     ORDER & PAYMENT FUNCTIONS
  ========================= */
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

      // Update local state
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
      )

      // Add notification
      addNotification({
        title: `Order ${newStatus}`,
        message: `Order #${orderId.substring(0, 8)} status changed to ${newStatus}`,
        type: 'order_update',
        isRead: false
      })

      // If status changed to delivered, update manufacturer stats
      if (newStatus === 'delivered') {
        const order = orders.find(o => o.id === orderId)
        if (order && manufacturer) {
          const itemCount = Array.isArray(order.items) ? order.items.length : 0
          const newTotalSales = (manufacturer.total_sales || 0) + itemCount
          const newRevenue = (parseFloat(manufacturer.revenue || '0') || 0) + order.total_amount

          await supabase
            .from('manufacturers')
            .update({
              total_sales: newTotalSales,
              revenue: newRevenue,
              updated_at: new Date().toISOString()
            })
            .eq('id', manufacturer.id)

          setManufacturer(prev => prev ? {
            ...prev,
            total_sales: newTotalSales,
            revenue: newRevenue.toString()
          } : prev)
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const handlePaymentVerification = async (orderId: string, approved: boolean) => {
    try {
      const newStatus = approved ? 'processing' : 'cancelled'
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

      // Add notification
      addNotification({
        title: `Payment ${approved ? 'Approved' : 'Declined'}`,
        message: `Payment for Order #${orderId.substring(0, 8)} has been ${approved ? 'verified' : 'declined'}`,
        type: 'order_update',
        isRead: false
      })

      setShowPaymentModal(false)
      setSelectedOrder(null)
    } catch (error) {
      console.error('Error verifying payment:', error)
    }
  }

  const openPaymentModal = (order: Order) => {
    setSelectedOrder(order)
    setShowPaymentModal(true)
  }

  /* =========================
     PRODUCT FUNCTIONS
  ========================= */
  const handleSaveProduct = async (
    formData: Partial<Product>,
    editingProduct: Product | null
  ) => {
    if (!manufacturer) return

    const payload = {
      name: formData.name,
      description: formData.description,
      price: formData.price,
      retail_price_estimation: formData.retailPriceEstimation,
      category: formData.category,
      stock: formData.stock,
      image_url: formData.imageUrl,
      specifications: formData.specifications || {},
      manufacturer_id: manufacturer.id
    }

    if (editingProduct) {
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id)
        .select()
        .single()

      if (error) {
        console.error('Product update failed:', error)
        return
      }

      setProducts(prev => prev.map(p => p.id === data.id ? data : p))
      setIsFormOpen(false)
      setEditingProduct(null)
      return
    }

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Product creation failed:', error)
      return
    }

    setProducts(prev => [data, ...prev])
    setIsFormOpen(false)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const handleAddNew = () => {
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingProduct(null)
  }

  /* =========================
     DERIVED DATA
  ========================= */
  const pendingPayments = orders.filter(o => o.status === 'awaiting_verification')
  const activeOrders = orders.filter(o => 
    o.status === 'processing' || o.status === 'shipped' || o.status === 'out_for_delivery'
  )
  const completedOrders = orders.filter(o => o.status === 'delivered')

  /* =========================
     RENDER GUARDS
  ========================= */
  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-slate-400 font-medium">Loading manufacturer dashboard…</p>
      </div>
    )
  }

  if (!manufacturer) {
    return (
      <div className="py-24 text-center text-red-500 font-medium">
        Manufacturer profile not found.
      </div>
    )
  }

  /* =========================
     MAIN RENDER
  ========================= */
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900">
              Factory Hub: {manufacturer.companyName}
            </h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-slate-500">
            Manage your production line and direct-to-consumer sales.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={loadDashboard}
            disabled={refreshing}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleAddNew}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Product
          </button>
        </div>
      </div>

      {/* STATS & NOTIFICATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
              Total Revenue
            </p>
            <h2 className="text-4xl font-black text-slate-900">
              ${parseFloat(manufacturer.revenue || '0').toLocaleString()}
            </h2>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
              Items Sold
            </p>
            <h2 className="text-4xl font-black text-slate-900">
              {(manufacturer.total_sales || 0).toLocaleString()}
            </h2>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
              Active Listings
            </p>
            <h2 className="text-4xl font-black text-slate-900">
              {products.length}
            </h2>
          </div>
        </div>

        {/* Notifications Panel */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-black text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alerts
            </h3>
            {unreadCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 5).map(notification => (
                <div
                  key={notification.id}
                  onClick={() => markNotificationRead(notification.id)}
                  className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!notification.isRead ? 'bg-indigo-50/40' : ''}`}
                >
                  <p className="font-bold text-slate-900 text-sm">{notification.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{notification.message}</p>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* PENDING PAYMENTS */}
      {pendingPayments.length > 0 && (
        <div className="bg-amber-50 rounded-3xl border border-amber-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-amber-100 flex justify-between items-center">
            <h3 className="text-xl font-black text-amber-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Pending Payment Verifications
              <span className="bg-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                {pendingPayments.length}
              </span>
            </h3>
          </div>
          <div className="divide-y divide-amber-100">
            {pendingPayments.map(order => (
              <div key={order.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-amber-100/50 transition-colors">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-amber-900">
                      {order.account_name || `Customer ${order.customer?.full_name || order.customer?.email || ''}`}
                    </p>
                    <span className="text-xs text-amber-600 font-bold uppercase tracking-widest">
                      ID: {order.transaction_id || order.id.substring(0, 8)}
                    </span>
                  </div>
                  <p className="text-sm text-amber-700 font-medium">
                    ${order.total_amount?.toFixed(2)} for {Array.isArray(order.items) ? order.items.length : 0} items
                  </p>
                  {order.payment_method === 'bank_transfer' && (
                    <p className="text-xs text-amber-600 mt-1">Bank Transfer • Awaiting verification</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePaymentVerification(order.id, true)}
                    className="bg-green-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-100 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirm Payment
                  </button>
                  <button
                    onClick={() => handlePaymentVerification(order.id, false)}
                    className="bg-white text-red-600 border border-red-100 px-5 py-2 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors flex items-center gap-2"
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

      {/* ORDER MANAGEMENT */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-900">Order Management</h3>
          <div className="flex gap-2">
            <span className="text-xs font-bold text-slate-500">
              {activeOrders.length} Active • {pendingPayments.length} Pending • {completedOrders.length} Completed
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-black text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">Order ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.slice(0, 10).map(order => {
                const itemCount = Array.isArray(order.items) ? order.items.length : 0
                const customerName = order.customer?.full_name || 
                                   order.customer?.email?.split('@')[0] || 
                                   `User_${order.customer_id?.substring(0, 4)}`

                return (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-900 text-sm">
                        #{order.id.substring(0, 8)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-900">{customerName}</p>
                      {order.customer?.country && (
                        <p className="text-xs text-slate-500">{order.customer.country}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-700">{itemCount} items</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">${order.total_amount?.toFixed(2)}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${{
                        'awaiting_verification': 'bg-amber-100 text-amber-800',
                        'processing': 'bg-blue-100 text-blue-800',
                        'shipped': 'bg-purple-100 text-purple-800',
                        'delivered': 'bg-green-100 text-green-800',
                        'cancelled': 'bg-red-100 text-red-800'
                      }[order.status] || 'bg-slate-100 text-slate-800'}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {order.status === 'awaiting_verification' && (
                          <button
                            onClick={() => openPaymentModal(order)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            Verify Payment
                          </button>
                        )}
                        {order.status === 'processing' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            Mark as Shipped
                          </button>
                        )}
                        {order.status === 'shipped' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                            className="text-xs font-bold text-green-600 hover:text-green-800 transition-colors"
                          >
                            Mark as Delivered
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRODUCT MANAGEMENT */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-xl font-black text-slate-900">My Product Catalogue</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-black text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Category</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image_url}
                        className="w-12 h-12 rounded-xl object-cover"
                        alt={product.name}
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.jpg'
                        }}
                      />
                      <div>
                        <p className="font-bold text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{product.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-slate-900">${product.price?.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">Est. retail: ${product.retail_price_estimation?.toFixed(2)}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      product.stock < 10 ? 'bg-red-100 text-red-800' :
                      product.stock < 50 ? 'bg-amber-100 text-amber-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {product.stock} units
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-slate-700">{product.category}</span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="text-indigo-600 hover:text-indigo-800 font-bold text-sm transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {isFormOpen && (
        <ProductForm
          manufacturerId={manufacturer.id}
          editingProduct={editingProduct}
          onSave={handleSaveProduct}
          onCancel={handleCloseForm}
        />
      )}

      {showPaymentModal && selectedOrder && (
        <PaymentVerificationModal
          order={selectedOrder}
          onApprove={() => handlePaymentVerification(selectedOrder.id, true)}
          onDecline={() => handlePaymentVerification(selectedOrder.id, false)}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedOrder(null)
          }}
        />
      )}
    </div>
  )
}

/* =========================
   PAYMENT VERIFICATION MODAL
========================= */
interface PaymentVerificationModalProps {
  order: Order
  onApprove: () => void
  onDecline: () => void
  onClose: () => void
}

const PaymentVerificationModal: React.FC<PaymentVerificationModalProps> = ({
  order,
  onApprove,
  onDecline,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Verify Payment
          </h3>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm font-bold text-slate-900 mb-1">Order Details</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600 text-sm">Order ID:</span>
                <span className="font-bold text-slate-900">#{order.id.substring(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 text-sm">Amount:</span>
                <span className="font-bold text-green-600">${order.total_amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 text-sm">Payment Method:</span>
                <span className="font-bold text-slate-900">
                  {order.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Credit Card'}
                </span>
              </div>
              {order.account_name && (
                <div className="flex justify-between">
                  <span className="text-slate-600 text-sm">Account Name:</span>
                  <span className="font-bold text-slate-900">{order.account_name}</span>
                </div>
              )}
              {order.transaction_id && (
                <div className="flex justify-between">
                  <span className="text-slate-600 text-sm">Transaction ID:</span>
                  <span className="font-bold text-slate-900">{order.transaction_id}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-bold text-amber-800">Important</p>
            </div>
            <p className="text-xs text-amber-700">
              Verify that the payment has been received in your account before approving. Once approved, the order will move to processing.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={onDecline}
              className="flex-1 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors"
            >
              Decline Payment
            </button>
            <button
              onClick={onApprove}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
            >
              Approve Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================
   PRODUCT FORM (same as before, but ensure it's included)
========================= */
interface ProductFormProps {
  manufacturerId: string
  editingProduct: Product | null
  onSave: (formData: Partial<Product>, editingProduct: Product | null) => void
  onCancel: () => void
}

const ProductForm: React.FC<ProductFormProps> = ({
  manufacturerId,
  editingProduct,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<Product>>(editingProduct || {
    name: '',
    description: '',
    price: 0,
    retailPriceEstimation: 0,
    category: 'Home & Kitchen',
    stock: 0,
    imageUrl: 'https://picsum.photos/seed/product/400/300',
    specifications: {}
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData, editingProduct)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onCancel} />
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-2xl font-black text-slate-900">{editingProduct ? 'Edit Listing' : 'New Direct Listing'}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Form fields remain the same as your existing ProductForm */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Product Name</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Handmade Silk Scarf"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Category</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              >
                <option>Home & Kitchen</option>
                <option>Accessories</option>
                <option>Apparel</option>
                <option>Tech</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Description</label>
            <textarea 
              required
              rows={3}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="Tell shoppers why this is better direct from the source..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Direct Price ($)</label>
              <input 
                required
                type="number" 
                step="0.01"
                value={formData.price}
                onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Est. Retail Price ($)</label>
              <input 
                required
                type="number" 
                step="0.01"
                value={formData.retailPriceEstimation}
                onChange={e => setFormData({...formData, retailPriceEstimation: parseFloat(e.target.value)})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Initial Stock</label>
              <input 
                required
                type="number" 
                value={formData.stock}
                onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Product Image URL</label>
            <input 
              type="text" 
              value={formData.imageUrl}
              onChange={e => setFormData({...formData, imageUrl: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="https://..."
            />
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
            <button 
              type="button" 
              onClick={onCancel}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
            >
              {editingProduct ? 'Update Listing' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ManufacturerDashboard

// import React, { useEffect, useState } from 'react'
// import { supabase } from '@/lib/supabase'
// import { Manufacturer, Product, Order, OrderStatus, Complaint } from '@/types'

// interface ManufacturerDashboardProps {
//   onUpdateOrderStatus?: (orderId: string, newStatus: OrderStatus) => void
//   onFileComplaint?: (complaint: Partial<Complaint>) => void
// }

// const ManufacturerDashboard: React.FC<ManufacturerDashboardProps> = ({
//   onUpdateOrderStatus,
//   onFileComplaint
// }) => {
//   const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null)
//   const [products, setProducts] = useState<Product[]>([])
//   const [orders, setOrders] = useState<Order[]>([])
//   const [loading, setLoading] = useState(true)

//   const [isFormOpen, setIsFormOpen] = useState(false)
//   const [editingProduct, setEditingProduct] = useState<Product | null>(null)

//   /* =========================
//      DATA LOADING
//   ========================= */
//   useEffect(() => {
//     const loadDashboard = async () => {
//       setLoading(true)

//       const {
//         data: { user },
//         error: userError
//       } = await supabase.auth.getUser()

//       if (userError || !user) {
//         console.error('No authenticated user')
//         setLoading(false)
//         return
//       }

//       // 1. Get manufacturer by logged-in user
//       const { data: manufacturerData, error: manufacturerError } =
//         await supabase
//           .from('manufacturers')
//           .select('*')
//           .eq('user_id', user.id)
//           .single()

//       if (manufacturerError || !manufacturerData) {
//         console.error('Manufacturer not found')
//         setLoading(false)
//         return
//       }

//       setManufacturer(manufacturerData)

//       // 2. Get products
//       const { data: productData } = await supabase
//         .from('products')
//         .select('*')
//         .eq('manufacturer_id', manufacturerData.id)
//         .order('created_at', { ascending: false })

//       setProducts(productData || [])

//       // 3. Get orders
//       const { data: orderData } = await supabase
//         .from('orders')
//         .select('*')
//         .eq('manufacturer_id', manufacturerData.id)
//         .order('created_at', { ascending: false })

//       setOrders(orderData || [])

//       setLoading(false)
//     }

//     loadDashboard()
//   }, [])

//   /* =========================
//      HANDLERS
//   ========================= */

//   const handleSaveProduct = async (
//     formData: Partial<Product>,
//     editingProduct: Product | null
//   ) => {
//     if (!manufacturer) return

//     const payload = {
//       name: formData.name,
//       description: formData.description,
//       price: formData.price,
//       retail_price_estimation: formData.retailPriceEstimation,
//       category: formData.category,
//       stock: formData.stock,
//       image_url: formData.imageUrl,
//       specifications: formData.specifications || {},
//       manufacturer_id: manufacturer.id
//     }

//     // -----------------------------
//     // UPDATE EXISTING PRODUCT
//     // -----------------------------
//     if (editingProduct) {
//       const { data, error } = await supabase
//         .from('products')
//         .update(payload)
//         .eq('id', editingProduct.id)
//         .select()
//         .single()

//       if (error) {
//         console.error('Product update failed:', error)
//         return
//       }

//       setProducts(prev =>
//         prev.map(p => (p.id === data.id ? data : p))
//       )

//       setIsFormOpen(false)
//       setEditingProduct(null)
//       return
//     }

//     // -----------------------------
//     // CREATE NEW PRODUCT
//     // -----------------------------
//     const { data, error } = await supabase
//       .from('products')
//       .insert(payload)
//       .select()
//       .single()

//     if (error) {
//       console.error('Product creation failed:', error)
//       return
//     }

//     setProducts(prev => [data, ...prev])
//     setIsFormOpen(false)
//   }

//   const handleEditProduct = (product: Product) => {
//     setEditingProduct(product)
//     setIsFormOpen(true)
//   }

//   const handleAddNew = () => {
//     setEditingProduct(null)
//     setIsFormOpen(true)
//   }

//   const handleCloseForm = () => {
//     setIsFormOpen(false)
//     setEditingProduct(null)
//   }

//   /* =========================
//      DERIVED DATA
//   ========================= */
//   const pendingPayments = orders.filter(o => o.status === 'awaiting_verification')
//   const activeOrders = orders.filter(
//     o => o.status === 'processing' || o.status === 'shipped'
//   )

//   /* =========================
//      GUARDS
//   ========================= */
//   if (loading) {
//     return (
//       <div className="py-24 text-center text-slate-400 font-medium">
//         Loading manufacturer dashboard…
//       </div>
//     )
//   }

//   if (!manufacturer) {
//     return (
//       <div className="py-24 text-center text-red-500 font-medium">
//         Manufacturer profile not found.
//       </div>
//     )
//   }

//   /* =========================
//      UI (UNCHANGED)
//   ========================= */
//   return (
//     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
//       {/* HEADER */}
//       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900">
//             Factory Hub: {manufacturer.companyName}
//           </h1>
//           <p className="text-slate-500">
//             Manage your production line and direct-to-consumer sales.
//           </p>
//         </div>

//         <button
//           onClick={handleAddNew}
//           className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
//         >
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
//           </svg>
//           Add New Product
//         </button>
//       </div>

//       {/* STATS */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
//           <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
//             Total Revenue
//           </p>
//           <h2 className="text-4xl font-black text-slate-900">
//             ${manufacturer?.revenue?.toLocaleString()}
//           </h2>
//         </div>

//         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
//           <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
//             Items Sold
//           </p>
//           <h2 className="text-4xl font-black text-slate-900">
//             {manufacturer?.totalSales?.toLocaleString()}
//           </h2>
//         </div>

//         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
//           <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
//             Active Listings
//           </p>
//           <h2 className="text-4xl font-black text-slate-900">
//             {products.length}
//           </h2>
//         </div>
//       </div>

//       {/* PRODUCT TABLE */}
//       <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
//         <div className="p-8 border-b border-slate-50">
//           <h3 className="text-xl font-black text-slate-900">My Product Catalogue</h3>
//         </div>

//         <table className="w-full text-left">
//           <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
//             <tr>
//               <th className="px-8 py-4">Product</th>
//               <th className="px-8 py-4">Price</th>
//               <th className="px-8 py-4">Stock</th>
//               <th className="px-8 py-4">Actions</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-50">
//             {products.map(p => (
//               <tr key={p.id}>
//                 <td className="px-8 py-5 flex items-center gap-3">
//                   <img
//                     src={p.imageUrl}
//                     className="w-10 h-10 rounded-lg object-cover"
//                   />
//                   <span className="font-bold">{p.name}</span>
//                 </td>
//                 <td className="px-8 py-5 font-bold">${p.price.toFixed(2)}</td>
//                 <td className="px-8 py-5">{p.stock} units</td>
//                 <td className="px-8 py-5">
//                   <button onClick={() => handleEditProduct(p)}>✏️</button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {isFormOpen && (
//         <ProductForm
//           editingProduct={editingProduct}
//           manufacturerId={manufacturer.id}
//           onSave={handleSaveProduct}
//           onCancel={handleCloseForm}
//         />
//       )}
//     </div>
//   )
// }


// /* =========================
//    PRODUCT FORM
// ========================= */
// interface ProductFormProps {
//   manufacturerId: string
//   editingProduct: Product | null
//   onSave: (formData: Partial<Product>, editingProduct: Product | null) => void
//   onCancel: () => void
// }

// const ProductForm: React.FC<ProductFormProps> = ({
//   manufacturerId,
//   editingProduct,
//   onSave,
//   onCancel
// }) => {
//   const [formData, setFormData] = useState<Partial<Product>>(editingProduct || {
//     name: '',
//     description: '',
//     price: 0,
//     retailPriceEstimation: 0,
//     category: 'Home & Kitchen',
//     stock: 0,
//     imageUrl: 'https://picsum.photos/seed/product/400/300',
//     specifications: {}
//   })

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault()
//     onSave(formData, editingProduct)
//   }

//   return (
//     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//       <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onCancel} />
//       <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
//         <div className="p-8 border-b border-slate-50">
//           <h2 className="text-2xl font-black text-slate-900">{editingProduct ? 'Edit Listing' : 'New Direct Listing'}</h2>
//         </div>
        
//         <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
//           {/* Product Name & Category */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div>
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Product Name</label>
//               <input 
//                 required
//                 type="text" 
//                 value={formData.name}
//                 onChange={e => setFormData({...formData, name: e.target.value})}
//                 className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
//                 placeholder="e.g. Handmade Silk Scarf"
//               />
//             </div>
//             <div>
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</label>
//               <select 
//                 value={formData.category}
//                 onChange={e => setFormData({...formData, category: e.target.value})}
//                 className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
//               >
//                 <option>Home & Kitchen</option>
//                 <option>Accessories</option>
//                 <option>Apparel</option>
//                 <option>Tech</option>
//               </select>
//             </div>
//           </div>

//           {/* Description */}
//           <div>
//             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Description</label>
//             <textarea 
//               required
//               rows={3}
//               value={formData.description}
//               onChange={e => setFormData({...formData, description: e.target.value})}
//               className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
//               placeholder="Tell shoppers why this is better direct from the source..."
//             />
//           </div>

//           {/* Prices & Stock */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             <div>
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Direct Price ($)</label>
//               <input 
//                 required
//                 type="number" 
//                 step="0.01"
//                 value={formData.price}
//                 onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
//                 className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-bold"
//               />
//             </div>
//             <div>
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Est. Retail Price ($)</label>
//               <input 
//                 required
//                 type="number" 
//                 step="0.01"
//                 value={formData.retailPriceEstimation}
//                 onChange={e => setFormData({...formData, retailPriceEstimation: parseFloat(e.target.value)})}
//                 className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
//               />
//             </div>
//             <div>
//               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Initial Stock</label>
//               <input 
//                 required
//                 type="number" 
//                 value={formData.stock}
//                 onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}
//                 className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
//               />
//             </div>
//           </div>

//           {/* Image URL */}
//           <div>
//             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Product Image URL</label>
//             <input 
//               type="text" 
//               value={formData.imageUrl}
//               onChange={e => setFormData({...formData, imageUrl: e.target.value})}
//               className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
//               placeholder="https://..."
//             />
//           </div>

//           {/* Form Actions */}
//           <div className="pt-6 border-t border-slate-50 flex gap-4">
//             <button 
//               type="button" 
//               onClick={onCancel}
//               className="flex-grow py-4 rounded-2xl border border-slate-200 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
//             >
//               Discard Changes
//             </button>
//             <button 
//               type="submit"
//               className="flex-[2] py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
//             >
//               {editingProduct ? 'Update Listing' : 'Publish Direct Listing'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   )
// }

// export default ManufacturerDashboard;