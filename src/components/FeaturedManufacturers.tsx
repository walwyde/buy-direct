import React from 'react';
import { Star, CheckCircle, TrendingUp, Globe } from 'lucide-react';
import { Manufacturer } from '@/types';

interface FeaturedManufacturersProps {
  manufacturers: Manufacturer[];
  onViewStore: (id: string) => void;
}

const FeaturedManufacturers: React.FC<FeaturedManufacturersProps> = ({ manufacturers, onViewStore }) => {
  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
          <Star className="w-4 h-4" />
          TOP RATED FACTORIES
        </div>
        <h2 className="text-4xl font-black text-slate-900 mb-4">Meet Our Verified Factories</h2>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Direct from production lines with 99%+ satisfaction rates
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {manufacturers?.map((manufacturer) => (
          <div 
            key={manufacturer.id}
            className="group bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] overflow-hidden cursor-pointer"
            onClick={() => onViewStore(manufacturer?.id)}
          >
            {/* Manufacturer header */}
            <div className="relative h-48 overflow-hidden">
              <img 
                src={manufacturer?.logo_url || '/api/placeholder/400/200'} 
                alt={manufacturer?.company_name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              
              {/* Verified badge */}
              <div className="absolute top-4 right-4">
                <div className="bg-white text-green-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                  <CheckCircle className="w-4 h-4" />
                  VERIFIED
                </div>
              </div>
            </div>
            
            {/* Manufacturer info */}
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <img 
                  src={manufacturer?.logo_url} 
                  alt={manufacturer?.company_name}
                  className="w-16 h-16 rounded-xl border-4 border-white shadow-lg"
                />
                <div>
                  <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {manufacturer?.company_name}
                  </h3>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                    <span className="text-slate-600 text-sm ml-2">4.8</span>
                  </div>
                </div>
              </div>
              
              <p className="text-slate-600 mb-4 line-clamp-2">{manufacturer?.bio}</p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Globe className="w-4 h-4" />
                    <span>{manufacturer.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 font-bold">
                    <TrendingUp className="w-4 h-4" />
                    <span>98% On-time</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
                    {manufacturer.minimumOrder || '$500'} min
                  </span>
                  <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {manufacturer.leadTime || '7-14'} days
                  </span>
                </div>
              </div>
              
              <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors group-hover:bg-indigo-600">
                View Factory Store
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Stats at bottom */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl">
          <div className="text-3xl font-black text-blue-700">99.2%</div>
          <div className="text-slate-700">Quality Score</div>
        </div>
        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl">
          <div className="text-3xl font-black text-green-700">24h</div>
          <div className="text-slate-700">Avg. Response Time</div>
        </div>
        <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
          <div className="text-3xl font-black text-purple-700">15K+</div>
          <div className="text-slate-700">Products Available</div>
        </div>
        <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl">
          <div className="text-3xl font-black text-amber-700">4.8/5</div>
          <div className="text-slate-700">Customer Rating</div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedManufacturers;