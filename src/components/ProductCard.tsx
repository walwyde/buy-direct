
import React from 'react';
import { Product, Manufacturer } from '../types';
import { useAuth } from './AuthProvider';

interface ProductCardProps {
  product: Product;
  manufacturer: Manufacturer;
  onAddToCart: (p: Product) => void;
  onViewDetails: (p: Product) => void;
}


const ProductCard: React.FC<ProductCardProps> = ({ product, manufacturer, onAddToCart, onViewDetails }) => {
  const savings = ((product.retailPriceEstimation - product.price) / product.retailPriceEstimation * 100).toFixed(0);
const {user, loading} = useAuth();

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col">
      <div className="relative overflow-hidden cursor-pointer" onClick={() => onViewDetails(product)}>
        <img 
          src={product?.imageUrl} 
          alt={product?.name} 
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
          Save {savings}%
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center mb-2 space-x-2">
          <img src={manufacturer?.logoUrl} className="w-5 h-5 rounded-full object-cover" alt="logo" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{manufacturer?.companyName}</span>
          {manufacturer?.verificationStatus === 'verified' && (
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        
        <h3 
          className="text-lg font-bold text-slate-900 mb-2 cursor-pointer hover:text-indigo-600 transition-colors"
          onClick={() => onViewDetails(product)}
        >
          {product?.name}
        </h3>
        
        <div className="flex items-baseline space-x-2 mb-4">
          <span className="text-2xl font-black text-slate-900">${product?.price.toFixed(2)}</span>
          <span className="text-sm text-slate-400 line-through">${product?.retailPriceEstimation.toFixed(2)}</span>
          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">EST. RETAIL</span>
        </div>

        <div className="mt-auto space-y-2">
          <button 
        disabled={!loading && user?.role === "admin" || !loading && user?.role === "manufacturer"}
            onClick={() => onAddToCart(product)}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
