'use client'

import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, Zap, Shield, Truck, Award, ShoppingCart, X } from 'lucide-react';
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
    : (Number(productData.price) || 0) * 1.5,
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
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [showCartSummary, setShowCartSummary] = useState(false);
  const [cartUpdateCount, setCartUpdateCount] = useState(0);

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
        // Use a safe query
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
          console.error('Error fetching cart:', error);
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
  }, [userId, cartUpdateCount]);

  // Fetch product data
  useEffect(() => {
    const fetchProductData = async () => {
      if (!productId) {
        console.error('No product ID found in URL');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch main product with manufacturer info
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
          // Normalize the product data
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
                manufacturers: productData.manufacturers
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

  // Add to cart handler - COMPLETE VERSION
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
          newCart.push({ 
            ...product, 
            quantity: 1 
          });
        }
        
        setCart(newCart);
        localStorage.setItem('ds_guest_cart', JSON.stringify(newCart));
        
        // Show cart summary
        setShowCartSummary(true);
        setCartUpdateCount(prev => prev + 1);
        
        // Auto-hide after 3 seconds
        setTimeout(() => setShowCartSummary(false), 3000);
        
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

      let result;
      
      if (existingItem) {
        // Update quantity
        result = await supabase
          .from('cart_items')
          .update({ 
            quantity: existingItem.quantity + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id);
      } else {
        // Insert new item
        result = await supabase
          .from('cart_items')
          .insert({
            user_id: userId,
            product_id: product.id,
            quantity: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      if (result.error) {
        console.error('Supabase error:', result.error);
        
        if (result.error.code === '42501') {
          alert('Please sign in again to add items to your cart.');
        } else if (result.error.code === '23503') {
          alert('This product is no longer available.');
        } else {
          alert('Failed to add item to cart. Please try again.');
        }
        return;
      }

      // Update local state
      setCart(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
          return prev.map(item =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [...prev, { ...product, quantity: 1 }];
      });
      
      // Show cart summary
      setShowCartSummary(true);
      setCartUpdateCount(prev => prev + 1);
      
      // Auto-hide after 3 seconds
      setTimeout(() => setShowCartSummary(false), 3000);
      
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      alert('Failed to add item to cart. Please try again.');
    } finally {
      setAddingToCart(null);
    }
  };

  // Remove item from cart
  const handleRemoveFromCart = async (productId: string) => {
    try {
      if (!userId) {
        // Guest user - update localStorage
        const newCart = cart.filter(item => item.id !== productId);
        setCart(newCart);
        localStorage.setItem('ds_guest_cart', JSON.stringify(newCart));
        setCartUpdateCount(prev => prev + 1);
        return;
      }

      // Remove from Supabase
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) throw error;

      // Update local state
      setCart(prev => prev.filter(item => item.id !== productId));
      setCartUpdateCount(prev => prev + 1);
      
    } catch (err) {
      console.error('Error removing from cart:', err);
      alert('Failed to remove item from cart.');
    }
  };

  // Update cart item quantity
  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveFromCart(productId);
      return;
    }

    try {
      if (!userId) {
        // Guest user - update localStorage
        const newCart = cart.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        );
        setCart(newCart);
        localStorage.setItem('ds_guest_cart', JSON.stringify(newCart));
        setCartUpdateCount(prev => prev + 1);
        return;
      }

      // Update in Supabase
      const { error } = await supabase
        .from('cart_items')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) throw error;

      // Update local state
      setCart(prev =>
        prev.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
      setCartUpdateCount(prev => prev + 1);
      
    } catch (err) {
      console.error('Error updating quantity:', err);
      alert('Failed to update quantity.');
    }
  };

  const handleViewDetails = (product: Product) => {
    router.push(`/product-detail/${product.id}`);
  };

  // Calculate cart totals
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

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
    <>
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
                      disabled={addingToCart === currentProduct.id}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all duration-300 text-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {addingToCart === currentProduct.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Adding...
                        </span>
                      ) : (
                        'Add to Cart'
                      )}
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
                            disabled={addingToCart === product.id}
                            className="p-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addingToCart === product.id ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              '+'
                            )}
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

      {/* Floating Cart Summary */}
      {cartItemCount > 0 && (
        <>
          {/* Persistent Cart Button */}
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={() => setShowCartSummary(!showCartSummary)}
              className="bg-indigo-600 text-white p-4 rounded-full shadow-xl hover:bg-indigo-700 transition-colors relative group"
            >
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                View Cart ({cartItemCount} items)
              </div>
            </button>
          </div>

          {/* Cart Summary Panel */}
          {showCartSummary && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/20 z-40"
                onClick={() => setShowCartSummary(false)}
              />
              
              {/* Cart Panel */}
              <div className="fixed bottom-24 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900">Your Cart</h3>
                    <span className="text-sm text-slate-500">({cartItemCount} items)</span>
                  </div>
                  <button
                    onClick={() => setShowCartSummary(false)}
                    className="p-1 text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Cart Items */}
                <div className="max-h-80 overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="p-8 text-center">
                      <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Your cart is empty</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {cart.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex gap-3">
                            <img
                              src={item.imageUrl || '/placeholder.jpg'}
                              alt={item.name}
                              className="w-16 h-16 rounded-lg object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.jpg';
                              }}
                            />
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                                {item.name}
                              </h4>
                              <p className="text-sm font-black text-slate-900 mt-1">
                                ${item.price.toFixed(2)} × {item.quantity}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                    className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                  <button
                                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                    className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                  >
                                    +
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  className="ml-auto text-red-500 hover:text-red-700 text-sm font-bold transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {cart.length > 0 && (
                  <div className="p-4 border-t bg-slate-50">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-slate-600">Total</span>
                      <span className="text-xl font-black text-slate-900">${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowCartSummary(false);
                          router.push('/cart');
                        }}
                        className="flex-1 bg-white border border-slate-300 text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                      >
                        View Cart
                      </button>
                      <button
                        onClick={() => {
                          setShowCartSummary(false);
                          router.push('/checkout');
                        }}
                        className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                      >
                        Checkout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
};

export default ProductShowcase;

// 'use client'

// import React, { useState, useEffect } from 'react';
// import { Star, TrendingUp, Zap, Shield, Truck, Award } from 'lucide-react';
// import { Product, Manufacturer, CartItem, User } from '@/types';
// import AIAssistant from '@/components/AIAssistant';
// import { useParams, useRouter } from 'next/navigation';
// import { supabase, cartService } from '@/lib/supabase';

// const ProductShowcase: React.FC = () => {
//   const params = useParams();
//   const router = useRouter();
//   const productId = params?.id as string;

//   // State
//   const [featuredProduct, setFeaturedProduct] = useState<Product | null>(null);
//   const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
//   const [manufacturer, setManufacturer] = useState<Manufacturer | null>(null);
//   const [activeIndex, setActiveIndex] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [cart, setCart] = useState<CartItem[]>([]);
//   const [user, setUser] = useState<User[]>([])

//   // components/ProductShowcase.tsx
//   // ... existing state ...

//   // Add to cart handler
//   const handleAddToCart = async (product: Product) => {
//     if (!user) {
//       // If user is not logged in, show auth modal or store in localStorage
//       const tempCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
//       const existingIndex = tempCart.findIndex((item: any) => item.productId === product.id);
      
//       if (existingIndex > -1) {
//         tempCart[existingIndex].quantity += 1;
//       } else {
//         tempCart.push({
//           productId: product.id,
//           product,
//           quantity: 1,
//           addedAt: new Date().toISOString()
//         });
//       }
      
//       localStorage.setItem('temp_cart', JSON.stringify(tempCart));
      
//       // Update local state
//       setCart(prev => {
//         const existing = prev.find(item => item.id === product.id);
//         if (existing) {
//           return prev.map(item =>
//             item.id === product.id
//               ? { ...item, quantity: item.quantity + 1 }
//               : item
//           );
//         }
//         return [...prev, { ...product, quantity: 1 }];
//       });
//     } else {
//       // User is logged in, sync with Supabase
//       try {
//         const success = await cartService.addToCart(user.id, product.id, 1);
        
//         if (success) {
//           // Update local state
//           setCart(prev => {
//             const existing = prev.find(item => item.id === product.id);
//             if (existing) {
//               return prev.map(item =>
//                 item.id === product.id
//                   ? { ...item, quantity: item.quantity + 1 }
//                   : item
//               );
//             }
//             return [...prev, { ...product, quantity: 1 }];
//           });
          
//           // Show success message
//           alert(`${product.name} added to cart!`);
          
//           // Refresh cart from Supabase to ensure consistency
//           await fetchUserCart();
//         } else {
//           alert('Failed to add item to cart. Please try again.');
//         }
//       } catch (error) {
//         console.error('Error adding to cart:', error);
//         alert('An error occurred. Please try again.');
//       }
//     }
//   };

//   // Fetch user's cart from Supabase
//   const fetchUserCart = async () => {
//     if (!user) return;
    
//     try {
//       const cartItems = await cartService.getUserCart(user.id);
      
//       // Convert to CartItem format for local state
//       const formattedCart = cartItems.map(item => ({
//         id: item.product.id,
//         name: item.product.name,
//         description: item.product.description,
//         price: item.product.price,
//         retailPriceEstimation: item.product.retailPriceEstimation,
//         category: item.product.category,
//         stock: item.product.stock,
//         imageUrl: item.product.imageUrl,
//         specifications: item.product.specifications,
//         manufacturerId: item.product.manufacturerId,
//         minimumOrderQuantity: item.product.minimumOrderQuantity,
//         isFeatured: item.product.isFeatured,
//         quantity: item.quantity
//       }));
      
//       setCart(formattedCart);
      
//       // Also update localStorage for consistency
//       localStorage.setItem('ds_cart', JSON.stringify(formattedCart));
//     } catch (error) {
//       console.error('Error fetching cart:', error);
//     }
//   };

//   // Load cart on component mount and when user changes
//   useEffect(() => {
//     if (user) {
//       fetchUserCart();
//     } else {
//       // Load from localStorage for guest users
//       const savedCart = localStorage.getItem('ds_cart');
//       if (savedCart) {
//         try {
//           setCart(JSON.parse(savedCart));
//         } catch (e) {
//           console.error('Failed to load cart:', e);
//         }
//       }
//     }
//   }, [user]);

//   // ... rest of the component ...

//   // Fetch product data
//   useEffect(() => {
//     const fetchProductData = async () => {
//       if (!productId) return;

//       try {
//         setLoading(true);

//         // Fetch main product with manufacturer info
//         const { data: productData, error: productError } = await supabase
//           .from('products')
//           .select(`
//             *,
//             manufacturers(
//               id,
//               company_name,
//               logo_url,
//               bio,
//               location,
//               established_year,
//               verification_status
//             )
//           `)
//           .eq('id', productId)
//           .single();

//         if (productError) throw productError;

//         if (productData) {
//           const normalizedProduct: Product = {
//             id: productData.id,
//             name: productData.name,
//             description: productData.description,
//             price: Number(productData.price),
//             retailPriceEstimation: Number(productData.retail_price_estimation),
//             category: productData.category,
//             stock: productData.stock,
//             imageUrl: productData.image_url,
//             specifications: productData.specifications,
//             manufacturerId: productData.manufacturer_id,
//             manufacturerName: productData.manufacturers?.company_name,
//             isFeatured: productData.is_featured,
//             minimumOrderQuantity: productData.minimum_order_quantity
//           };

//           setFeaturedProduct(normalizedProduct);
//           setManufacturer(productData.manufacturers as Manufacturer);

//           // Fetch related products from same manufacturer
//           const { data: relatedData, error: relatedError } = await supabase
//             .from('products')
//             .select('*')
//             .eq('manufacturer_id', productData.manufacturer_id)
//             .neq('id', productId)
//             .limit(5);

//           if (!relatedError && relatedData) {
//             setRelatedProducts(
//               relatedData.map(p => ({
//                 id: p.id,
//                 name: p.name,
//                 description: p.description,
//                 price: Number(p.price),
//                 retailPriceEstimation: Number(p.retail_price_estimation),
//                 category: p.category,
//                 stock: p.stock,
//                 imageUrl: p.image_url,
//                 specifications: p.specifications,
//                 manufacturerId: p.manufacturer_id,
//                 manufacturerName: productData.manufacturers?.company_name,
//                 isFeatured: p.is_featured,
//                 minimumOrderQuantity: p.minimum_order_quantity
//               }))
//             );
//           }
//         }
//       } catch (err) {
//         console.error('Error fetching product:', err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProductData();
//   }, [productId]);

//   // Load cart from localStorage
//   useEffect(() => {
//     const savedCart = localStorage.getItem('ds_cart');
//     if (savedCart) {
//       try {
//         setCart(JSON.parse(savedCart));
//       } catch (e) {
//         console.error('Failed to load cart:', e);
//       }
//     }
//   }, []);

//   // Save cart to localStorage
//   useEffect(() => {
//     localStorage.setItem('ds_cart', JSON.stringify(cart));
//   }, [cart]);

//   // Handlers
//   // const handleAddToCart = (product: Product) => {
//   //   setCart(prev => {
//   //     const existing = prev.find(item => item.id === product.id);
//   //     if (existing) {
//   //       return prev.map(item =>
//   //         item.id === product.id
//   //           ? { ...item, quantity: item.quantity + 1 }
//   //           : item
//   //       );
//   //     }
//   //     return [...prev, { ...product, quantity: 1 }];
//   //   });

//   //   // Show success message (you can add a toast notification here)
//   //   alert(`${product.name} added to cart!`);
//   // };

//   const handleViewDetails = (product: Product) => {
//     router.push(`/products/${product.id}`);
//   };

//   // Loading state
//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
//           <p className="text-slate-600">Loading product...</p>
//         </div>
//       </div>
//     );
//   }

//   // Error state
//   if (!featuredProduct) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <h2 className="text-2xl font-bold text-slate-900 mb-2">Product Not Found</h2>
//           <p className="text-slate-600 mb-4">The product you're looking for doesn't exist.</p>
//           <button
//             onClick={() => router.push('/')}
//             className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
//           >
//             Back to Marketplace
//           </button>
//         </div>
//       </div>
//     );
//   }

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

//   const displayProducts = [featuredProduct, ...relatedProducts];
//   const currentProduct = displayProducts[activeIndex];

//   return (
//     <section className="py-16 min-h-screen bg-slate-50">
//       <div className="max-w-6xl mx-auto px-4">
//         {/* Back Button */}
//         <button
//           onClick={() => router.back()}
//           className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-bold mb-8 transition-colors"
//         >
//           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
//           </svg>
//           Back
//         </button>

//         {/* Header */}
//         <div className="text-center mb-12">
//           <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
//             <Zap className="w-4 h-4" />
//             Factory Direct Deal
//           </div>
//           <h2 className="text-4xl font-black text-slate-900 mb-4">
//             {manufacturer?.company_name || 'Product Details'}
//           </h2>
//         </div>

//         <div className="grid lg:grid-cols-2 gap-12">
//           {/* Featured Product Display */}
//           <div className="relative">
//             <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-3xl overflow-hidden shadow-2xl">
//               {/* Product Image */}
//               <div className="relative h-64 overflow-hidden">
//                 <img
//                   src={currentProduct.imageUrl}
//                   alt={currentProduct.name}
//                   className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
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
//                     SAVE {Math.round((1 - currentProduct.price / currentProduct.retailPriceEstimation) * 100)}%
//                   </div>
//                 </div>
//               </div>

//               {/* Product Info */}
//               <div className="p-8 text-white">
//                 <div className="flex items-start justify-between mb-6">
//                   <div>
//                     <h3 className="text-2xl font-bold mb-2">{currentProduct.name}</h3>
//                     <div className="flex items-center gap-2">
//                       <div className="flex items-center gap-1">
//                         {[...Array(5)].map((_, i) => (
//                           <Star key={i} className="w-4 h-4 text-amber-400 fill-current" />
//                         ))}
//                       </div>
//                       <span className="text-white/70">4.8 • {currentProduct.category}</span>
//                     </div>
//                   </div>
//                   <div className="text-right">
//                     <div className="text-3xl font-black">${currentProduct.price}</div>
//                     <div className="text-white/70 line-through">${currentProduct.retailPriceEstimation}</div>
//                   </div>
//                 </div>

//                 <p className="text-white/80 mb-8">{currentProduct.description}</p>

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
//                     onClick={() => handleAddToCart(currentProduct)}
//                     className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all duration-300 text-center"
//                   >
//                     Add to Cart
//                   </button>
//                   {currentProduct.id !== featuredProduct.id && (
//                     <button
//                       onClick={() => handleViewDetails(currentProduct)}
//                       className="flex-1 bg-white/10 text-white py-4 rounded-xl font-bold hover:bg-white/20 transition-colors"
//                     >
//                       View Details
//                     </button>
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Decorative elements */}
//             <div className="absolute -z-10 -top-6 -right-6 w-64 h-64 bg-gradient-to-br from-indigo-300 to-purple-300 rounded-full blur-3xl opacity-20" />
//           </div>

//           {/* Product Carousel */}
//           <div>
//             <h3 className="text-2xl font-bold text-slate-900 mb-6">
//               {relatedProducts.length > 0 ? 'More from this Manufacturer' : 'Product Details'}
//             </h3>
            
//             {relatedProducts.length > 0 && (
//               <div className="space-y-4 mb-8">
//                 {displayProducts.map((product, index) => (
//                   <div
//                     key={product.id}
//                     className={`group bg-white rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer ${
//                       activeIndex === index
//                         ? 'border-indigo-500 shadow-xl scale-[1.02]'
//                         : 'border-slate-200 hover:border-indigo-300 hover:shadow-lg'
//                     }`}
//                     onClick={() => setActiveIndex(index)}
//                     onMouseEnter={() => setActiveIndex(index)}
//                   >
//                     <div className="flex items-center gap-4">
//                       <div className="relative">
//                         <img
//                           src={product.imageUrl}
//                           alt={product.name}
//                           className="w-20 h-20 rounded-xl object-cover"
//                         />
//                         {product.isFeatured && (
//                           <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-xs text-white">
//                             🔥
//                           </div>
//                         )}
//                       </div>

//                       <div className="flex-1">
//                         <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
//                           {product.name}
//                         </h4>
//                         <div className="flex items-center gap-3 mt-2">
//                           <div className="flex items-center gap-1">
//                             <span className="text-lg font-black text-slate-900">${product.price}</span>
//                             <span className="text-slate-400 line-through text-sm">${product.retailPriceEstimation}</span>
//                           </div>
//                           <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
//                             Save {Math.round((1 - product.price / product.retailPriceEstimation) * 100)}%
//                           </span>
//                         </div>
//                       </div>

//                       <button
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleAddToCart(product);
//                         }}
//                         className="p-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
//                       >
//                         +
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}

//             {/* Stats Section */}
//             <div className="grid grid-cols-3 gap-4 mb-8">
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

//             {/* AI Assistant */}
//             <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
//               <AIAssistant selectedProduct={featuredProduct} />
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default ProductShowcase;