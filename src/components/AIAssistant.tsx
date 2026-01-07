
import React, { useState, useEffect } from 'react';
import { getDirectPurchaseInsight } from '../services/gemini';
import { Product } from '@/types';

interface AIAssistantProps {
  selectedProduct: Product | null;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ selectedProduct }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      setLoading(true);
      getDirectPurchaseInsight(selectedProduct.name, selectedProduct.price, selectedProduct.retailPriceEstimation)
        .then(res => {
          setInsight(res || '');
          setLoading(false);
        });
    }
  }, [selectedProduct]);

  if (!selectedProduct) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="font-bold text-indigo-900">Direct-Source AI Insight</h3>
      </div>
      
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-indigo-200 rounded w-3/4"></div>
          <div className="h-4 bg-indigo-200 rounded w-full"></div>
          <div className="h-4 bg-indigo-200 rounded w-5/6"></div>
        </div>
      ) : (
        <div className="text-indigo-800 prose prose-sm max-w-none">
          {insight.split('\n').map((line, i) => (
            <p key={i} className="mb-2 leading-relaxed">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
