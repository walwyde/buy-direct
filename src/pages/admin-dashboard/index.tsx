'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Manufacturer, UserRole, Complaint, Order } from '@/types';
import toast from 'react-hot-toast';
import { Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'network' | 'complaints' | 'history'>('network');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [adminResponse, setAdminResponse] = useState('');


  const router = useRouter();
  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch users (profiles)
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch manufacturers
      const { data: manufacturersData, error: manufacturersError } = await supabase
        .from('manufacturers')
        .select('*')
        .order('created_at', { ascending: false });

      if (manufacturersError) throw manufacturersError;

      // Fetch complaints
      const { data: complaintsData, error: complaintsError } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (complaintsError) throw complaintsError;

      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Transform data to match your types
      const transformedUsers: User[] = (usersData || []).map(user => ({
        id: user.id,
        name: user.name || user.email?.split('@')[0] || 'User',
        email: user.email,
        role: user.role as UserRole,
        status: user.status || 'active'
      }));

      const transformedManufacturers: Manufacturer[] = (manufacturersData || []).map(manufacturer => ({
        id: manufacturer.id,
        userId: manufacturer.user_id,
        companyName: manufacturer.company_name,
        location: manufacturer.location,
        verificationStatus: manufacturer.verification_status,
        bio: manufacturer.bio,
        logoUrl: manufacturer.logo_url,
        establishedYear: manufacturer.established_year,
        totalSales: manufacturer.total_sales || 0,
        revenue: manufacturer.revenue || 0,
        createdAt: manufacturer.created_at
      }));

      const transformedComplaints: Complaint[] = (complaintsData || []).map(complaint => ({
        id: complaint.id,
        orderId: complaint.order_id,
        fromUserId: complaint.from_user_id,
        toUserId: complaint.to_user_id,
        subject: complaint.subject,
        message: complaint.message,
        status: complaint.status,
        createdAt: complaint.created_at
      }));

      const transformedOrders: Order[] = (ordersData || []).map(order => ({
        id: order.id,
        customerId: order.customer_id,
        manufacturerId: order.manufacturer_id,
        items: order.items || [],
        totalAmount: order.total_amount,
        status: order.status,
        paymentMethod: order.payment_method,
        transactionId: order.transaction_id,
        accountName: order.account_name,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }));

      setUsers(transformedUsers);
      setManufacturers(transformedManufacturers);
      setComplaints(transformedComplaints);
      setOrders(transformedOrders);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const usersChannel = supabase
      .channel('admin_users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchData();
      })
      .subscribe();

    const manufacturersChannel = supabase
      .channel('admin_manufacturers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manufacturers' }, () => {
        fetchData();
      })
      .subscribe();

    const complaintsChannel = supabase
      .channel('admin_complaints')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        fetchData();
      })
      .subscribe();

    const ordersChannel = supabase
      .channel('admin_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(manufacturersChannel);
      supabase.removeChannel(complaintsChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: newStatus } : u
      ));

      toast.success(`User status updated to ${newStatus}`);
      
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleResolveComplaint = async (complaintId: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: 'resolved' })
        .eq('id', complaintId);

      if (error) throw error;

      // Update local state
      setComplaints(prev => prev.map(c => 
        c.id === complaintId ? { ...c, status: 'resolved' } : c
      ));

      setSelectedComplaint(null);
      toast.success('Complaint resolved successfully');
      
    } catch (error) {
      console.error('Error resolving complaint:', error);
      toast.error('Failed to resolve complaint');
    }
  };

  const handleSendNotification = async (userId: string, title: string, message: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          is_read: false,
          type: 'general',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Notification sent successfully');
      
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    }
  };

  const handleAction = async (type: 'resolve' | 'warn_accused' | 'warn_complainant' | 'ban') => {
    if (!selectedComplaint) return;

    switch (type) {
      case 'resolve':
        await handleResolveComplaint(selectedComplaint.id);
        await handleSendNotification(
          selectedComplaint.fromUserId, 
          "Case Verdict: Resolved", 
          adminResponse || "Our admin team has reviewed your report and a resolution has been issued. This ticket is now closed."
        );
        break;
      case 'warn_accused':
        await handleSendNotification(
          selectedComplaint.toUserId, 
          "Official Warning Issued", 
          adminResponse || "A logistics complaint has been filed against your account. Further violations will lead to permanent suspension."
        );
        toast.success("Warning dispatched successfully");
        break;
      case 'warn_complainant':
        await handleSendNotification(
          selectedComplaint.fromUserId, 
          "Investigation Update", 
          adminResponse || "We are currently gathering data from the manufacturing partner. Your case is being prioritized."
        );
        toast.success("Complainant updated successfully");
        break;
      case 'ban':
        await handleToggleUserStatus(selectedComplaint.toUserId);
        await handleSendNotification(
          selectedComplaint.toUserId, 
          "Logistics Privilege Restricted", 
          "Your account access has been toggled by platform security following a dispute investigation."
        );
        toast.success("Access tier modified");
        break;
    }
    setAdminResponse('');
  };

  const getUserStats = (userId: string) => {
    const userOrders = orders?.filter(o => o.customerId === userId);
    return {
      count: userOrders.length || 0,
      total: userOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0)
    };
  };

  const totalGMV = manufacturers?.reduce((sum, m) => sum + (m.revenue || 0), 0) || 0;
  const openComplaints = complaints?.filter(c => c.status === 'open') || [];
  const closedComplaints = complaints?.filter(c => c.status !== 'open') || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="fixed top-6 left-6 z-10">
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 bg-white text-slate-700 hover:text-indigo-600 font-medium px-4 py-2 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
      >
        <Home className="w-4 h-4" />
        Back to Home
      </button>
    </div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Logistics Control Tower</h1>
          <p className="text-slate-500 font-medium">Verified Direct-to-Consumer Integrity Monitoring.</p>
        </div>
        <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-200 flex items-center gap-3 shadow-sm">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse ring-4 ring-green-100"></span>
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Network Secure</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
          <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Network Volume (GMV)</p>
          <h2 className="text-4xl font-black">${totalGMV?.toLocaleString()}</h2>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Disputes</p>
          <h2 className={`text-4xl font-black ${openComplaints?.length > 0 ? 'text-red-500' : 'text-slate-900'}`}>{openComplaints?.length}</h2>
          {openComplaints?.length > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 -mr-8 -mt-8 rounded-full border border-red-100" />}
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Factory Network</p>
          <h2 className="text-4xl font-black text-slate-900">{manufacturers?.length} verified</h2>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-2 border-b border-slate-50 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50/50">
          <button onClick={() => setActiveTab('network')} className={`whitespace-nowrap px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] rounded-[2rem] transition-all ${activeTab === 'network' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Logistics Ledger</button>
          <button onClick={() => setActiveTab('complaints')} className={`whitespace-nowrap px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] rounded-[2rem] transition-all ${activeTab === 'complaints' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Resolution Hub {openComplaints?.length > 0 && <span className="ml-2 bg-white text-red-600 px-1.5 py-0.5 rounded-full">{openComplaints?.length}</span>}</button>
          <button onClick={() => setActiveTab('history')} className={`whitespace-nowrap px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] rounded-[2rem] transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Case History</button>
        </div>

        <div className="p-8">
          {activeTab === 'network' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">Platform Actor</th>
                    <th className="px-8 py-5">Direct Activity</th>
                    <th className="px-8 py-5">Integrity Status</th>
                    <th className="px-8 py-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users?.map(u => {
                    const stats = getUserStats(u.id);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedUser(u)}>
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">{u.name.charAt(0)}</div>
                            <div>
                              <p className="font-bold text-slate-900">{u.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{u.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-black text-slate-900">{stats.count} Orders</p>
                          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">${stats.total.toLocaleString()} Value</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${u.status === 'active' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>{u.status}</span>
                        </td>
                        <td className="px-8 py-5">
                          <button onClick={() => setSelectedUser(u)} className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] hover:underline">Full Audit</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'complaints' && (
            <div className="space-y-6">
              {openComplaints?.length === 0 ? (
                <div className="py-24 text-center">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Integrity Score: 100%</p>
                  <p className="text-slate-500 mt-2 font-medium">All active direct shipments are proceeding without reported disputes.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {openComplaints?.map(c => (
                    <div key={c.id} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 shadow-sm border-l-4 border-l-red-500 hover:shadow-lg transition-all">
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="bg-red-50 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em]">Dispute Ticket #{c.id}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">By {users?.find(u => u.id === c.fromUserId)?.name}</span>
                        </div>
                        <h4 className="text-xl font-black text-slate-900 mb-2">{c.subject}</h4>
                        <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed italic">"{c.message}"</p>
                      </div>
                      <button 
                        onClick={() => setSelectedComplaint(c)} 
                        className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
                      >
                        Enter Resolution Space
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
             <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">Case</th>
                    <th className="px-8 py-5">Parties</th>
                    <th className="px-8 py-5">Outcome</th>
                    <th className="px-8 py-5">Closure Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {closedComplaints.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-900">{c.subject}</p>
                        <p className="text-[9px] uppercase tracking-widest text-slate-400">ID: {c.id}</p>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-2 text-xs font-medium">
                            <span className="text-indigo-600">{users?.find(u => u.id === c.fromUserId)?.name}</span>
                            <span className="text-slate-300">→</span>
                            <span className="text-slate-900">{users?.find(u => u.id === c.toUserId)?.name}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${c.status === 'resolved' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-[10px] font-black text-slate-400 tracking-widest uppercase">{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* COMPLAINT ACTION PAGE / WORKSPACE MODAL */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md shadow-2xl" onClick={() => setSelectedComplaint(null)} />
          <div className="relative bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] bg-indigo-100/50 px-4 py-1.5 rounded-full">Resolution Intervention Workspace</span>
                <h3 className="text-3xl font-black text-slate-900 mt-6 tracking-tight">Case #T-{selectedComplaint.id.substring(4)}</h3>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-10 space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Evidence Section */}
                <div className="space-y-8">
                  <div className="bg-red-50 p-10 rounded-[2.5rem] border border-red-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-100/50 rounded-full -mr-12 -mt-12" />
                    <h5 className="text-[11px] font-black text-red-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      Verified Statement
                    </h5>
                    <p className="font-black text-slate-900 text-2xl mb-4 leading-tight">{selectedComplaint.subject}</p>
                    <p className="text-slate-700 text-lg leading-relaxed italic bg-white/60 p-8 rounded-3xl shadow-inner border border-red-100/30 font-medium">"{selectedComplaint.message}"</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Order Association</p>
                      <p className="font-black text-indigo-600 text-xl">{selectedComplaint.orderId || 'Direct-Connect'}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Initial Filing</p>
                      <p className="font-black text-slate-900 text-xl">{new Date(selectedComplaint.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Party Intelligence Section */}
                <div className="space-y-8">
                   {(() => {
                    const accusedUser = users?.find(u => u.id === selectedComplaint.toUserId);
                    const stats = getUserStats(selectedComplaint.toUserId);
                    return (
                      <div className="bg-slate-900 p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full -mr-20 -mt-20" />
                        <h5 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-8 relative z-10">Defendant Intelligence Snapshot</h5>
                        <div className="flex items-center gap-8 mb-10 relative z-10">
                          <div className="w-20 h-20 rounded-[1.5rem] bg-indigo-500 text-white flex items-center justify-center font-black text-4xl shadow-xl border-4 border-slate-800 ring-1 ring-slate-700">{accusedUser?.name.charAt(0)}</div>
                          <div>
                            <p className="font-black text-3xl mb-1 tracking-tight">{accusedUser?.name}</p>
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{accusedUser?.email}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8 relative z-10">
                          <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 text-center">
                            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-2">Lifetime Impact</p>
                            <p className="text-3xl font-black">${stats.total.toLocaleString()}</p>
                          </div>
                          <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 text-center">
                            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-2">Network Health</p>
                            <p className="text-2xl font-black uppercase tracking-widest">{accusedUser?.status}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* ACTION PAGE INTERVENTION CONSOLE */}
              <div className="pt-12 border-t border-slate-100">
                <div className="flex justify-between items-center mb-8">
                   <h5 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2">
                     <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                     Admin Intervention Console
                   </h5>
                   <div className="flex gap-2">
                     <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Recorded Verdict Required</span>
                   </div>
                </div>
                
                <textarea 
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Draft the official platform response here. This statement will be dispatched to the consumer and recorded in the logistics ledger permanently."
                  className="w-full h-48 p-10 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 mb-10 transition-all font-medium text-slate-700 text-xl shadow-inner placeholder:text-slate-300"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   <button 
                    onClick={() => handleAction('warn_complainant')}
                    className="group py-6 bg-white border-2 border-slate-100 text-slate-600 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:border-indigo-600 hover:text-indigo-600 transition-all flex flex-col items-center gap-3 shadow-sm active:scale-95"
                  >
                    <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Notify Complainant
                  </button>
                  <button 
                    onClick={() => handleAction('warn_accused')}
                    className="group py-6 bg-white border-2 border-slate-100 text-slate-600 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:border-amber-500 hover:text-amber-600 transition-all flex flex-col items-center gap-3 shadow-sm active:scale-95"
                  >
                    <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Warning to Accused
                  </button>
                  <button 
                    onClick={() => handleAction('ban')}
                    className="group py-6 bg-red-50 text-red-600 border-2 border-red-100 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all flex flex-col items-center gap-3 shadow-sm active:scale-95"
                  >
                    <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    Restrict Account
                  </button>
                  <button 
                    onClick={() => handleAction('resolve')}
                    className="group py-6 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-2xl shadow-indigo-100 transition-all flex flex-col items-center gap-3 active:scale-[0.98]"
                  >
                    <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Resolve & Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Insights / Profile Audit Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedUser(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-12 text-center">
              <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-4xl font-black text-indigo-600 mx-auto mb-8 border-4 border-white shadow-xl">
                {selectedUser.name.charAt(0)}
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-2">{selectedUser.name}</h3>
              <p className="text-slate-500 font-medium mb-10">{selectedUser.email}</p>
              
              <div className="grid grid-cols-2 gap-6 mb-12">
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Direct Transactions</p>
                  <h4 className="text-3xl font-black text-slate-900">{getUserStats(selectedUser.id).count}</h4>
                </div>
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Network Value</p>
                  <h4 className="text-3xl font-black text-slate-900">${getUserStats(selectedUser.id).total.toLocaleString()}</h4>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => { handleToggleUserStatus(selectedUser.id); setSelectedUser(null); }}
                  className={`flex-grow py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 ${selectedUser.status === 'active' ? 'bg-red-600 text-white shadow-red-100' : 'bg-green-600 text-white shadow-green-100'}`}
                >
                  {selectedUser.status === 'active' ? 'Restrict Logistics Access' : 'Revoke Suspension'}
                </button>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="px-8 py-5 rounded-2xl border-2 border-slate-100 text-slate-400 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50"
                >
                  Dismiss Audit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;


// import React, { useState } from 'react';
// import { User, Manufacturer, UserRole, Complaint, Order } from '@/types';

// interface AdminDashboardProps {
//   users: User[];
//   manufacturers: Manufacturer[];
//   complaints: Complaint[];
//   orders: Order[];
//   onToggleUserStatus: (userId: string) => void;
//   onResolveComplaint: (complaintId: string) => void;
//   onSendNotification: (userId: string, title: string, message: string) => void;
// }

// const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
//   users, 
//   manufacturers, 
//   complaints, 
//   orders, 
//   onToggleUserStatus,
//   onResolveComplaint,
//   onSendNotification
// }) => {
//   const [activeTab, setActiveTab] = useState<'network' | 'complaints' | 'history'>('network');
//   const [selectedUser, setSelectedUser] = useState<User | null>(null);
//   const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
//   const [adminResponse, setAdminResponse] = useState('');

//   const totalGMV = manufacturers?.reduce((sum, m) => sum + m.revenue, 0);
//   const openComplaints = complaints?.filter(c => c.status === 'open');
//   const closedComplaints = complaints?.filter(c => c.status !== 'open');

//   const getUserStats = (userId: string) => {
//     const userOrders = orders?.filter(o => o.customerId === userId);
//     return {
//       count: userOrders.length,
//       total: userOrders.reduce((s, o) => s + o.totalAmount, 0)
//     };
//   };

//   const handleAction = (type: 'resolve' | 'warn_accused' | 'warn_complainant' | 'ban') => {
//     if (!selectedComplaint) return;

//     switch (type) {
//       case 'resolve':
//         onResolveComplaint(selectedComplaint.id);
//         onSendNotification(selectedComplaint.fromUserId, "Case Verdict: Resolved", adminResponse || "Our admin team has reviewed your report and a resolution has been issued. This ticket is now closed.");
//         setSelectedComplaint(null);
//         break;
//       case 'warn_accused':
//         onSendNotification(selectedComplaint.toUserId, "Official Warning Issued", adminResponse || "A logistics complaint has been filed against your account. Further violations will lead to permanent suspension.");
//         alert("Warning dispatch successful.");
//         break;
//       case 'warn_complainant':
//         onSendNotification(selectedComplaint.fromUserId, "Investigation Update", adminResponse || "We are currently gathering data from the manufacturing partner. Your case is being prioritized.");
//         alert("Complainant update successful.");
//         break;
//       case 'ban':
//         onToggleUserStatus(selectedComplaint.toUserId);
//         onSendNotification(selectedComplaint.toUserId, "Logistics Privilege Restricted", "Your account access has been toggled by platform security following a dispute investigation.");
//         alert("Access tier modified.");
//         break;
//     }
//     setAdminResponse('');
//   };

//   return (
//     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900">Logistics Control Tower</h1>
//           <p className="text-slate-500 font-medium">Verified Direct-to-Consumer Integrity Monitoring.</p>
//         </div>
//         <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-200 flex items-center gap-3 shadow-sm">
//           <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse ring-4 ring-green-100"></span>
//           <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Network Secure</span>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
//           <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Network Volume (GMV)</p>
//           <h2 className="text-4xl font-black">${totalGMV?.toLocaleString()}</h2>
//         </div>
//         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
//           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Disputes</p>
//           <h2 className={`text-4xl font-black ${openComplaints?.length > 0 ? 'text-red-500' : 'text-slate-900'}`}>{openComplaints?.length}</h2>
//           {openComplaints?.length > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 -mr-8 -mt-8 rounded-full border border-red-100" />}
//         </div>
//         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
//           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Factory Network</p>
//           <h2 className="text-4xl font-black text-slate-900">{manufacturers?.length} verified</h2>
//         </div>
//       </div>

//       <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
//         <div className="p-2 border-b border-slate-50 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50/50">
//           <button onClick={() => setActiveTab('network')} className={`whitespace-nowrap px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] rounded-[2rem] transition-all ${activeTab === 'network' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Logistics Ledger</button>
//           <button onClick={() => setActiveTab('complaints')} className={`whitespace-nowrap px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] rounded-[2rem] transition-all ${activeTab === 'complaints' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Resolution Hub {openComplaints?.length > 0 && <span className="ml-2 bg-white text-red-600 px-1.5 py-0.5 rounded-full">{openComplaints?.length}</span>}</button>
//           <button onClick={() => setActiveTab('history')} className={`whitespace-nowrap px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] rounded-[2rem] transition-all ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Case History</button>
//         </div>

//         <div className="p-8">
//           {activeTab === 'network' && (
//             <div className="overflow-x-auto">
//               <table className="w-full text-left">
//                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
//                   <tr>
//                     <th className="px-8 py-5">Platform Actor</th>
//                     <th className="px-8 py-5">Direct Activity</th>
//                     <th className="px-8 py-5">Integrity Status</th>
//                     <th className="px-8 py-5">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {users?.map(u => {
//                     const stats = getUserStats(u.id);
//                     return (
//                       <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
//                         <td className="px-8 py-5">
//                           <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedUser(u)}>
//                             <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">{u.name.charAt(0)}</div>
//                             <div>
//                               <p className="font-bold text-slate-900">{u.name}</p>
//                               <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{u.role}</p>
//                             </div>
//                           </div>
//                         </td>
//                         <td className="px-8 py-5">
//                           <p className="text-xs font-black text-slate-900">{stats.count} Orders</p>
//                           <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">${stats.total.toLocaleString()} Value</p>
//                         </td>
//                         <td className="px-8 py-5">
//                           <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${u.status === 'active' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>{u.status}</span>
//                         </td>
//                         <td className="px-8 py-5">
//                           <button onClick={() => setSelectedUser(u)} className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] hover:underline">Full Audit</button>
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           )}

//           {activeTab === 'complaints' && (
//             <div className="space-y-6">
//               {openComplaints?.length === 0 ? (
//                 <div className="py-24 text-center">
//                   <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
//                     <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
//                   </div>
//                   <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Integrity Score: 100%</p>
//                   <p className="text-slate-500 mt-2 font-medium">All active direct shipments are proceeding without reported disputes.</p>
//                 </div>
//               ) : (
//                 <div className="grid grid-cols-1 gap-6">
//                   {openComplaints?.map(c => (
//                     <div key={c.id} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 shadow-sm border-l-4 border-l-red-500 hover:shadow-lg transition-all">
//                       <div className="flex-grow">
//                         <div className="flex items-center gap-3 mb-4">
//                           <span className="bg-red-50 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em]">Dispute Ticket #{c.id}</span>
//                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">By {users?.find(u => u.id === c.fromUserId)?.name}</span>
//                         </div>
//                         <h4 className="text-xl font-black text-slate-900 mb-2">{c.subject}</h4>
//                         <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed italic">"{c.message}"</p>
//                       </div>
//                       <button 
//                         onClick={() => setSelectedComplaint(c)} 
//                         className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
//                       >
//                         Enter Resolution Space
//                       </button>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           )}

//           {activeTab === 'history' && (
//              <div className="overflow-x-auto">
//               <table className="w-full text-left">
//                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
//                   <tr>
//                     <th className="px-8 py-5">Case</th>
//                     <th className="px-8 py-5">Parties</th>
//                     <th className="px-8 py-5">Outcome</th>
//                     <th className="px-8 py-5">Closure Date</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {closedComplaints.map(c => (
//                     <tr key={c.id} className="hover:bg-slate-50 transition-colors">
//                       <td className="px-8 py-5">
//                         <p className="font-bold text-slate-900">{c.subject}</p>
//                         <p className="text-[9px] uppercase tracking-widest text-slate-400">ID: {c.id}</p>
//                       </td>
//                       <td className="px-8 py-5">
//                          <div className="flex items-center gap-2 text-xs font-medium">
//                             <span className="text-indigo-600">{users?.find(u => u.id === c.fromUserId)?.name}</span>
//                             <span className="text-slate-300">→</span>
//                             <span className="text-slate-900">{users?.find(u => u.id === c.toUserId)?.name}</span>
//                          </div>
//                       </td>
//                       <td className="px-8 py-5">
//                         <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${c.status === 'resolved' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
//                           {c.status}
//                         </span>
//                       </td>
//                       <td className="px-8 py-5 text-[10px] font-black text-slate-400 tracking-widest uppercase">{new Date(c.createdAt).toLocaleDateString()}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* COMPLAINT ACTION PAGE / WORKSPACE MODAL */}
//       {selectedComplaint && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md shadow-2xl" onClick={() => setSelectedComplaint(null)} />
//           <div className="relative bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
//             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
//               <div>
//                 <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] bg-indigo-100/50 px-4 py-1.5 rounded-full">Resolution Intervention Workspace</span>
//                 <h3 className="text-3xl font-black text-slate-900 mt-6 tracking-tight">Case #T-{selectedComplaint.id.substring(4)}</h3>
//               </div>
//               <button onClick={() => setSelectedComplaint(null)} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
//                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
//               </button>
//             </div>

//             <div className="flex-grow overflow-y-auto p-10 space-y-12">
//               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
//                 {/* Evidence Section */}
//                 <div className="space-y-8">
//                   <div className="bg-red-50 p-10 rounded-[2.5rem] border border-red-100 relative overflow-hidden">
//                     <div className="absolute top-0 right-0 w-24 h-24 bg-red-100/50 rounded-full -mr-12 -mt-12" />
//                     <h5 className="text-[11px] font-black text-red-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
//                       <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
//                       Verified Statement
//                     </h5>
//                     <p className="font-black text-slate-900 text-2xl mb-4 leading-tight">{selectedComplaint.subject}</p>
//                     <p className="text-slate-700 text-lg leading-relaxed italic bg-white/60 p-8 rounded-3xl shadow-inner border border-red-100/30 font-medium">"{selectedComplaint.message}"</p>
//                   </div>
                  
//                   <div className="grid grid-cols-2 gap-6">
//                     <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center">
//                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Order Association</p>
//                       <p className="font-black text-indigo-600 text-xl">{selectedComplaint.orderId || 'Direct-Connect'}</p>
//                     </div>
//                     <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center">
//                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Initial Filing</p>
//                       <p className="font-black text-slate-900 text-xl">{new Date(selectedComplaint.createdAt).toLocaleDateString()}</p>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Party Intelligence Section */}
//                 <div className="space-y-8">
//                    {(() => {
//                     const accusedUser = users?.find(u => u.id === selectedComplaint.toUserId);
//                     const stats = getUserStats(selectedComplaint.toUserId);
//                     return (
//                       <div className="bg-slate-900 p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
//                         <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full -mr-20 -mt-20" />
//                         <h5 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-8 relative z-10">Defendant Intelligence Snapshot</h5>
//                         <div className="flex items-center gap-8 mb-10 relative z-10">
//                           <div className="w-20 h-20 rounded-[1.5rem] bg-indigo-500 text-white flex items-center justify-center font-black text-4xl shadow-xl border-4 border-slate-800 ring-1 ring-slate-700">{accusedUser?.name.charAt(0)}</div>
//                           <div>
//                             <p className="font-black text-3xl mb-1 tracking-tight">{accusedUser?.name}</p>
//                             <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{accusedUser?.email}</p>
//                           </div>
//                         </div>
//                         <div className="grid grid-cols-2 gap-8 relative z-10">
//                           <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 text-center">
//                             <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-2">Lifetime Impact</p>
//                             <p className="text-3xl font-black">${stats.total.toLocaleString()}</p>
//                           </div>
//                           <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 text-center">
//                             <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-2">Network Health</p>
//                             <p className="text-2xl font-black uppercase tracking-widest">{accusedUser?.status}</p>
//                           </div>
//                         </div>
//                       </div>
//                     );
//                   })()}
//                 </div>
//               </div>

//               {/* ACTION PAGE INTERVENTION CONSOLE */}
//               <div className="pt-12 border-t border-slate-100">
//                 <div className="flex justify-between items-center mb-8">
//                    <h5 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2">
//                      <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
//                      Admin Intervention Console
//                    </h5>
//                    <div className="flex gap-2">
//                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Recorded Verdict Required</span>
//                    </div>
//                 </div>
                
//                 <textarea 
//                   value={adminResponse}
//                   onChange={(e) => setAdminResponse(e.target.value)}
//                   placeholder="Draft the official platform response here. This statement will be dispatched to the consumer and recorded in the logistics ledger permanently."
//                   className="w-full h-48 p-10 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 mb-10 transition-all font-medium text-slate-700 text-xl shadow-inner placeholder:text-slate-300"
//                 />
                
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//                    <button 
//                     onClick={() => handleAction('warn_complainant')}
//                     className="group py-6 bg-white border-2 border-slate-100 text-slate-600 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:border-indigo-600 hover:text-indigo-600 transition-all flex flex-col items-center gap-3 shadow-sm active:scale-95"
//                   >
//                     <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
//                     Notify Complainant
//                   </button>
//                   <button 
//                     onClick={() => handleAction('warn_accused')}
//                     className="group py-6 bg-white border-2 border-slate-100 text-slate-600 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:border-amber-500 hover:text-amber-600 transition-all flex flex-col items-center gap-3 shadow-sm active:scale-95"
//                   >
//                     <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
//                     Warning to Accused
//                   </button>
//                   <button 
//                     onClick={() => handleAction('ban')}
//                     className="group py-6 bg-red-50 text-red-600 border-2 border-red-100 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all flex flex-col items-center gap-3 shadow-sm active:scale-95"
//                   >
//                     <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
//                     Restrict Account
//                   </button>
//                   <button 
//                     onClick={() => handleAction('resolve')}
//                     className="group py-6 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-2xl shadow-indigo-100 transition-all flex flex-col items-center gap-3 active:scale-[0.98]"
//                   >
//                     <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
//                     Resolve & Close
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* User Insights / Profile Audit Modal */}
//       {selectedUser && (
//         <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedUser(null)} />
//           <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
//             <div className="p-12 text-center">
//               <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-4xl font-black text-indigo-600 mx-auto mb-8 border-4 border-white shadow-xl">
//                 {selectedUser.name.charAt(0)}
//               </div>
//               <h3 className="text-3xl font-black text-slate-900 mb-2">{selectedUser.name}</h3>
//               <p className="text-slate-500 font-medium mb-10">{selectedUser.email}</p>
              
//               <div className="grid grid-cols-2 gap-6 mb-12">
//                 <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
//                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Direct Transactions</p>
//                   <h4 className="text-3xl font-black text-slate-900">{getUserStats(selectedUser.id).count}</h4>
//                 </div>
//                 <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
//                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Network Value</p>
//                   <h4 className="text-3xl font-black text-slate-900">${getUserStats(selectedUser.id).total.toLocaleString()}</h4>
//                 </div>
//               </div>

//               <div className="flex gap-4">
//                 <button 
//                   onClick={() => { onToggleUserStatus(selectedUser.id); setSelectedUser(null); }}
//                   className={`flex-grow py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 ${selectedUser.status === 'active' ? 'bg-red-600 text-white shadow-red-100' : 'bg-green-600 text-white shadow-green-100'}`}
//                 >
//                   {selectedUser.status === 'active' ? 'Restrict Logistics Access' : 'Revoke Suspension'}
//                 </button>
//                 <button 
//                   onClick={() => setSelectedUser(null)}
//                   className="px-8 py-5 rounded-2xl border-2 border-slate-100 text-slate-400 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50"
//                 >
//                   Dismiss Audit
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AdminDashboard;
