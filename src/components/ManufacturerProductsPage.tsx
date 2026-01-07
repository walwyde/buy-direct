
import React, { useEffect, useState } from 'react'
import { Manufacturer, Product } from '../types'
import ProductCard from './ProductCard'
import { supabase } from '../lib/supabase'

interface ManufacturerProductsPageProps {
  manufacturerId: string
  onAddToCart: (p: Product) => void
  onViewProduct: (p: Product) => void
}

const ManufacturerProductsPage: React.FC<ManufacturerProductsPageProps> = ({
  manufacturerId,
  onAddToCart,
  onViewProduct
}) => {
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  console.log('ManufacturerProductsPage loaded for ID:', manufacturerId)

  /* -------------------------
     Load manufacturer + products
  ------------------------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true)

      /* Manufacturer */
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

      /* Products */
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

      setLoading(false)
    }

    load()
  }, [manufacturerId])

  /* -------------------------
     Guards
  ------------------------- */
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

  /* -------------------------
     Render (OLD UI)
  ------------------------- */
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Manufacturer Header */}
      <div className="bg-white rounded-[3rem] p-8 md:p-12 mb-12 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
        <img
          src={manufacturer.logoUrl}
          className="w-32 h-32 rounded-[2rem] object-cover shadow-2xl border-4 border-white ring-1 ring-slate-100"
          alt={manufacturer.companyName}
        />

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
          </div>
        </div>

        <div className="text-right flex flex-col items-center md:items-end justify-center">
          <p className="text-3xl font-black text-indigo-600">
            {products.length}
          </p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Active Direct Listings
          </p>
        </div>
      </div>

      {/* Products */}
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
