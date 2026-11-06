import React, { useState } from 'react';
import { Search, MessageSquare, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';

interface CustomerCodeLookupProps {
  lang: 'my' | 'en';
  onCheckStatus: (code: string) => void;
  onContactSupport: () => void;
}

export const CustomerCodeLookup: React.FC<CustomerCodeLookupProps> = ({
  lang,
  onCheckStatus,
  onContactSupport
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError(lang === 'my' ? 'Customer Code ကို ထည့်သွင်းပေးပါ' : 'Please enter Customer Code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/public/support/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      });

      if (!res.ok) {
        throw new Error(
          lang === 'my' 
            ? 'ကုဒ်ကို စစ်ဆေး၍ မရပါ။ ကုဒ်ကို ပြန်လည်စစ်ဆေးပြီး ထပ်မံကြိုးစားပါ။' 
            : 'Invalid code. Please check and try again.'
        );
      }

      onCheckStatus(code.trim());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative z-10 w-full bg-slate-950/70 border-b border-white/10 px-4 py-4 sm:py-5 backdrop-blur-xl">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-all hover:border-purple-500/30">
          
          {/* Text Content */}
          <div className="space-y-1 lg:max-w-md">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/25 text-purple-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <span>{lang === 'my' ? 'အော်ဒါစစ်ဆေးရန်' : 'Order Lookup'}</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
              {lang === 'my' 
                ? 'သင့် Customer Code ကို ထည့်သွင်းပြီး အော်ဒါအခြေအနေကို စစ်ဆေးနိုင်သလို Customer Service ထံလည်း ဆက်သွယ်နိုင်ပါသည်။' 
                : 'Enter your Customer Code to track status or reach Customer Service.'}
            </p>
          </div>

          {/* Form Area */}
          <div className="flex-1 w-full max-w-xl">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1 group">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={lang === 'my' ? 'သင့် Customer Code ကို ထည့်ပါ (e.g. ORD-1234)' : 'Enter Customer Code (e.g. ORD-1234)'}
                  className={`w-full bg-white/[0.04] border focus:ring-4 rounded-xl pl-3.5 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none transition-all font-mono ${
                    error 
                      ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/10' 
                      : 'border-white/10 focus:border-purple-500 focus:bg-white/[0.07] focus:ring-purple-500/20'
                  }`}
                  disabled={loading}
                />
                {error && (
                  <div className="absolute -bottom-5 left-1 text-[9px] font-bold text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 active:scale-95 disabled:opacity-50 shrink-0"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{lang === 'my' ? 'စစ်ဆေးနေသည်...' : 'Checking...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{lang === 'my' ? 'စစ်ဆေးမည်' : 'Track Order'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onContactSupport}
                  className="px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                  title={lang === 'my' ? 'Customer Service သို့ ဆက်သွယ်ရန်' : 'Contact Support'}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline">{lang === 'my' ? 'အကူအညီ' : 'Support'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
