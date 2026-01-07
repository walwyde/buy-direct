
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

'use client'

import React, { useState, useEffect } from 'react';
import { Manufacturer, CartItem, Product } from '@/types';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const ManufacturersPage: React.FC = () => {
  const router = useRouter();
  
  // State
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'verified'>('all');
  const [addingToCart, setAddingToCart] = useState<string | null>(null); // product ID being added

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Fetch cart from Supabase or localStorage
  useEffect(() => {
    const fetchCart = async () => {
      if (!userId) {
        // Guest user - use localStorage
        const savedCart = localStorage.getItem('ds_guest_cart');
        if (savedCart) {
          try {
            setCart(JSON.parse(savedCart));
          } catch (e) {
            console.error('Failed to load guest cart:', e);
          }
        }
        return;
      }

      try {
        const { data, error } = await supabase
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
              is_featured,
              minimum_order_quantity
            )
          `)
          .eq('user_id', userId);

        if (error) throw error;

        if (data) {
          const cartItems: CartItem[] = data.map(item => ({
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
            isFeatured: item.products.is_featured,
            minimumOrderQuantity: item.products.minimum_order_quantity,
            quantity: item.quantity
          }));
          setCart(cartItems);
        }
      } catch (err) {
        console.error('Error fetching cart:', err);
      }
    };

    fetchCart();
  }, [userId]);

  // Fetch manufacturers from Supabase
  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('manufacturers')
          .select('*')
          .order('company_name', { ascending: true });

        if (error) {
          console.error('Error fetching manufacturers:', error);
          setError('Failed to load manufacturers. Please try again.');
          return;
        }

        if (data) {
          const manufacturersWithProducts = await Promise.all(
            data.map(async (manufacturer) => {
              // Fetch products for each manufacturer
              const { data: productsData } = await supabase
                .from('products')
                .select('*')
                .eq('manufacturer_id', manufacturer.id)
                .limit(3); // Get first 3 products

              return {
                id: manufacturer.id,
                companyName: manufacturer.company_name,
                logoUrl: manufacturer.logo_url,
                bio: manufacturer.bio,
                location: manufacturer.location,
                establishedYear: manufacturer.established_year,
                verificationStatus: manufacturer.verification_status,
                // Add products to manufacturer object
                products: productsData?.map(p => ({
                  id: p.id,
                  name: p.name,
                  description: p.description,
                  price: Number(p.price),
                  retailPriceEstimation: p.retail_price_estimation ? Number(p.retail_price_estimation) : Number(p.price) * 1.5,
                  category: p.category,
                  stock: p.stock,
                  imageUrl: p.image_url,
                  specifications: p.specifications,
                  manufacturerId: p.manufacturer_id,
                  isFeatured: p.is_featured || false,
                  minimumOrderQuantity: p.minimum_order_quantity || 1
                })) || []
              };
            })
          );

          setManufacturers(manufacturersWithProducts);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchManufacturers();
  }, []);

  // Add product to cart handler
  const handleAddToCart = async (product: Product) => {
    setAddingToCart(product.id);

    try {
      if (!userId) {
        // Guest user - use localStorage
        const newCart = [...cart];
        const existingIndex = newCart.findIndex(item => item.id === product.id);
        
        if (existingIndex > -1) {
          newCart[existingIndex].quantity += 1;
        } else {
          newCart.push({ ...product, quantity: 1 });
        }
        
        setCart(newCart);
        localStorage.setItem('ds_guest_cart', JSON.stringify(newCart));
        alert(`${product.name} added to cart!`);
        return;
      }

      // Check if item already exists in cart
      const { data: existingItem, error: fetchError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', product.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing cart item:', fetchError);
        alert('Failed to add item to cart. Please try again.');
        return;
      }

      if (existingItem) {
        // Update quantity
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ 
            quantity: existingItem.quantity + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id);

        if (updateError) throw updateError;

        // Update local state
        setCart(prev => prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        // Insert new item
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: userId,
            product_id: product.id,
            quantity: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          
          if (insertError.code === '42501') {
            alert('Please sign in again to add items to your cart.');
          } else if (insertError.code === '23503') {
            alert('This product is no longer available.');
          } else {
            throw insertError;
          }
          return;
        }

        // Update local state
        setCart(prev => [...prev, { ...product, quantity: 1 }]);
      }

      alert(`${product.name} added to cart!`);
      
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      alert('Failed to add item to cart. Please try again.');
    } finally {
      setAddingToCart(null);
    }
  };

  // Handle view manufacturer store
  const handleViewStore = (manufacturerId: string) => {
    router.push(`/manufacturer-products/${manufacturerId}`);
  };

  // Handle view product details
  const handleViewProduct = (productId: string) => {
    router.push(`/product-detail/${productId}`);
  };

  // Filter manufacturers based on verification status
  const filteredManufacturers = manufacturers.filter(manufacturer => {
    if (activeFilter === 'verified') {
      return manufacturer.verificationStatus === 'verified';
    }
    return true; // 'all' filter
  });

  // Loading state
  if (loading) {
    return (
      <div className="py-12">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading manufacturers...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Manufacturers</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Our Manufacturing Partners</h1>
          <p className="text-slate-500 max-w-xl">
            Every factory on our platform is audited for quality, sustainability, and fair labor practices.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveFilter('verified')}
            className={`px-6 py-2 rounded-xl font-bold transition-colors ${
              activeFilter === 'verified' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Verified Only
          </button>
          <button 
            onClick={() => setActiveFilter('all')}
            className={`px-6 py-2 rounded-xl font-bold transition-colors ${
              activeFilter === 'all' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Partners
          </button>
        </div>
      </div>

      {filteredManufacturers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500 text-lg">No manufacturers found.</p>
          {activeFilter === 'verified' && (
            <p className="text-slate-400 mt-2">Try viewing all partners instead.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredManufacturers.map((manufacturer) => {
            const savings = manufacturer.products.length > 0 
              ? Math.round((1 - manufacturer.products[0].price / manufacturer.products[0].retailPriceEstimation) * 100)
              : 0;

            return (
              <div 
                key={manufacturer.id} 
                className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
              >
                {/* Manufacturer Header */}
                <div className="flex items-center gap-6 mb-8">
                  <img 
                    src={manufacturer.logoUrl || '/placeholder.jpg'} 
                    className="w-20 h-20 rounded-2xl object-cover shadow-lg group-hover:scale-105 transition-transform"
                    alt={manufacturer.companyName}
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.jpg';
                    }}
                  />
                  <div>
                    <h3 className="text-xl font-black text-slate-900 mb-1">{manufacturer.companyName}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {manufacturer.location || 'Location not specified'}
                      </span>
                      {manufacturer.verificationStatus === 'verified' && (
                        <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-black border border-blue-100">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          VERIFIED
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Manufacturer Bio */}
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                  {manufacturer.bio || 'No description available.'}
                </p>

                {/* Manufacturer Products Preview */}
                {manufacturer.products.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-widest">Featured Products</h4>
                    <div className="space-y-3">
                      {manufacturer.products.slice(0, 2).map((product) => (
                        <div 
                          key={product.id} 
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group/product"
                        >
                          <img 
                            src={product.imageUrl || '/placeholder.jpg'} 
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.jpg';
                            }}
                          />
                          <div className="flex-1">
                            <h5 className="text-sm font-bold text-slate-900 group-hover/product:text-indigo-600 transition-colors">
                              {product.name}
                            </h5>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-black text-slate-900">
                                ${product.price.toFixed(2)}
                              </span>
                              {product.retailPriceEstimation > product.price && (
                                <span className="text-xs text-slate-400 line-through">
                                  ${product.retailPriceEstimation.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleViewProduct(product.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="View details"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleAddToCart(product)}
                              disabled={addingToCart === product.id}
                              className={`p-1.5 ${
                                addingToCart === product.id 
                                  ? 'text-amber-500' 
                                  : 'text-slate-400 hover:text-green-600'
                              } transition-colors disabled:opacity-50`}
                              title="Add to cart"
                            >
                              {addingToCart === product.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                      {manufacturer.products.length > 2 && (
                        <p className="text-xs text-slate-400 text-center">
                          +{manufacturer.products.length - 2} more products
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Manufacturer Footer */}
                <div className="flex justify-between items-center py-4 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Est. {manufacturer.establishedYear || 'N/A'}
                    </span>
                    {manufacturer.products.length > 0 && (
                      <span className="text-[10px] font-bold text-green-600 mt-1">
                        Save up to {savings}%
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {manufacturer.products.length > 0 && (
                      <button 
                        onClick={() => {
                          // Add first product to cart
                          handleAddToCart(manufacturer.products[0]);
                        }}
                        disabled={addingToCart === manufacturer.products[0].id}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                      >
                        {addingToCart === manufacturer.products[0].id ? 'Adding...' : 'Quick Add'}
                      </button>
                    )}
                    <button 
                      onClick={() => handleViewStore(manufacturer.id)}
                      className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:translate-x-1 transition-transform flex items-center gap-1"
                    >
                      View Store
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart Summary (Floating) */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                {cart.reduce((total, item) => total + item.quantity, 0)}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {cart.length} item{cart.length !== 1 ? 's' : ''} in cart
              </p>
              <p className="text-xs text-slate-500">
                Total: ${cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => router.push('/checkout')}
              className="ml-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManufacturersPage;