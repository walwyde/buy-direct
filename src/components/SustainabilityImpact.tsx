import React, { useEffect, useState } from 'react';
import { Leaf, Trees, Cloud, Recycle, Factory, Truck, Package, Zap } from 'lucide-react';

interface SustainabilityImpactProps {
  carbonReduction: number;
}

const SustainabilityImpact: React.FC<SustainabilityImpactProps> = ({ carbonReduction }) => {
  const [treesEquivalent, setTreesEquivalent] = useState(0);
  const [trucksRemoved, setTrucksRemoved] = useState(0);
  const [warehouseReduction, setWarehouseReduction] = useState(0);
  const [animatedCarbon, setAnimatedCarbon] = useState(0);

  useEffect(() => {
    // Calculate equivalents
    setTreesEquivalent(Math.round(carbonReduction * 20)); // 1 ton CO2 = ~20 trees
    setTrucksRemoved(Math.round(carbonReduction / 2.7)); // Average truck emits 2.7 tons CO2 per 1000 miles
    setWarehouseReduction(Math.round(carbonReduction / 5)); // Rough estimate

    // Animate carbon reduction number
    let start = 0;
    const end = carbonReduction;
    const duration = 2000;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setAnimatedCarbon(Math.round(start));
    }, 16);

    return () => clearInterval(timer);
  }, [carbonReduction]);

  const impacts = [
    {
      icon: <Trees className="w-6 h-6" />,
      value: treesEquivalent.toLocaleString(),
      label: 'Trees Equivalent',
      description: 'Amount of CO2 absorbed',
      color: 'from-emerald-500 to-green-600'
    },
    {
      icon: <Truck className="w-6 h-6" />,
      value: trucksRemoved.toLocaleString(),
      label: 'Truck Trips Saved',
      description: 'Eliminated from supply chain',
      color: 'from-blue-500 to-cyan-600'
    },
    {
      icon: <Factory className="w-6 h-6" />,
      value: warehouseReduction.toLocaleString(),
      label: 'Warehouse Days',
      description: 'Storage time eliminated',
      color: 'from-purple-500 to-pink-600'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      value: `${Math.round(carbonReduction * 1200).toLocaleString()} kWh`,
      label: 'Energy Saved',
      description: 'Equivalent electricity',
      color: 'from-amber-500 to-orange-600'
    }
  ];

  const processSteps = [
    {
      step: '1',
      title: 'Direct Factory Shipping',
      description: 'Eliminates regional distribution centers',
      savings: '45% reduction in transportation emissions',
      icon: <Package className="w-8 h-8" />
    },
    {
      step: '2',
      title: 'No Excess Packaging',
      description: 'Factory packaging optimized for direct delivery',
      savings: '30% less packaging waste',
      icon: <Recycle className="w-8 h-8" />
    },
    {
      step: '3',
      title: 'Consolidated Shipments',
      description: 'Bulk shipping reduces total trips',
      savings: '60% fewer delivery vehicles',
      icon: <Truck className="w-8 h-8" />
    },
    {
      step: '4',
      title: 'Digital Documentation',
      description: 'Paperless transactions and invoices',
      savings: 'Eliminates 2.5kg paper per order',
      icon: <Cloud className="w-8 h-8" />
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-emerald-50 to-white rounded-3xl mb-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
            <Leaf className="w-4 h-4" />
            SUSTAINABILITY IMPACT
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4">
            Building a Greener Supply Chain
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            By eliminating middlemen, we're creating a more sustainable future for commerce
          </p>
        </div>

        {/* Main Impact Display */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div className="relative">
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl p-8 text-white shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-white/20 rounded-2xl">
                  <Leaf className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-2xl font-bold">Carbon Reduction Achievement</div>
                  <div className="text-emerald-200">Since platform launch</div>
                </div>
              </div>

              <div className="text-center mb-8">
                <div className="text-7xl font-black mb-4">{animatedCarbon.toLocaleString()}</div>
                <div className="text-2xl font-bold">Metric Tons of CO₂ Prevented</div>
                <div className="text-emerald-200 mt-2">Equivalent to taking {Math.round(animatedCarbon * 2.3)} cars off the road for a year</div>
              </div>

              <div className="relative h-4 bg-white/20 rounded-full overflow-hidden mb-8">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-white to-emerald-200 transition-all duration-2000"
                  style={{ width: `${Math.min(100, (animatedCarbon / carbonReduction) * 100)}%` }}
                />
              </div>

              <div className="text-center">
                <div className="text-sm text-emerald-200 mb-2">Annual Target: {Math.round(carbonReduction * 1.5).toLocaleString()} tons</div>
                <div className="text-lg font-bold">
                  {Math.round((animatedCarbon / (carbonReduction * 1.5)) * 100)}% of annual goal achieved
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-emerald-200 rounded-full blur-3xl opacity-30 -z-10" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-green-200 rounded-full blur-3xl opacity-30 -z-10" />
          </div>

          {/* Impact Breakdown */}
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Environmental Impact Breakdown</h3>
            <div className="space-y-6">
              {impacts.map((impact, index) => (
                <div 
                  key={index}
                  className="group bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-xl bg-gradient-to-br ${impact.color} text-white`}>
                      {impact.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-black text-slate-900">{impact.value}</div>
                        <div className="text-sm text-slate-500">{impact.description}</div>
                      </div>
                      <div className="text-lg font-bold text-slate-800">{impact.label}</div>
                    </div>
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${impact.color}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Process Steps */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            How Direct Shipping Reduces Environmental Impact
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((step, index) => (
              <div 
                key={index}
                className="relative bg-white rounded-2xl p-6 shadow-lg border border-slate-200 group hover:shadow-xl transition-all duration-300"
              >
                {/* Step number */}
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-full flex items-center justify-center text-xl font-black">
                  {step.step}
                </div>

                <div className="mb-6">
                  <div className="p-3 bg-emerald-50 rounded-xl inline-block mb-4">
                    {step.icon}
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h4>
                  <p className="text-slate-600 text-sm mb-4">{step.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="text-sm font-bold text-emerald-600">{step.savings}</div>
                </div>

                {/* Hover line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-6 py-3 shadow-lg mb-8">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-slate-900">Real-time impact tracking available for all partners</span>
          </div>
          <button className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-4 rounded-2xl font-bold hover:shadow-xl hover:scale-105 transition-all duration-300 shadow-lg">
            Download Sustainability Report
          </button>
        </div>
      </div>
    </section>
  );
};

export default SustainabilityImpact;