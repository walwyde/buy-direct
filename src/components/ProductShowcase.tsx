'use client'

import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, Zap, Shield, Truck, Award } from 'lucide-react';
import { Product, Manufacturer, CartItem } from '@/types';
import AIAssistant from '@/components/AIAssistant';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Helper function to normalize product data with defaults
const normalizeProduct = (productData: any): Product => ({
  id: productData.id,
  name: productData.name || 'Unnamed Product',
  description: productData.description || '',
  price: Number(productData.price) || 0,
  retailPriceEstimation: productData.retail_price_estimation 
    ? Number(productData.retail_price_estimation) 
    : (Number(productData.price) || 0) * 1.5, // Default to 150% of price
  category: productData.category || 'Uncategorized',
  stock: productData.stock || 0,
  imageUrl: productData.image_url || '/placeholder.jpg',
  specifications: productData.specifications || {},
  manufacturerId: productData.manufacturer_id,
  manufacturerName: productData.manufacturer_name || productData.manufacturers?.company_name,
  isFeatured: productData.is_featured || false,
  minimumOrderQuantity: productData.minimum_order_quantity || 1
});

const ProductShowcase: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  // State
  const [featuredProduct, setFeaturedProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Fetch cart from Supabase - SAFE VERSION
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
        // Use a safe query that doesn't depend on specific column names
        const { data, error } = await supabase
          .from('cart_items')
          .select(`
            *,
            products (
              id,
              name,
              description,
              price,
              category,
              stock,
              image_url,
              specifications,
              manufacturer_id
            )
          `)
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching cart from Supabase:', error);
          
          // Fallback: try to get basic cart items without the nested product query
          const { data: simpleCartData, error: simpleError } = await supabase
            .from('cart_items')
            .select('*')
            .eq('user_id', userId);
            
          if (simpleError) {
            console.error('Even simple cart query failed:', simpleError);
            return;
          }
          
          if (simpleCartData) {
            // We have cart items but need to fetch product details separately
            const productIds = simpleCartData.map(item => item.product_id);
            if (productIds.length > 0) {
              const { data: productsData } = await supabase
                .from('products')
                .select('*')
                .in('id', productIds);
              
              if (productsData) {
                const cartItems: CartItem[] = simpleCartData.map(item => {
                  const product = productsData.find(p => p.id === item.product_id);
                  return {
                    id: product?.id || item.product_id,
                    name: product?.name || 'Unknown Product',
                    description: product?.description || '',
                    price: Number(product?.price) || 0,
                    retailPriceEstimation: product?.retail_price_estimation 
                      ? Number(product?.retail_price_estimation) 
                      : (Number(product?.price) || 0) * 1.5,
                    category: product?.category || 'Uncategorized',
                    stock: product?.stock || 0,
                    imageUrl: product?.image_url || '/placeholder.jpg',
                    specifications: product?.specifications || {},
                    manufacturerId: product?.manufacturer_id || '',
                    isFeatured: product?.is_featured || false,
                    minimumOrderQuantity: product?.minimum_order_quantity || 1,
                    quantity: item.quantity
                  };
                });
                setCart(cartItems);
              }
            }
          }
          return;
        }

        if (data) {
          const cartItems: CartItem[] = data.map(item => {
            const product = item.products;
            return {
              id: product?.id || item.product_id,
              name: product?.name || 'Unknown Product',
              description: product?.description || '',
              price: Number(product?.price) || 0,
              retailPriceEstimation: product?.retail_price_estimation 
                ? Number(product?.retail_price_estimation) 
                : (Number(product?.price) || 0) * 1.5,
              category: product?.category || 'Uncategorized',
              stock: product?.stock || 0,
              imageUrl: product?.image_url || '/placeholder.jpg',
              specifications: product?.specifications || {},
              manufacturerId: product?.manufacturer_id || '',
              isFeatured: product?.is_featured || false,
              minimumOrderQuantity: product?.minimum_order_quantity || 1,
              quantity: item.quantity
            };
          });
          setCart(cartItems);
        }
      } catch (err) {
        console.error('Error fetching cart:', err);
      }
    };

    fetchCart();
  }, [userId]);

  // Fetch product data - MAIN FIX
  useEffect(() => {
    const fetchProductData = async () => {
      if (!productId) {
        console.error('No product ID found in URL');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // First, check if the product exists
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *,
            manufacturers (
              id,
              company_name,
              logo_url,
              bio,
              location,
              established_year,
              verification_status
            )
          `)
          .eq('id', productId)
          .single();

        if (productError) {
          console.error('Error fetching product:', productError);
          setFeaturedProduct(null);
          setLoading(false);
          return;
        }

        if (productData) {
          // Normalize the product data with defaults
          const normalizedProduct = normalizeProduct(productData);
          setFeaturedProduct(normalizedProduct);
          
          // Set manufacturer if available
          if (productData.manufacturers) {
            setManufacturer(productData.manufacturers as Manufacturer);
          }

          // Fetch related products from same manufacturer
          if (productData.manufacturer_id) {
            const { data: relatedData, error: relatedError } = await supabase
              .from('products')
              .select('*')
              .eq('manufacturer_id', productData.manufacturer_id)
              .neq('id', productId)
              .limit(5);

            if (!relatedError && relatedData) {
              const normalizedRelatedProducts = relatedData.map(p => normalizeProduct({
                ...p,
                manufacturers: productData.manufacturers // Pass manufacturer info
              }));
              setRelatedProducts(normalizedRelatedProducts);
            }
          }
        }
      } catch (err) {
        console.error('Error in product data fetch:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [productId]);

  // Add to cart handler - WORKING VERSION
  const handleAddToCart = async (product: Product) => {
    if (!userId) {
      // Guest user - use localStorage
      const newCart = [...cart];
      const existingIndex = newCart.findIndex(item => item.id === product.id);
      
      if (existingIndex > -1) {
        newCart[existingIndex].quantity += 1;
      } else {
        newCart.push({ 
          ...product, 
          quantity: 1 
        });
      }
      
      setCart(newCart);
      localStorage.setItem('ds_guest_cart', JSON.stringify(newCart));
      alert(`${product.name} added to cart!`);
      return;
    }

    try {
      // First, verify the product exists and has an ID
      if (!product.id) {
        alert('Cannot add this product to cart. Product information is incomplete.');
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
        throw fetchError;
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
          console.error('Insert error details:', insertError);
          
          // Check if it's a foreign key constraint error
          if (insertError.code === '23503') {
            alert('This product no longer exists in our database.');
            return;
          }
          
          if (insertError.code === '42501') {
            alert('Please sign in again to add items to your cart.');
            return;
          }
          
          throw insertError;
        }

        // Update local state
        setCart(prev => [...prev, { ...product, quantity: 1 }]);
      }

      alert(`${product.name} added to cart!`);
      
      // Refresh cart from server to ensure consistency
      if (userId) {
        const { data: refreshedCart } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', userId);
        
        if (refreshedCart) {
          // You can update the cart state here if needed
          console.log('Cart refreshed from server:', refreshedCart);
        }
      }
      
    } catch (err: any) {
      console.error('Error adding to cart:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
      
      if (err.code === '42501') {
        alert('You do not have permission to add items to cart. Please sign in.');
      } else if (err.code === '23503') {
        alert('This product is no longer available.');
      } else if (err.code === '22P02') {
        alert('Invalid data format. Please refresh the page and try again.');
      } else {
        alert('Failed to add item to cart. Please try again.');
      }
    }
  };

  const handleViewDetails = (product: Product) => {
    router.push(`/products/${product.id}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading product...</p>
        </div>
      </div>
    );
  }

  // Error state - product not found
  if (!featuredProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Product Not Found</h2>
          <p className="text-slate-600 mb-4">The product you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  // Calculate savings safely
  const savings = featuredProduct?.retailPriceEstimation && featuredProduct?.retailPriceEstimation > 0
    ? Math.round((1 - featuredProduct.price / featuredProduct.retailPriceEstimation) * 100)
    : 0;

  const features = [
    {
      icon: <Shield className="w-5 h-5" />,
      text: 'Factory Direct Quality Guarantee',
      color: 'text-blue-500'
    },
    {
      icon: <Truck className="w-5 h-5" />,
      text: 'Direct Shipping, No Warehouses',
      color: 'text-green-500'
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      text: `${savings}% Average Savings vs Retail`,
      color: 'text-purple-500'
    },
    {
      icon: <Award className="w-5 h-5" />,
      text: 'Verified Manufacturer',
      color: 'text-amber-500'
    }
  ];

  const displayProducts = [featuredProduct, ...relatedProducts];
  const currentProduct = displayProducts[activeIndex];

  // Calculate current product savings safely
  const currentProductSavings = currentProduct?.retailPriceEstimation && currentProduct?.retailPriceEstimation > 0
    ? Math.round((1 - currentProduct.price / currentProduct.retailPriceEstimation) * 100)
    : 0;

  return (
    <section className="py-16 min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-bold mb-8 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Previous Page
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
            <Zap className="w-4 h-4" />
            Factory Direct Deal
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4">
            {manufacturer?.company_name || featuredProduct?.name || 'Product Details'}
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            {manufacturer?.bio || 'Direct from manufacturer with guaranteed quality and savings.'}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Featured Product Display */}
          <div className="relative">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-3xl overflow-hidden shadow-2xl">
              {/* Product Image */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={currentProduct.imageUrl || '/placeholder.jpg'}
                  alt={currentProduct.name}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Badges */}
                <div className="absolute top-4 left-4">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    🔥 FACTORY DIRECT
                  </div>
                </div>
                <div className="absolute top-4 right-4">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    SAVE {currentProductSavings}%
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-8 text-white">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{currentProduct.name}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-amber-400 fill-current" />
                        ))}
                      </div>
                      <span className="text-white/70">4.8 • {currentProduct.category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black">${currentProduct.price.toFixed(2)}</div>
                    {currentProduct.retailPriceEstimation && currentProduct.retailPriceEstimation > 0 && (
                      <div className="text-white/70 line-through">${currentProduct.retailPriceEstimation.toFixed(2)}</div>
                    )}
                  </div>
                </div>

                <p className="text-white/80 mb-8">{currentProduct.description}</p>

                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-white/10 ${feature.color}`}>
                        {feature.icon}
                      </div>
                      <span className="text-sm">{feature.text}</span>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => handleAddToCart(currentProduct)}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all duration-300 text-center"
                  >
                    Add to Cart
                  </button>
                  {currentProduct.id !== featuredProduct?.id && (
                    <button
                      onClick={() => handleViewDetails(currentProduct)}
                      className="flex-1 bg-white/10 text-white py-4 rounded-xl font-bold hover:bg-white/20 transition-colors"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -z-10 -top-6 -right-6 w-64 h-64 bg-gradient-to-br from-indigo-300 to-purple-300 rounded-full blur-3xl opacity-20" />
          </div>

          {/* Product Carousel */}
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-6">
              {relatedProducts.length > 0 ? 'More from this Manufacturer' : 'Product Details'}
            </h3>
            
            {relatedProducts.length > 0 ? (
              <div className="space-y-4 mb-8">
                {displayProducts.map((product, index) => {
                  const productSavings = product?.retailPriceEstimation && product?.retailPriceEstimation > 0
                    ? Math.round((1 - product.price / product.retailPriceEstimation) * 100)
                    : 0;
                  
                  return (
                    <div
                      key={product.id}
                      className={`group bg-white rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer ${
                        activeIndex === index
                          ? 'border-indigo-500 shadow-xl scale-[1.02]'
                          : 'border-slate-200 hover:border-indigo-300 hover:shadow-lg'
                      }`}
                      onClick={() => setActiveIndex(index)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={product.imageUrl || '/placeholder.jpg'}
                            alt={product.name}
                            className="w-20 h-20 rounded-xl object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.jpg';
                            }}
                          />
                          {product.isFeatured && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-xs text-white">
                              🔥
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {product.name}
                          </h4>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1">
                              <span className="text-lg font-black text-slate-900">${product.price.toFixed(2)}</span>
                              {product.retailPriceEstimation && product.retailPriceEstimation > 0 && (
                                <span className="text-slate-400 line-through text-sm">
                                  ${product.retailPriceEstimation.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                              Save {productSavings}%
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product);
                          }}
                          className="p-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 mb-8">
                <p className="text-slate-600">
                  {featuredProduct.description || 'No additional description available.'}
                </p>
                {featuredProduct.specifications && Object.keys(featuredProduct.specifications).length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-bold text-slate-900 mb-3">Specifications:</h4>
                    <ul className="space-y-2">
                      {Object.entries(featuredProduct.specifications).map(([key, value]) => (
                        <li key={key} className="flex justify-between">
                          <span className="text-slate-500">{key}:</span>
                          <span className="text-slate-900 font-medium">{String(value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Stats Section */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-blue-700">24h</div>
                <div className="text-sm text-slate-700">Avg. Response</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-green-700">99.3%</div>
                <div className="text-sm text-slate-700">Quality Score</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 text-center">
                <div className="text-2xl font-black text-purple-700">7-14d</div>
                <div className="text-sm text-slate-700">Delivery Time</div>
              </div>
            </div>

            {/* AI Assistant */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
              <AIAssistant selectedProduct={featuredProduct} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
// import React, { useState } from 'react';
// import { Star, TrendingUp, Zap, Shield, Truck, Award } from 'lucide-react';
// import { Product } from '@/types';
// import AIAssistant from '@/components/AIAssistant';
// import { useParams } from 'next/navigation';

// interface ProductShowcaseProps {
//   title: string;
//   subtitle: string;
//   products: Product[];
//   onAddToCart: (product: Product) => void;
//   onViewDetails: (product: Product) => void;
// }

// const ProductShowcase: React.FC<ProductShowcaseProps> = ({
//   title,
//   subtitle,
//   products,
//   onAddToCart,
//   onViewDetails
// }) => {
//   const [activeIndex, setActiveIndex] = useState(0);

//   if (products.length === 0) return null;

//   const params = useParams();
//   const productId = params.id as string;

//   const featuredProduct = products[activeIndex];
//   const savings = Math.round((1 - featuredProduct.price / featuredProduct.retailPriceEstimation) * 100);

//   const features = [
//     {
//       icon: <Shield className="w-5 h-5" />,
//       text: 'Factory Direct Quality Guarantee',
//       color: 'text-blue-500'
//     },
//     {
//       icon: <Truck className="w-5 h-5" />,
//       text: 'Direct Shipping, No Warehouses',
//       color: 'text-green-500'
//     },
//     {
//       icon: <TrendingUp className="w-5 h-5" />,
//       text: `${savings}% Average Savings vs Retail`,
//       color: 'text-purple-500'
//     },
//     {
//       icon: <Award className="w-5 h-5" />,
//       text: 'Verified Manufacturer',
//       color: 'text-amber-500'
//     }
//   ];

//   return (
//     <section className="py-16">
//       <div className="max-w-6xl mx-auto">
//         <div className="text-center mb-12">
//           <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
//             <Zap className="w-4 h-4" />
//             {title}
//           </div>
//           <h2 className="text-4xl font-black text-slate-900 mb-4">{subtitle}</h2>
//         </div>

//         <div className="grid lg:grid-cols-2 gap-12">
//           {/* Featured Product Display */}
//           <div className="relative">
//             <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-3xl overflow-hidden shadow-2xl">
//               {/* Product Image */}
//               <div className="relative h-64 overflow-hidden">
//                 <img 
//                   src={featuredProduct.imageUrl} 
//                   alt={featuredProduct.name}
//                   className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
//                 />
//                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
//                 {/* Badges */}
//                 <div className="absolute top-4 left-4">
//                   <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
//                     🔥 FACTORY DIRECT
//                   </div>
//                 </div>
//                 <div className="absolute top-4 right-4">
//                   <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
//                     SAVE {savings}%
//                   </div>
//                 </div>
//               </div>

//               {/* Product Info */}
//               <div className="p-8 text-white">
//                 <div className="flex items-start justify-between mb-6">
//                   <div>
//                     <h3 className="text-2xl font-bold mb-2">{featuredProduct.name}</h3>
//                     <div className="flex items-center gap-2">
//                       <div className="flex items-center gap-1">
//                         {[...Array(5)].map((_, i) => (
//                           <Star key={i} className="w-4 h-4 text-amber-400 fill-current" />
//                         ))}
//                       </div>
//                       <span className="text-white/70">4.8 • {featuredProduct.category}</span>
//                     </div>
//                   </div>
//                   <div className="text-right">
//                     <div className="text-3xl font-black">${featuredProduct.price}</div>
//                     <div className="text-white/70 line-through">${featuredProduct.retailPriceEstimation}</div>
//                   </div>
//                 </div>

//                 <p className="text-white/80 mb-8">{featuredProduct.description}</p>

//                 {/* Features Grid */}
//                 <div className="grid grid-cols-2 gap-4 mb-8">
//                   {features.map((feature, index) => (
//                     <div key={index} className="flex items-center gap-3">
//                       <div className={`p-2 rounded-lg bg-white/10 ${feature.color}`}>
//                         {feature.icon}
//                       </div>
//                       <span className="text-sm">{feature.text}</span>
//                     </div>
//                   ))}
//                 </div>

//                 {/* Action Buttons */}
//                 <div className="flex gap-4">
//                   <button 
//                     onClick={() => onAddToCart(featuredProduct)}
//                     className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all duration-300 text-center"
//                   >
//                     Add to Cart
//                   </button>
//                   <button 
//                     onClick={() => onViewDetails(featuredProduct)}
//                     className="flex-1 bg-white/10 text-white py-4 rounded-xl font-bold hover:bg-white/20 transition-colors"
//                   >
//                     View Details
//                   </button>
//                 </div>
//               </div>
//             </div>

//             {/* Decorative elements */}
//             <div className="absolute -z-10 -top-6 -right-6 w-64 h-64 bg-gradient-to-br from-indigo-300 to-purple-300 rounded-full blur-3xl opacity-20" />
//           </div>

//           {/* Product Carousel */}
//           <div>
//             <h3 className="text-2xl font-bold text-slate-900 mb-6">More Hot Deals</h3>
//             <div className="space-y-4">
//               {products.map((product, index) => (
//                 <div 
//                   key={product.id}
//                   className={`group bg-white rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer ${
//                     activeIndex === index 
//                       ? 'border-indigo-500 shadow-xl scale-[1.02]' 
//                       : 'border-slate-200 hover:border-indigo-300 hover:shadow-lg'
//                   }`}
//                   onClick={() => setActiveIndex(index)}
//                   onMouseEnter={() => setActiveIndex(index)}
//                 >
//                   <div className="flex items-center gap-4">
//                     <div className="relative">
//                       <img 
//                         src={product.imageUrl} 
//                         alt={product.name}
//                         className="w-20 h-20 rounded-xl object-cover"
//                       />
//                       {product.isFeatured && (
//                         <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-xs text-white">
//                           🔥
//                         </div>
//                       )}
//                     </div>
                    
//                     <div className="flex-1">
//                       <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
//                         {product.name}
//                       </h4>
//                       <div className="flex items-center gap-3 mt-2">
//                         <div className="flex items-center gap-1">
//                           <span className="text-lg font-black text-slate-900">${product.price}</span>
//                           <span className="text-slate-400 line-through text-sm">${product.retailPriceEstimation}</span>
//                         </div>
//                         <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
//                           Save {Math.round((1 - product.price / product.retailPriceEstimation) * 100)}%
//                         </span>
//                       </div>
//                     </div>
                    
//                     <button 
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         onAddToCart(product);
//                       }}
//                       className="p-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
//                     >
//                       +
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             {/* Stats Section */}
//             <div className="mt-8 grid grid-cols-3 gap-4">
//               <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 text-center">
//                 <div className="text-2xl font-black text-blue-700">24h</div>
//                 <div className="text-sm text-slate-700">Avg. Response</div>
//               </div>
//               <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 text-center">
//                 <div className="text-2xl font-black text-green-700">99.3%</div>
//                 <div className="text-sm text-slate-700">Quality Score</div>
//               </div>
//               <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 text-center">
//                 <div className="text-2xl font-black text-purple-700">7-14d</div>
//                 <div className="text-sm text-slate-700">Delivery Time</div>
//               </div>
//             </div>

//             {/* CTA */}
//             <div className="mt-8 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
//              <AIAssistant selectedProduct={featuredProduct} />
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default ProductShowcase;
