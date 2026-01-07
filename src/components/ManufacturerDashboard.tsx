
// import React, { useState } from 'react';
// // Added Complaint to the imported types
// import { Manufacturer, Product, Order, OrderStatus, Complaint } from '../types';

// interface ManufacturerDashboardProps {
//   manufacturer: Manufacturer;
//   products: Product[];
//   orders: Order[];
//   onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
//   onSaveProduct: (product: Product) => void;
//   // Added onFileComplaint to the props interface to match usage in App.tsx
//   onFileComplaint: (complaint: Partial<Complaint>) => void;
// }

// const ManufacturerDashboard: React.FC<ManufacturerDashboardProps> = ({ 
//   manufacturer, 
//   products, 
//   orders, 
//   onUpdateOrderStatus,
//   onSaveProduct,
//   // Added onFileComplaint to the destructured props
//   onFileComplaint
// }) => {
//   const [isFormOpen, setIsFormOpen] = useState(false);
//   const [editingProduct, setEditingProduct] = useState<Product | null>(null);

//   const pendingPayments = orders.filter(o => o.status === 'awaiting_verification');
//   const activeOrders = orders.filter(o => o.status === 'processing' || o.status === 'shipped');

//   const handleEditProduct = (product: Product) => {
//     setEditingProduct(product);
//     setIsFormOpen(true);
//   };

//   const handleAddNew = () => {
//     setEditingProduct(null);
//     setIsFormOpen(true);
//   };

//   const handleCloseForm = () => {
//     setIsFormOpen(false);
//     setEditingProduct(null);
//   };

//   return (
//     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
//       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900">Factory Hub: {manufacturer?.companyName}</h1>
//           <p className="text-slate-500">Manage your production line and direct-to-consumer sales.</p>
//         </div>
//         <button 
//           onClick={handleAddNew}
//           className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
//         >
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
//           Add New Product
//         </button>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
//           <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
//           <h2 className="text-4xl font-black text-slate-900">${manufacturer?.revenue.toLocaleString()}</h2>
//           <p className="text-xs text-green-500 font-bold mt-2">↑ 12% from last month</p>
//         </div>
//         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
//           <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Items Sold</p>
//           <h2 className="text-4xl font-black text-slate-900">{manufacturer?.totalSales.toLocaleString()}</h2>
//           <p className="text-xs text-indigo-500 font-bold mt-2">Factory Direct Efficient</p>
//         </div>
//         <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
//           <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Active Listings</p>
//           <h2 className="text-4xl font-black text-slate-900">{products.length}</h2>
//           <p className="text-xs text-slate-400 font-bold mt-2">All inventory synced</p>
//         </div>
//       </div>

//       {/* Payment Verifications Queue */}
//       {pendingPayments.length > 0 && (
//         <div className="bg-amber-50 rounded-[2.5rem] border border-amber-100 overflow-hidden shadow-sm">
//            <div className="p-8 border-b border-amber-100 flex justify-between items-center">
//             <h3 className="text-xl font-black text-amber-900 flex items-center gap-2">
//               Pending Payment Verifications
//               <span className="bg-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded-full">{pendingPayments.length}</span>
//             </h3>
//           </div>
//           <div className="divide-y divide-amber-100">
//             {pendingPayments.map(order => (
//               <div key={order.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-amber-100/50 transition-colors">
//                 <div className="flex-grow">
//                   <div className="flex items-center gap-2 mb-1">
//                     <p className="font-black text-amber-900">{order.accountName}</p>
//                     <span className="text-xs text-amber-600 font-bold uppercase tracking-widest">ID: {order.transactionId}</span>
//                   </div>
//                   <p className="text-xs text-amber-700 font-medium">Transferred ${order.totalAmount.toFixed(2)} for {order.items.length} items</p>
//                 </div>
//                 <div className="flex gap-2">
//                   <button 
//                     onClick={() => onUpdateOrderStatus(order.id, 'processing')}
//                     className="bg-green-600 text-white px-5 py-2 rounded-xl text-xs font-black hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
//                   >
//                     Confirm Payment
//                   </button>
//                   <button 
//                     onClick={() => onUpdateOrderStatus(order.id, 'declined')}
//                     className="bg-white text-red-600 border border-red-100 px-5 py-2 rounded-xl text-xs font-black hover:bg-red-50 transition-colors"
//                   >
//                     Decline
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* Main Order Queue */}
//       <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
//         <div className="p-8 border-b border-slate-50 flex justify-between items-center">
//           <h3 className="text-xl font-black text-slate-900">Direct-to-Consumer Orders</h3>
//           <button className="text-indigo-600 font-bold text-sm">View Archive</button>
//         </div>
//         <div className="overflow-x-auto">
//           <table className="w-full text-left">
//             <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
//               <tr>
//                 <th className="px-8 py-4">Customer</th>
//                 <th className="px-8 py-4">Items</th>
//                 <th className="px-8 py-4">Status</th>
//                 <th className="px-8 py-4">Total</th>
//                 <th className="px-8 py-4">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {activeOrders.length > 0 ? activeOrders.map(order => (
//                 <tr key={order.id} className="hover:bg-slate-50 transition-colors">
//                   <td className="px-8 py-5">
//                     <p className="font-bold text-slate-900">User_{order.customerId.substring(0,4)}</p>
//                   </td>
//                   <td className="px-8 py-5">
//                     <p className="text-xs text-slate-500 font-bold">{order.items.length} items</p>
//                   </td>
//                   <td className="px-8 py-5">
//                     <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${order.status === 'processing' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
//                       {order.status}
//                     </span>
//                   </td>
//                   <td className="px-8 py-5 font-bold text-slate-700">${order.totalAmount.toFixed(2)}</td>
//                   <td className="px-8 py-5">
//                     {order.status === 'processing' && (
//                       <button 
//                         onClick={() => onUpdateOrderStatus(order.id, 'shipped')}
//                         className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
//                       >
//                         Mark as Shipped
//                       </button>
//                     )}
//                   </td>
//                 </tr>
//               )) : (
//                 <tr>
//                   <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No active shipments in queue</td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
      
//       {/* Product Management Section */}
//       <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
//         <div className="p-8 border-b border-slate-50">
//           <h3 className="text-xl font-black text-slate-900">My Product Catalogue</h3>
//         </div>
//         <div className="overflow-x-auto">
//           <table className="w-full text-left">
//             <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
//               <tr>
//                 <th className="px-8 py-4">Product</th>
//                 <th className="px-8 py-4">Price</th>
//                 <th className="px-8 py-4">Stock</th>
//                 <th className="px-8 py-4">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {products?.map(p => (
//                 <tr key={p.id} className="hover:bg-slate-50 transition-colors">
//                   <td className="px-8 py-5">
//                     <div className="flex items-center gap-3">
//                       <img src={p.imageUrl} className="w-10 h-10 rounded-lg object-cover" alt={p?.name} />
//                       <span className="font-bold text-slate-900">{p?.name}</span>
//                     </div>
//                   </td>
//                   <td className="px-8 py-5 font-bold text-slate-700">${p?.price.toFixed(2)}</td>
//                   <td className="px-8 py-5">
//                     <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${p?.stock < 100 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
//                       {p?.stock} units
//                     </span>
//                   </td>
//                   <td className="px-8 py-5">
//                     <button 
//                       onClick={() => handleEditProduct(p)}
//                       className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
//                     >
//                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {isFormOpen && (
//         <ProductForm 
//           manufacturerId={manufacturer?.id}
//           editingProduct={editingProduct} 
//           onSave={(p) => { onSaveProduct(p); handleCloseForm(); }} 
//           onCancel={handleCloseForm} 
//         />
//       )}
//     </div>
//   );
// };

// interface ProductFormProps {
//   manufacturerId: string;
//   editingProduct: Product | null;
//   onSave: (p: Product) => void;
//   onCancel: () => void;
// }

// const ProductForm: React.FC<ProductFormProps> = ({ manufacturerId, editingProduct, onSave, onCancel }) => {
//   const [formData, setFormData] = useState<Partial<Product>>(editingProduct || {
//     name: '',
//     description: '',
//     price: 0,
//     retailPriceEstimation: 0,
//     category: 'Home & Kitchen',
//     stock: 0,
//     imageUrl: 'https://picsum.photos/seed/product/400/300',
//     specifications: {}
//   });

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     const product: Product = {
//       ...formData as Product,
//       id: editingProduct?.id || 'p-' + Math.random().toString(36).substring(2, 9),
//       manufacturerId: manufacturerId,
//     };
//     onSave(product);
//   };

//   return (
//     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//       <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onCancel} />
//       <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
//         <div className="p-8 border-b border-slate-50">
//           <h2 className="text-2xl font-black text-slate-900">{editingProduct ? 'Edit Listing' : 'New Direct Listing'}</h2>
//         </div>
        
//         <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
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
//   );
// };

// export default ManufacturerDashboard;

// import React, { useState } from 'react'
import * as React from 'react';
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Product {
  id?: string
  name: string
  description: string
  price: number
  retailPrice?: number
  category: string
  imageUrl: string
  manufacturerId: string
}

interface ManufacturerDashboardProps {
  manufacturerId: string
  product?: Product
  onSaveProduct: (product: Product) => void
  onCancel: () => void
}

const ManufacturerDashboard: React.FC<ManufacturerDashboardProps> = ({
  manufacturerId,
  product,
  onSaveProduct,
  onCancel
}) => {
  const [formData, setFormData] = useState<Product>({
    id: product?.id,
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    retailPrice: product?.retailPrice || 0,
    category: product?.category || '',
    imageUrl: product?.imageUrl || '',
    manufacturerId
  })

  const [loading, setLoading] = useState(false)
  const isEdit = Boolean(product?.id)

  /* --------------------------------
     Save Product (CREATE / UPDATE)
  --------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let savedProduct: Product | null = null

      if (isEdit) {
        const { data, error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            description: formData.description,
            price: formData.price,
            retail_price: formData.retailPrice,
            category: formData.category,
            image_url: formData.imageUrl
          })
          .eq('id', formData.id)
          .select('*')
          .single()

        if (error) throw error
        savedProduct = data as Product
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([
            {
              name: formData.name,
              description: formData.description,
              price: formData.price,
              retail_price: formData.retailPrice,
              category: formData.category,
              image_url: formData.imageUrl,
              manufacturer_id: manufacturerId
            }
          ])
          .select('*')
          .single()

        if (error) throw error
        savedProduct = data as Product
      }

      if (!savedProduct) {
        throw new Error('Failed to save product')
      }

      onSaveProduct(savedProduct)
    } catch (err: any) {
      alert(err.message || 'Product save failed')
    } finally {
      setLoading(false)
    }
  }

  /* --------------------------------
     UI (UNCHANGED)
  --------------------------------- */
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-black text-slate-400 uppercase mb-1">
          Product Name
        </label>
        <input
          required
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border"
        />
      </div>

      <div>
        <label className="block text-xs font-black text-slate-400 uppercase mb-1">
          Description
        </label>
        <textarea
          required
          rows={3}
          value={formData.description}
          onChange={e =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="w-full px-4 py-3 rounded-xl border"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase mb-1">
            Factory Price
          </label>
          <input
            type="number"
            required
            value={formData.price}
            onChange={e =>
              setFormData({ ...formData, price: Number(e.target.value) })
            }
            className="w-full px-4 py-3 rounded-xl border"
          />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 uppercase mb-1">
            Retail Price
          </label>
          <input
            type="number"
            value={formData.retailPrice}
            onChange={e =>
              setFormData({
                ...formData,
                retailPrice: Number(e.target.value)
              })
            }
            className="w-full px-4 py-3 rounded-xl border"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-black text-slate-400 uppercase mb-1">
          Category
        </label>
        <input
          value={formData.category}
          onChange={e =>
            setFormData({ ...formData, category: e.target.value })
          }
          className="w-full px-4 py-3 rounded-xl border"
        />
      </div>

      {/* IMAGE URL INPUT — PRESERVED */}
      <div>
        <label className="block text-xs font-black text-slate-400 uppercase mb-1">
          Product Image URL
        </label>
        <input
          type="text"
          value={formData.imageUrl}
          onChange={e =>
            setFormData({ ...formData, imageUrl: e.target.value })
          }
          className="w-full px-4 py-3 rounded-xl border"
          placeholder="https://..."
        />
      </div>

      {formData.imageUrl && (
        <img
          src={formData.imageUrl}
          alt="Preview"
          className="w-full h-40 object-cover rounded-xl border"
        />
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black"
        >
          {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Add Product'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-slate-100 py-3 rounded-xl font-black"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default ManufacturerDashboard
