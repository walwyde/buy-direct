
// import React from 'react';
// import { Manufacturer } from '../types';
// import { MOCK_MANUFACTURERS } from '../constants';

// interface ManufacturersPageProps {
//   onViewStore: (manufacturerId: string) => void;
// }

// const ManufacturersPage: React.FC<ManufacturersPageProps> = ({ onViewStore }) => {
//   return (
//     <div className="py-12">
//       <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
//         <div>
//           <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Our Manufacturing Partners</h1>
//           <p className="text-slate-500 max-w-xl">Every factory on our platform is audited for quality, sustainability, and fair labor practices.</p>
//         </div>
//         <div className="flex bg-slate-100 p-1.5 rounded-2xl">
//           <button className="bg-white text-slate-900 px-6 py-2 rounded-xl font-bold shadow-sm">Verified Only</button>
//           <button className="text-slate-500 px-6 py-2 rounded-xl font-bold hover:text-slate-900 transition-colors">All Partners</button>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//         {MOCK_MANUFACTURERS.map((m) => (
//           <div key={m.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
//             <div className="flex items-center gap-6 mb-8">
//               <img src={m.logoUrl} className="w-20 h-20 rounded-2xl object-cover shadow-lg group-hover:scale-105 transition-transform" alt={m.companyName} />
//               <div>
//                 <h3 className="text-xl font-black text-slate-900 mb-1">{m.companyName}</h3>
//                 <div className="flex items-center gap-2">
//                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{m.location}</span>
//                   {m.verificationStatus === 'verified' && (
//                     <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-black border border-blue-100">
//                       <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
//                         <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//                       </svg>
//                       VERIFIED
//                     </span>
//                   )}
//                 </div>
//               </div>
//             </div>
            
//             <p className="text-slate-500 text-sm leading-relaxed mb-8">
//               {m.bio}
//             </p>

//             <div className="flex justify-between items-center py-4 border-t border-slate-50">
//               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. {m.establishedYear}</span>
//               <button 
//                 onClick={() => onViewStore(m.id)}
//                 className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:translate-x-1 transition-transform flex items-center gap-1"
//               >
//                 View Factory Store
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                 </svg>
//               </button>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default ManufacturersPage;

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Manufacturer } from '../types';

interface ManufacturersPageProps {
  onViewStore: (manufacturerId: string) => void;
}

const ManufacturersPage: React.FC<ManufacturersPageProps> = ({ onViewStore }) => {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(true);

  /* -----------------------------
     Fetch Manufacturers
  ----------------------------- */
  useEffect(() => {
    const fetchManufacturers = async () => {
      setLoading(true);

      let query = supabase
        .from('manufacturers')
        .select('*')
        .order('company_name');

      if (showVerifiedOnly) {
        query = query.eq('verification_status', 'verified');
      }

      const { data, error } = await query;

      if (!error && data) {
        setManufacturers(data as Manufacturer[]);
        console.log('Fetched manufacturers:', data, error);
      }

      setLoading(false);
    };

    fetchManufacturers();
  }, [showVerifiedOnly]);

  /* -----------------------------
     Render
  ----------------------------- */
  return (
    <div className="py-12">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
            Our Manufacturing Partners
          </h1>
          <p className="text-slate-500 max-w-xl">
            Every factory on our platform is audited for quality, sustainability,
            and fair labor practices.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setShowVerifiedOnly(true)}
            className={`px-6 py-2 rounded-xl font-bold ${
              showVerifiedOnly
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Verified Only
          </button>
          <button
            onClick={() => setShowVerifiedOnly(false)}
            className={`px-6 py-2 rounded-xl font-bold ${
              !showVerifiedOnly
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            All Partners
          </button>
        </div>
      </div>

      {loading && (
        <p className="text-slate-400 text-sm">Loading manufacturers…</p>
      )}

      {!loading && manufacturers.length === 0 && (
        <p className="text-slate-400 text-sm">
          No manufacturers found.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {manufacturers.map(m => (
          <div
            key={m.id}
            className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group"
          >
            <div className="flex items-center gap-6 mb-8">
              <img
                src={m.logo_url}
                alt={m.company_name}
                className="w-20 h-20 rounded-2xl object-cover shadow-lg group-hover:scale-105 transition-transform"
              />
              <div>
                <h3 className="text-xl font-black mb-1">
                  {m.company_name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    {m.location}
                  </span>

                  {m.verification_status === 'verified' && (
                    <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-black border">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      VERIFIED
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              {m.bio}
            </p>

            <div className="flex justify-between items-center py-4 border-t border-slate-50">
              <span className="text-[10px] font-black text-slate-400 uppercase">
                Est. {m.established_year}
              </span>
              <button
                onClick={() => onViewStore(m.id)}
                className="text-indigo-600 font-black text-xs uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-transform"
              >
                View Factory Store
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManufacturersPage;
