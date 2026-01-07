
import React from 'react';

const ProcessPage: React.FC = () => {
  const steps = [
    {
      title: "Manufacturer Verification",
      description: "We physically visit and verify every factory that lists on DirectSource. We check quality standards, working conditions, and production capacity.",
      icon: (
        <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04kM12 21a11.955 11.955 0 01-8.618-3.04kM12 2.944a11.955 11.955 0 018.618 3.04kM12 21a11.955 11.955 0 008.618-3.04k" />
        </svg>
      )
    },
    {
      title: "No Middleman Markup",
      description: "Standard retail models add 200-500% in markups for logistics, wholesaling, and storefronts. DirectSource products ship straight from the source.",
      icon: (
        <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Real-time Production Logistics",
      description: "Our integrated platform allows you to see inventory directly from the factory's ERP system. When you buy, the factory is notified instantly.",
      icon: (
        <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      title: "Doorstep Delivery",
      description: "Our logistics partners collect directly from the factory gates and deliver to your home, maintaining a lean chain of custody.",
      icon: (
        <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">How it Works</h1>
        <p className="text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto">
          We've spent years building direct integration with manufacturing hubs to bring you factory-floor pricing without the factory-level complexity.
        </p>
      </div>

      <div className="space-y-12 relative">
        <div className="absolute left-8 top-8 bottom-8 w-1 bg-indigo-50 hidden md:block" />
        
        {steps.map((step, idx) => (
          <div key={idx} className="relative flex gap-8 items-start">
            <div className="w-16 h-16 bg-white border-4 border-indigo-50 rounded-2xl flex items-center justify-center flex-shrink-0 z-10 shadow-sm">
              {step.icon}
            </div>
            <div className="pt-2">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-slate-500 text-lg leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 p-10 bg-indigo-600 rounded-[3rem] text-center text-white shadow-2xl shadow-indigo-200">
        <h2 className="text-3xl font-black mb-4">Ready to cut the middlemen?</h2>
        <p className="text-indigo-100 mb-8 max-w-lg mx-auto">Join 50,000+ smart shoppers buying directly from verified source factories.</p>
        <button className="bg-white text-indigo-600 px-10 py-4 rounded-2xl font-black hover:bg-slate-50 transition-all shadow-lg active:scale-95">
          Start Shopping Direct
        </button>
      </div>
    </div>
  );
};

export default ProcessPage;
