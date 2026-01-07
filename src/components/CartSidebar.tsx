
import React from 'react';
import { CartItem } from '../types';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onCheckout: () => void;
  loading?: boolean; // Add this
}

const CartSidebar: React.FC<CartSidebarProps> = ({
  isOpen,
  onClose,
  items,
  onRemove,
  onUpdateQty,
  onCheckout,
  loading = false
}) => {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!isOpen) return null;

  
  return (
<div className="...">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        // ... your existing cart items rendering
            <div className="fixed inset-0 z-[60] overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Your Direct-Source Cart</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-4">Your cart is empty.</p>
              <button onClick={onClose} className="text-indigo-600 font-bold">Start Shopping</button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4 border-b border-slate-50 pb-6">
                <img src={item.imageUrl} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" alt={item.name} />
                <div className="flex-grow">
                  <h4 className="font-bold text-slate-900">{item.name}</h4>
                  <p className="text-xs text-slate-500 mb-2">Direct from Manufacturer</p>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3 bg-slate-50 rounded-lg px-2 py-1">
                      <button onClick={() => onUpdateQty(item.id, -1)} className="p-1 hover:text-indigo-600">-</button>
                      <span className="font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => onUpdateQty(item.id, 1)} className="p-1 hover:text-indigo-600">+</button>
                    </div>
                    <div className="text-right">
                      <span className="block font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                      <button onClick={() => onRemove(item.id)} className="text-[10px] text-red-500 uppercase tracking-wider font-bold">Remove</button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t bg-slate-50">
            <div className="flex justify-between items-center mb-6">
              <span className="text-slate-600 font-medium">Subtotal</span>
              <span className="text-2xl font-black text-slate-900">${total.toFixed(2)}</span>
            </div>
            <button 
              onClick={() => { onCheckout(); onClose(); }}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-xl shadow-slate-200"
            >
              Proceed to Secure Checkout
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">
              Shipping directly from source • No Retail Markups
            </p>
          </div>
        )}
      </div>
    </div>
      )}
    </div>) 
};

export default CartSidebar;
