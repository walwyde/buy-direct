import React, { useState, useEffect } from 'react';
import { Calculator, TrendingDown, DollarSign, Percent, Zap } from 'lucide-react';

const SavingsCalculator: React.FC = () => {
  const [retailPrice, setRetailPrice] = useState(1000);
  const [orderQuantity, setOrderQuantity] = useState(100);
  const [savingsRate, setSavingsRate] = useState(60);
  const [animation, setAnimation] = useState(false);

  const directPrice = retailPrice * (1 - savingsRate / 100);
  const retailTotal = retailPrice * orderQuantity;
  const directTotal = directPrice * orderQuantity;
  const totalSavings = retailTotal - directTotal;
  const savingsPercentage = ((totalSavings / retailTotal) * 100).toFixed(1);

  const handleCalculate = () => {
    setAnimation(true);
    setTimeout(() => setAnimation(false), 1000);
  };

  useEffect(() => {
    handleCalculate();
  }, [retailPrice, orderQuantity, savingsRate]);

  const scenarios = [
    { label: 'Small Business', retail: 5000, quantity: 50, rate: 55 },
    { label: 'Growing Brand', retail: 25000, quantity: 500, rate: 62 },
    { label: 'Enterprise', retail: 100000, quantity: 5000, rate: 68 },
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-slate-50 to-white rounded-3xl p-8 mb-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
            <Calculator className="w-4 h-4" />
            SAVINGS CALCULATOR
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4">
            See How Much You Can Save
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Calculate your potential savings by going direct to factories
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Calculator Inputs */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <Calculator className="text-indigo-600" />
                Custom Calculation
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Retail Price Per Unit
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="range"
                      min="100"
                      max="10000"
                      step="100"
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-indigo-600 [&::-webkit-slider-thumb]:to-purple-600"
                    />
                    <div className="flex justify-between mt-2">
                      <span className="text-sm text-slate-500">$100</span>
                      <span className="text-lg font-bold text-slate-900">${retailPrice.toLocaleString()}</span>
                      <span className="text-sm text-slate-500">$10,000</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Order Quantity</label>
                  <input
                    type="range"
                    min="10"
                    max="10000"
                    step="10"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-600 [&::-webkit-slider-thumb]:to-cyan-600"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-slate-500">10 units</span>
                    <span className="text-lg font-bold text-slate-900">{orderQuantity.toLocaleString()} units</span>
                    <span className="text-sm text-slate-500">10,000 units</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Average Savings Rate
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="80"
                    step="5"
                    value={savingsRate}
                    onChange={(e) => setSavingsRate(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-green-600 [&::-webkit-slider-thumb]:to-emerald-600"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-slate-500">30%</span>
                    <span className="text-lg font-bold text-green-600">{savingsRate}% off retail</span>
                    <span className="text-sm text-slate-500">80%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Scenarios */}
            <div>
              <h4 className="text-lg font-bold text-slate-900 mb-4">Quick Scenarios</h4>
              <div className="grid grid-cols-3 gap-4">
                {scenarios.map((scenario, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setRetailPrice(scenario.retail);
                      setOrderQuantity(scenario.quantity);
                      setSavingsRate(scenario.rate);
                    }}
                    className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left"
                  >
                    <div className="text-sm font-bold text-slate-900 mb-1">{scenario.label}</div>
                    <div className="text-xs text-slate-500">
                      ${scenario.retail.toLocaleString()} × {scenario.quantity} units
                    </div>
                    <div className="text-sm font-bold text-green-600 mt-2">{scenario.rate}% savings</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Display */}
          <div className="space-y-6">
            <div className={`bg-gradient-to-br from-slate-900 to-indigo-900 rounded-3xl p-8 text-white transition-all duration-1000 ${
              animation ? 'scale-105' : 'scale-100'
            }`}>
              <div className="flex items-center gap-3 mb-8">
                <TrendingDown className="w-8 h-8 text-green-400" />
                <h3 className="text-2xl font-bold">Your Savings Results</h3>
              </div>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center p-4 bg-white/10 rounded-2xl">
                  <div>
                    <div className="text-white/80 text-sm">Retail Price</div>
                    <div className="text-3xl font-black">${retailPrice.toLocaleString()}</div>
                  </div>
                  <div className="text-4xl opacity-50">→</div>
                  <div>
                    <div className="text-white/80 text-sm">Direct Price</div>
                    <div className="text-3xl font-black text-green-400">${directPrice.toLocaleString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-2xl p-6">
                    <div className="text-white/80 text-sm mb-2">Retail Total</div>
                    <div className="text-4xl font-black">${retailTotal.toLocaleString()}</div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-6">
                    <div className="text-white/80 text-sm mb-2">Direct Total</div>
                    <div className="text-4xl font-black text-green-300">${directTotal.toLocaleString()}</div>
                  </div>
                </div>

                <div className={`text-center p-8 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500 ${
                  animation ? 'scale-110' : 'scale-100'
                }`}>
                  <div className="text-white/90 text-lg mb-2">You Save</div>
                  <div className="text-5xl font-black mb-2">${totalSavings.toLocaleString()}</div>
                  <div className="text-xl font-bold">That's {savingsPercentage}% off retail!</div>
                </div>

                <div className="flex items-center gap-3 text-white/80 text-sm">
                  <Zap className="w-4 h-4" />
                  <span>These savings exclude additional benefits like faster delivery and quality control</span>
                </div>
              </div>
            </div>

            {/* Additional Benefits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                <div className="text-2xl font-black text-blue-600">2-4 weeks</div>
                <div className="text-sm text-slate-600">Faster delivery</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
                <div className="text-2xl font-black text-purple-600">Direct QC</div>
                <div className="text-sm text-slate-600">Quality control</div>
              </div>
            </div>

            <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold hover:shadow-xl hover:scale-105 transition-all duration-300">
              Start Saving Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SavingsCalculator;