
// import React, { useState } from 'react';
// import { User, Order, OrderStatus, Complaint } from '../types';

// interface ProfilePageProps {
//   user: User;
//   orders: Order[];
//   onSignOut: () => void;
//   onFileComplaint: (complaint: Partial<Complaint>) => void;
// }

// const ProfilePage: React.FC<ProfilePageProps> = ({ user, orders, onSignOut, onFileComplaint }) => {
//   const [complaintModal, setComplaintModal] = useState<{ isOpen: boolean, orderId?: string, toUserId?: string }>({ isOpen: false });
//   const [complaintText, setComplaintText] = useState('');

//   const getStatusStyle = (status: OrderStatus) => {
//     switch (status) {
//       case 'awaiting_verification': return 'bg-amber-50 text-amber-600 border-amber-100';
//       case 'processing': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
//       case 'shipped': return 'bg-blue-50 text-blue-600 border-blue-100';
//       case 'delivered': return 'bg-green-50 text-green-600 border-green-100';
//       case 'declined': return 'bg-red-50 text-red-600 border-red-100';
//       default: return 'bg-slate-50 text-slate-400 border-slate-100';
//     }
//   };

//   const handleSendComplaint = () => {
//     onFileComplaint({
//       orderId: complaintModal.orderId,
//       toUserId: complaintModal.toUserId,
//       subject: `Order Issue: ${complaintModal.orderId}`,
//       message: complaintText
//     });
//     setComplaintModal({ isOpen: false });
//     setComplaintText('');
//     alert("Complaint filed. Platform admin will review shortly.");
//   };

//   const pendingOrders = orders.filter(o => ['pending_payment', 'awaiting_verification', 'processing'].includes(o.status));
//   const pastOrders = orders.filter(o => ['shipped', 'delivered', 'declined'].includes(o.status));

//   return (
//     <div className="max-w-5xl mx-auto py-12 px-4 animate-in fade-in duration-500">
//       <div className="bg-slate-900 rounded-[3rem] p-10 mb-12 relative overflow-hidden text-white">
//         <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
//           <div className="w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center text-4xl font-black border-4 border-slate-800 shadow-2xl">
//             {user.name.charAt(0)}
//           </div>
//           <div className="text-center md:text-left">
//             <h1 className="text-4xl font-black mb-1">{user.name}</h1>
//             <p className="text-slate-400 font-medium mb-4">{user.email}</p>
//             <button onClick={onSignOut} className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/30">Sign Out</button>
//           </div>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
//         <div className="lg:col-span-2 space-y-8">
//           <div>
//             <h2 className="text-2xl font-black text-slate-900 mb-6">Production Logistics ({pendingOrders.length})</h2>
//             <div className="space-y-4">
//               {pendingOrders.map(order => (
//                 <div key={order.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
//                   <div className="flex justify-between items-start mb-6">
//                     <div>
//                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order ID: {order.id}</p>
//                       <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
//                     </div>
//                     <div className="flex gap-2">
//                        <button 
//                         onClick={() => setComplaintModal({ isOpen: true, orderId: order.id, toUserId: order.manufacturerId })}
//                         className="bg-red-50 text-red-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100"
//                       >
//                         Report Issue
//                       </button>
//                       <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${getStatusStyle(order.status)}`}>
//                         {order.status.replace('_', ' ')}
//                       </span>
//                     </div>
//                   </div>
//                   <div className="flex justify-between items-center pt-4 border-t border-slate-50">
//                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.paymentMethod.replace('_', ' ')}</p>
//                     <p className="font-black text-slate-900 text-lg">${order.totalAmount.toFixed(2)}</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>

//       {complaintModal.isOpen && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setComplaintModal({ isOpen: false })} />
//           <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in duration-300">
//             <h3 className="text-xl font-black text-slate-900 mb-4">File a Direct Complaint</h3>
//             <p className="text-slate-500 text-sm mb-6">Our admin team will investigate this report regarding order {complaintModal.orderId}.</p>
//             <textarea 
//               value={complaintText}
//               onChange={(e) => setComplaintText(e.target.value)}
//               className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-6 outline-none focus:ring-2 focus:ring-red-500/20"
//               placeholder="Describe the issue in detail..."
//             />
//             <div className="flex gap-4">
//               <button 
//                 onClick={handleSendComplaint}
//                 className="flex-grow bg-red-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-100"
//               >
//                 Send to Admin
//               </button>
//               <button 
//                 onClick={() => setComplaintModal({ isOpen: false })}
//                 className="px-6 py-3 border border-slate-200 text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest"
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

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Order, OrderStatus } from '../types';

interface ProfilePageProps {
  user: User;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [complaintText, setComplaintText] = useState('');
  const [complaintModal, setComplaintModal] = useState<{
    isOpen: boolean;
    orderId?: string;
    toUserId?: string;
  }>({ isOpen: false });

  /* -----------------------------
     Fetch Orders
  ----------------------------- */
  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      if (!error && data) setOrders(data as Order[]);
      setLoading(false);
    };

    fetchOrders();
  }, [user?.id]);

  /* -----------------------------
     Helpers
  ----------------------------- */
  const getStatusStyle = (status: "awaiting_verification" | "processing" | "shipped" | "delivered" | "declined") => {
    switch (status) {
      case 'awaiting_verification':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'processing':
        return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'shipped':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'delivered':
        return 'bg-green-50 text-green-600 border-green-100';
      case 'declined':
        return 'bg-red-50 text-red-600 border-red-100';
      default:
        return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  /* -----------------------------
     Actions
  ----------------------------- */
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleSendComplaint = async () => {
    if (!complaintText.trim()) return;

    await supabase.from('complaints').insert({
      order_id: complaintModal.orderId,
      from_user_id: user?.id,
      to_user_id: complaintModal.toUserId,
      subject: `Order Issue: ${complaintModal.orderId}`,
      message: complaintText,
      status: 'open'
    });

    setComplaintModal({ isOpen: false });
    setComplaintText('');
    alert('Complaint filed. Platform admin will review shortly.');
  };

  /* -----------------------------
     Derived Data
  ----------------------------- */
  const pendingOrders = orders.filter(o =>
    ['pending_payment', 'awaiting_verification', 'processing'].includes(o.status)
  );

  /* -----------------------------
     Render
  ----------------------------- */
  return (
    <div className="max-w-5xl mx-auto py-12 px-4 animate-in fade-in duration-500">
      <div className="bg-slate-900 rounded-[3rem] p-10 mb-12 text-white">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center text-4xl font-black border-4 border-slate-800">
            {user?.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-4xl font-black">{user?.name}</h1>
            <p className="text-slate-400 mb-4">{user?.email}</p>
            <button
              onClick={handleSignOut}
              className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-500/30"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-black mb-6">
        Production Logistics ({pendingOrders?.length})
      </h2>

      {loading && <p className="text-slate-400">Loading orders…</p>}

      <div className="space-y-4">
        {pendingOrders?.map(order => (
          <div key={order.id} className="bg-white p-6 rounded-[2rem] border shadow-sm">
            <div className="flex justify-between mb-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">
                  Order ID: {order.id}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(order?.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setComplaintModal({
                      isOpen: true,
                      orderId: order?.id,
                      toUserId: order?.manufacturer_id
                    })
                  }
                  className="bg-red-50 text-red-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase border"
                >
                  Report Issue
                </button>
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase ${getStatusStyle(order?.status)}`}
                >
                  {order?.status?.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <p className="text-[10px] font-black text-slate-400 uppercase">
                {order?.payment_method?.replace('_', ' ')}
              </p>
              <p className="font-black text-lg">
                ${order.total_amount?.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {complaintModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setComplaintModal({ isOpen: false })}
          />
          <div className="relative bg-white w-full max-w-md rounded-3xl p-8">
            <h3 className="text-xl font-black mb-4">File a Complaint</h3>
            <textarea
              value={complaintText}
              onChange={e => setComplaintText(e.target.value)}
              className="w-full h-32 p-4 bg-slate-50 border rounded-2xl mb-6"
              placeholder="Describe the issue in detail..."
            />
            <div className="flex gap-4">
              <button
                onClick={handleSendComplaint}
                className="flex-grow bg-red-600 text-white py-3 rounded-xl font-black text-xs uppercase"
              >
                Send
              </button>
              <button
                onClick={() => setComplaintModal({ isOpen: false })}
                className="px-6 py-3 border rounded-xl font-black text-xs uppercase"
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

