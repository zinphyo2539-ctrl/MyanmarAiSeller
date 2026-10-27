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
      // Securely verify through the authoritative API
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

      // Success: established session. Now trigger the UI transition.
      onCheckStatus(code.trim());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative z-10 w-full bg-[#F8FAFC] border-b border-[#CBD5E1] px-4 py-4 sm:py-6 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-[#DBEAFE] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-all hover:shadow-md hover:border-[#2563EB]/20">
          
          {/* Text Content */}
          <div className="space-y-1.5 lg:max-w-md">
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <Search className="w-4 h-4 text-[#2563EB]" />
              <span>{lang === 'my' ? 'အော်ဒါစစ်ဆေးရန်' : 'Order Lookup'}</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-[#64748B] leading-relaxed">
              {lang === 'my' 
                ? 'သင့် Customer Code ကို ထည့်သွင်းပြီး အော်ဒါအခြေအနေကို စစ်ဆေးနိုင်သလို Customer Service ထံလည်း ဆက်သွယ်နိုင်ပါသည်။' 
                : 'Enter your Customer Code to track status or reach Customer Service.'}
            </p>
          </div>

          {/* Form Area */}
          <div className="flex-1 w-full max-w-xl">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={lang === 'my' ? 'သင့် Customer Code ကို ထည့်ပါ' : 'Enter Customer Code'}
                  className={`w-full bg-[#F8FAFC] border focus:ring-4 rounded-xl pl-4 pr-4 py-2.5 text-xs sm:text-sm text-[#0F172A] placeholder-[#64748B] outline-none transition-all font-mono ${
                    error 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' 
                      : 'border-[#CBD5E1] focus:border-[#2563EB] focus:ring-[#2563EB]/10'
                  }`}
                  disabled={loading}
                />
                {error && (
                  <div className="absolute -bottom-5 left-1 text-[9px] font-bold text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-3 h-3" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                  <span>{loading ? (lang === 'my' ? 'စစ်ဆေးနေပါသည်...' : 'Checking...') : (lang === 'my' ? 'အော်ဒါအခြေအနေ စစ်ဆေးရန်' : 'Check Status')}</span>
                </button>

                <button
                  type="button"
                  onClick={onContactSupport}
                  className="px-4 py-2.5 bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                  title={lang === 'my' ? 'Customer Service သို့ ဆက်သွယ်ရန်' : 'Contact Customer Service'}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span className="hidden sm:inline">{lang === 'my' ? 'Customer Service' : 'Support'}</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </section>
  );
};
