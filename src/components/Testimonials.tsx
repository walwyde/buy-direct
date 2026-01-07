import React, { useState } from 'react';
import { Quote, Star, Award, Zap, Shield, TrendingUp } from 'lucide-react';

const Testimonials: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Operations Manager, TechCorp',
      avatar: 'SC',
      quote: 'Cut our procurement costs by 65% while improving quality. The direct factory connection eliminated months of negotiations.',
      savings: '$240K',
      duration: '6 months',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      name: 'Marcus Johnson',
      role: 'Founder, UrbanGoods',
      avatar: 'MJ',
      quote: 'From concept to delivery in 3 weeks instead of 3 months. The transparency in pricing and production is revolutionary.',
      savings: '78% faster',
      duration: '12 orders',
      color: 'from-purple-500 to-pink-500'
    },
    {
      name: 'Elena Rodriguez',
      role: 'Procurement Director, GlobalRetail',
      avatar: 'ER',
      quote: 'The AI assistant helped us optimize our orders and saved us from potential quality issues. Game-changing platform.',
      savings: '99% quality',
      duration: '8 factories',
      color: 'from-green-500 to-emerald-500'
    },
    {
      name: 'David Kim',
      role: 'CEO, EcoWear',
      avatar: 'DK',
      quote: 'Direct communication with factories reduced our carbon footprint by eliminating 4 middlemen layers.',
      savings: '42% CO₂ reduction',
      duration: 'Sustainable',
      color: 'from-amber-500 to-orange-500'
    }
  ];

  const stats = [
    { icon: <Zap />, value: '10x', label: 'Faster than traditional', color: 'text-yellow-500' },
    { icon: <Shield />, value: '100%', label: 'Quality guarantee', color: 'text-green-500' },
    { icon: <TrendingUp />, value: '70%', label: 'Average savings', color: 'text-blue-500' },
    { icon: <Award />, value: '4.9/5', label: 'Customer rating', color: 'text-purple-500' },
  ];

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-indigo-50 to-transparent -z-10" />
      <div className="absolute -right-32 top-1/2 w-96 h-96 bg-indigo-200 rounded-full blur-3xl opacity-20 -z-10" />
      
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-4 py-2 rounded-full text-sm font-bold mb-4">
            <Quote className="w-4 h-4" />
            TRUSTED BY INDUSTRY LEADERS
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4">
            See What Our Partners Are Saying
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Join thousands of businesses revolutionizing their supply chain
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Testimonials Carousel */}
          <div className="relative">
            <div className="absolute -left-6 top-1/2 transform -translate-y-1/2 text-8xl text-indigo-100 font-serif">
              "
            </div>
            
            <div className="space-y-8">
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index}
                  className={`bg-white rounded-3xl p-8 shadow-xl border border-slate-200 transition-all duration-500 ${
                    activeIndex === index 
                      ? 'opacity-100 scale-100' 
                      : 'opacity-30 scale-95'
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white text-xl font-bold`}>
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-lg text-slate-900">{testimonial.name}</div>
                      <div className="text-slate-600 text-sm">{testimonial.role}</div>
                      <div className="flex items-center gap-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-amber-400 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-slate-700 text-lg italic mb-6">"{testimonial.quote}"</p>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <div>
                      <div className="text-2xl font-black text-slate-900">{testimonial.savings}</div>
                      <div className="text-sm text-slate-500">Total savings</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-900">{testimonial.duration}</div>
                      <div className="text-sm text-slate-500">Time period</div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Dots indicator */}
              <div className="flex justify-center gap-2 mt-8">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      activeIndex === index 
                        ? 'bg-indigo-600 w-8' 
                        : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Stats and Info */}
          <div>
            <div className="mb-12">
              <h3 className="text-3xl font-black text-slate-900 mb-6">
                Why Companies Choose DirectSource
              </h3>
              <div className="space-y-6">
                {stats.map((stat, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                      {stat.icon}
                    </div>
                    <div>
                      <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                      <div className="text-slate-600">{stat.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-3xl p-8 text-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-bold">Enterprise Ready</div>
                  <div className="text-white/80">Custom solutions for large teams</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Unlimited factory connections</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Dedicated account manager</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Priority customer support</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Custom API integration</span>
                </div>
              </div>
              
              <button className="w-full mt-8 bg-white text-slate-900 py-4 rounded-xl font-bold hover:bg-slate-100 transition-colors">
                Request Enterprise Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;