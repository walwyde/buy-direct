import React from 'react';
import { TrendingUp, Factory, Package, Leaf } from 'lucide-react';

interface StatsBarProps {
  stats: {
    totalSavings: number;
    activeFactories: number;
    completedOrders: number;
    carbonReduction: number;
  };
}

const StatsBar: React.FC<StatsBarProps> = ({ stats }) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num}`;
  };

  const statsItems = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      value: formatNumber(stats.totalSavings),
      label: 'Total Customer Savings',
      description: 'Money saved vs retail prices',
      color: 'from-green-500 to-emerald-600',
      trend: '+12% this month'
    },
    {
      icon: <Factory className="w-6 h-6" />,
      value: `${stats.activeFactories}+`,
      label: 'Verified Factories',
      description: 'Actively shipping worldwide',
      color: 'from-blue-500 to-cyan-600',
      trend: 'Online now'
    },
    {
      icon: <Package className="w-6 h-6" />,
      value: `${stats.completedOrders.toLocaleString()}`,
      label: 'Direct Orders',
      description: 'Factory-to-customer shipments',
      color: 'from-purple-500 to-pink-600',
      trend: '+150 today'
    },
    {
      icon: <Leaf className="w-6 h-6" />,
      value: `${stats.carbonReduction}t`,
      label: 'CO₂ Reduced',
      description: 'By eliminating warehouses',
      color: 'from-emerald-500 to-teal-600',
      trend: 'Equivalent to 8,500 trees'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
      {statsItems.map((stat, index) => (
        <div 
          key={index}
          className="relative bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group overflow-hidden"
        >
          {/* Background gradient */}
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white`}>
                {stat.icon}
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                {stat.trend}
              </span>
            </div>
            
            <div className="mb-2">
              <div className="text-3xl font-black text-slate-900">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.description}</div>
            </div>
            
            <div className="text-lg font-bold text-slate-800">{stat.label}</div>
            
            {/* Animated progress bar */}
            <div className="mt-4">
              <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${stat.color} transition-all duration-1000 ease-out`}
                  style={{ width: `${(index + 1) * 25}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Hover effect */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 transition-opacity" />
        </div>
      ))}
    </div>
  );
};

export default StatsBar;