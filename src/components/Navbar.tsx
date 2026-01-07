import React, { useState } from 'react';
import { User, AppView, UserRole, Notification } from '../types';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  cartCount: number;
  onCartClick: () => void;
  onViewChange: (view: AppView) => void;
  currentView: AppView;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  user: User | null;
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  onSignInClick: () => void;
  onSignOut: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  cartCount, 
  onCartClick, 
  onViewChange, 
  currentView,
  searchQuery,
  onSearchChange,
  user,
  notifications,
  onMarkNotificationRead,
  onSignInClick,
  onSignOut
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const unreadCount = notifications?.filter(n => !n.isRead).length;
  const router = useRouter();

  

  const handleNavClick = (view: AppView) => {
    if (view === "manufacturer-dashboard") {
      router.push(`${view}/${user?.id}`);
    } else if (view === "profile") {
      router.push(`profile-page/${user?.id}`);
    } else {
      router.push(view);
    }
    
    setIsMobileMenuOpen(false);
    setIsNotifOpen(false);
    setIsUserMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 glass-effect border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          {/* Hamburger Trigger - Visible only on smaller screens */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-slate-900 hover:bg-slate-100 rounded-xl transition-all lg:hidden"
            aria-label="Open Navigation Sidebar"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center cursor-pointer flex-shrink-0" onClick={() => handleNavClick('marketplace')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-indigo-100">
              <span className="text-white font-bold text-xl">DS</span>
            </div>
            <span className="hidden sm:block text-2xl font-black bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              DirectSource
            </span>
          </div>
          
          <div className="flex-grow max-w-md hidden md:block">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input
                type="text"
                placeholder="Search direct from source..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          {/* Desktop Links - Visible on large screens */}
          <div className="hidden lg:flex items-center space-x-6">
            <button onClick={() => handleNavClick('marketplace')} className={`text-sm font-bold transition-colors ${currentView === 'marketplace' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>Marketplace</button>
            <button onClick={() => handleNavClick('manufacturers')} className={`text-sm font-bold transition-colors ${currentView === 'manufacturers' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>Factories</button>
            <button onClick={() => handleNavClick('process')} className={`text-sm font-bold transition-colors ${currentView === 'process' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>Process</button>
          </div>

          <div className="flex items-center space-x-2">
            {user && (
              <div className="relative">
                <button 
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all relative"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
                </button>

                {isNotifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                    <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                      <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                        <h4 className="font-black text-[10px] text-slate-900 uppercase tracking-widest">Alert Center</h4>
                        <span className="text-[10px] font-bold text-indigo-600">{unreadCount} Pending</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No Alerts</div>
                        ) : (
                          notifications.map(n => (
                            <div 
                              key={n.id} 
                              onClick={() => { onMarkNotificationRead(n.id); setIsNotifOpen(false); }}
                              className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-indigo-50/40' : ''}`}
                            >
                              <p className="font-bold text-slate-900 text-sm">{n.title}</p>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <button onClick={onCartClick} className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07 .665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              {cartCount > 0 && <span className="absolute top-1 right-1 bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm">{cartCount}</span>}
            </button>
            
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 pl-2"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-black border-2 border-white shadow-sm overflow-hidden text-xs">
                    {user?.name?.charAt(0)}
                  </div>
                </button>

                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-4 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                      <div className="p-4 bg-slate-50 border-b">
                        <h4 className="font-black text-[10px] text-slate-900 uppercase tracking-widest">Account Workspace</h4>
                      </div>
                      <div className="flex flex-col">
                        {user?.role === UserRole.ADMIN && (
                          <button 
                            onClick={() => { handleNavClick('admin-dashboard'); setIsUserMenuOpen(false); }}
                            className={`text-left p-4 text-sm font-bold border-b border-slate-50 hover:bg-slate-50 transition-colors ${currentView === 'admin-dashboard' ? 'text-red-600' : 'text-slate-600'}`}
                          >
                            Admin Console
                          </button>
                        )}
                        {user?.role === UserRole.MANUFACTURER && (
                          <button 
                            onClick={() => { handleNavClick('manufacturer-dashboard'); setIsUserMenuOpen(false); }}
                            className={`text-left p-4 text-sm font-bold border-b border-slate-50 hover:bg-slate-50 transition-colors ${currentView === 'manufacturer-dashboard' ? 'text-indigo-600' : 'text-slate-600'}`}
                          >
                            Factory Hub
                          </button>
                        )}
                        <button 
                          onClick={() => { handleNavClick('profile'); setIsUserMenuOpen(false); }}
                          className={`text-left p-4 text-sm font-bold border-b border-slate-50 hover:bg-slate-50 transition-colors ${currentView === 'profile' ? 'text-slate-900' : 'text-slate-600'}`}
                        >
                          Personal Profile
                        </button>
                        <button 
                          onClick={() => { onSignOut(); setIsUserMenuOpen(false); }}
                          className="text-left p-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button onClick={onSignInClick} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-lg active:scale-95">Sign In</button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Drawer Implementation - High Quality Styling */}
      {isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9998]" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed top-0 left-0 h-screen w-[320px] bg-white z-[9999] shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col border-r border-slate-100">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-2 shadow-md shadow-indigo-100">
                  <span className="text-white font-black">DS</span>
                </div>
                <span className="text-xl font-black text-slate-900">DirectSource</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8 flex-grow overflow-y-auto space-y-10">
              <div className="space-y-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-4">Main Navigation</p>
                <button onClick={() => handleNavClick('marketplace')} className={`w-full text-left px-6 py-6 rounded-2xl font-black text-base uppercase tracking-widest transition-all ${currentView === 'marketplace' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}>Marketplace</button>
                <button onClick={() => handleNavClick('manufacturers')} className={`w-full text-left px-6 py-6 rounded-2xl font-black text-base uppercase tracking-widest transition-all ${currentView === 'manufacturers' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}>Factories</button>
                <button onClick={() => handleNavClick('process')} className={`w-full text-left px-6 py-6 rounded-2xl font-black text-base uppercase tracking-widest transition-all ${currentView === 'process' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}>Direct Process</button>
              </div>
            </div>

            {!user && (
              <div className="p-8 border-t border-slate-50 bg-slate-50/30">
                <button onClick={() => { onSignInClick(); setIsMobileMenuOpen(false); }} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-base uppercase tracking-widest shadow-2xl shadow-slate-200 active:scale-95 transition-all">Start Sourcing</button>
              </div>
            )}
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;


// import React, { useState } from 'react';
// import { User, AppView, UserRole, Notification } from '../types';
// import { useRouter } from 'next/navigation';

// interface NavbarProps {
//   cartCount: number;
//   onCartClick: () => void;
//   onViewChange: (view: AppView) => void;
//   currentView: AppView;
//   searchQuery: string;
//   onSearchChange: (query: string) => void;
//   user: User | null;
//   notifications: Notification[];
//   onMarkNotificationRead: (id: string) => void;
//   onSignInClick: () => void;
//   onSignOut: () => void;
// }

// const Navbar: React.FC<NavbarProps> = ({ 
//   // cartCount, 
//   onCartClick, 
//   onViewChange, 
//   currentView,
//   searchQuery,
//   onSearchChange,
//   user,
//   notifications,
//   onMarkNotificationRead,
//   onSignInClick,
//   onSignOut
// }) => {
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
//   const [isNotifOpen, setIsNotifOpen] = useState(false);
//   const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

//   const unreadCount = notifications?.filter(n => !n.isRead).length;
// const router = useRouter();
//   const handleNavClick = (View: AppView) => {
//   View === "manufacturer-dashboard" ? 
//   router.push(View + `/${user?.id}`) : router.push(View);
//   View === "profile"? router.push(`profile-page/${user?.id}`) : router.push(View)
//     setIsMobileMenuOpen(false);
//     setIsNotifOpen(false);
//     setIsUserMenuOpen(false);
//   };
// const cart = [];
//   cartCount={cart.reduce((s, i) => s + i.quantity, 0)};

//   return (
//     <nav className="sticky top-0 z-50 glass-effect border-b border-slate-200">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex justify-between items-center h-16 gap-4">
//           {/* Hamburger Trigger - Visible only on smaller screens */}
//           <button 
//             onClick={() => setIsMobileMenuOpen(true)}
//             className="p-2 text-slate-900 hover:bg-slate-100 rounded-xl transition-all lg:hidden"
//             aria-label="Open Navigation Sidebar"
//           >
//             <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
//             </svg>
//           </button>

//           <div className="flex items-center cursor-pointer flex-shrink-0" onClick={() => handleNavClick('marketplace')}>
//             <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-indigo-100">
//               <span className="text-white font-bold text-xl">DS</span>
//             </div>
//             <span className="hidden sm:block text-2xl font-black bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
//               DirectSource
//             </span>
//           </div>
          
//           <div className="flex-grow max-w-md hidden md:block">
//             <div className="relative">
//               <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
//                 <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
//               </span>
//               <input
//                 type="text"
//                 placeholder="Search direct from source..."
//                 value={searchQuery}
//                 onChange={(e) => onSearchChange(e.target.value)}
//                 className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none transition-all text-sm font-medium"
//               />
//             </div>
//           </div>

//           {/* Desktop Links - Visible on large screens */}
//           <div className="hidden lg:flex items-center space-x-6">
//             <button onClick={() => handleNavClick('marketplace')} className={`text-sm font-bold transition-colors ${currentView === 'marketplace' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>Marketplace</button>
//             <button onClick={() => handleNavClick('manufacturers')} className={`text-sm font-bold transition-colors ${currentView === 'manufacturers' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>Factories</button>
//             <button onClick={() => handleNavClick('process')} className={`text-sm font-bold transition-colors ${currentView === 'process' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>Process</button>
//           </div>

//           <div className="flex items-center space-x-2">
//             {user && (
//               <div className="relative">
//                 <button 
//                   onClick={() => setIsNotifOpen(!isNotifOpen)}
//                   className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all relative"
//                 >
//                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
//                   {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
//                 </button>

//                 {isNotifOpen && (
//                   <>
//                     <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
//                     <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
//                       <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
//                         <h4 className="font-black text-[10px] text-slate-900 uppercase tracking-widest">Alert Center</h4>
//                         <span className="text-[10px] font-bold text-indigo-600">{unreadCount} Pending</span>
//                       </div>
//                       <div className="max-h-96 overflow-y-auto">
//                         {notifications.length === 0 ? (
//                           <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No Alerts</div>
//                         ) : (
//                           notifications.map(n => (
//                             <div 
//                               key={n.id} 
//                               onClick={() => { onMarkNotificationRead(n.id); setIsNotifOpen(false); }}
//                               className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-indigo-50/40' : ''}`}
//                             >
//                               <p className="font-bold text-slate-900 text-sm">{n.title}</p>
//                               <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
//                             </div>
//                           ))
//                         )}
//                       </div>
//                     </div>
//                   </>
//                 )}
//               </div>
//             )}

//             <button onClick={onCartClick} className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all">
//               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07 .665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
//               {cartCount > 0 && <span className="absolute top-1 right-1 bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm">{cartCount}</span>}
//             </button>
            
//             {user ? (
//               <div className="relative">
//                 <button 
//                   onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
//                   className="flex items-center gap-2 pl-2"
//                 >
//                   <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-black border-2 border-white shadow-sm overflow-hidden text-xs">
//                     {user?.name?.charAt(0)}
//                   </div>
//                 </button>

//                 {isUserMenuOpen && (
//                   <>
//                     <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
//                     <div className="absolute right-0 mt-4 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
//                       <div className="p-4 bg-slate-50 border-b">
//                         <h4 className="font-black text-[10px] text-slate-900 uppercase tracking-widest">Account Workspace</h4>
//                       </div>
//                       <div className="flex flex-col">
//                         {user?.role === UserRole.ADMIN && (
//                           <button 
//                             onClick={() => { handleNavClick('admin-dashboard'); setIsUserMenuOpen(false); }}
//                             className={`text-left p-4 text-sm font-bold border-b border-slate-50 hover:bg-slate-50 transition-colors ${currentView === 'admin-dashboard' ? 'text-red-600' : 'text-slate-600'}`}
//                           >
//                             Admin Console
//                           </button>
//                         )}
//                         {user?.role === UserRole.MANUFACTURER && (
//                           <button 
//                             onClick={() => { handleNavClick('manufacturer-dashboard'); setIsUserMenuOpen(false); }}
//                             className={`text-left p-4 text-sm font-bold border-b border-slate-50 hover:bg-slate-50 transition-colors ${currentView === 'manufacturer-dashboard' ? 'text-indigo-600' : 'text-slate-600'}`}
//                           >
//                             Factory Hub
//                           </button>
//                         )}
//                         <button 
//                           onClick={() => { handleNavClick('profile'); setIsUserMenuOpen(false); }}
//                           className={`text-left p-4 text-sm font-bold border-b border-slate-50 hover:bg-slate-50 transition-colors ${currentView === 'profile' ? 'text-slate-900' : 'text-slate-600'}`}
//                         >
//                           Personal Profile
//                         </button>
//                         <button 
//                           onClick={() => { onSignOut(); setIsUserMenuOpen(false); }}
//                           className="text-left p-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
//                         >
//                           Sign Out
//                         </button>
//                       </div>
//                     </div>
//                   </>
//                 )}
//               </div>
//             ) : (
//               <button onClick={onSignInClick} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-lg active:scale-95">Sign In</button>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Sidebar Drawer Implementation - High Quality Styling */}
//       {isMobileMenuOpen && (
//         <>
//           <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9998]" onClick={() => setIsMobileMenuOpen(false)} />
//           <div className="fixed top-0 left-0 h-screen w-[320px] bg-white z-[9999] shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col border-r border-slate-100">
//             <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
//               <div className="flex items-center">
//                 <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-2 shadow-md shadow-indigo-100">
//                   <span className="text-white font-black">DS</span>
//                 </div>
//                 <span className="text-xl font-black text-slate-900">DirectSource</span>
//               </div>
//               <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-all">
//                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
//               </button>
//             </div>

//             <div className="p-8 flex-grow overflow-y-auto space-y-10">
//               <div className="space-y-6">
//                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-4">Main Navigation</p>
//                 <button onClick={() => handleNavClick('marketplace')} className={`w-full text-left px-6 py-6 rounded-2xl font-black text-base uppercase tracking-widest transition-all ${currentView === 'marketplace' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}>Marketplace</button>
//                 <button onClick={() => handleNavClick('manufacturers')} className={`w-full text-left px-6 py-6 rounded-2xl font-black text-base uppercase tracking-widest transition-all ${currentView === 'manufacturers' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}>Factories</button>
//                 <button onClick={() => handleNavClick('process')} className={`w-full text-left px-6 py-6 rounded-2xl font-black text-base uppercase tracking-widest transition-all ${currentView === 'process' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}>Direct Process</button>
//               </div>
//             </div>

//             {!user && (
//               <div className="p-8 border-t border-slate-50 bg-slate-50/30">
//                 <button onClick={() => { onSignInClick(); setIsMobileMenuOpen(false); }} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-base uppercase tracking-widest shadow-2xl shadow-slate-200 active:scale-95 transition-all">Start Sourcing</button>
//               </div>
//             )}
//           </div>
//         </>
//       )}
//     </nav>
//   );
// };

// export default Navbar;