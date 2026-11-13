import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, AlertCircle, RefreshCw, Key } from 'lucide-react';

interface OrderSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
  initialCode?: string;
}

export const OrderSupportModal: React.FC<OrderSupportModalProps> = ({ isOpen, onClose, lang, initialCode }) => {
  const [step, setStep] = useState<'verify' | 'chat'>('verify');
  const [code, setCode] = useState(initialCode || '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for existing session on open
  useEffect(() => {
    if (isOpen) {
      if (initialCode) setCode(initialCode);
      fetchMessages(true);
    }
  }, [isOpen, initialCode]);

  const verifySupport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        body: JSON.stringify({ code: code.trim(), phone: phone.trim() || undefined })
      });
      if (!res.ok) throw new Error(lang === 'my' ? 'ကုဒ်ကို စစ်ဆေး၍ မရပါ။ ကုဒ်ကို ပြန်လည်စစ်ဆေးပြီး ထပ်မံကြိုးစားပါ။' : 'Invalid support code');
      
      setStep('chat');
      fetchMessages();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (checkOnly = false) => {
    try {
      const res = await fetch('/api/public/support/chat');
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        setStep('chat');
      } else if (!checkOnly) {
        setStep('verify');
      }
    } catch {
      if (!checkOnly) setStep('verify');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const res = await fetch('/api/public/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMessage })
      });
      if (res.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch {}
  };

  useEffect(() => {
    if (step === 'chat' && isOpen) {
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [step, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto transition-all duration-300">
      <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl w-full max-w-lg shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col my-auto text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--brand-primary)]/15 border border-[var(--brand-primary)]/25 flex items-center justify-center text-[var(--brand-primary)] shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {lang === 'my' ? 'အော်ဒါ အကူအညီ' : 'Order Support'}
              </h2>
              <p className="text-[10px] text-[var(--brand-primary)]/80 uppercase font-bold tracking-wider mt-0.5 font-mono">
                {step === 'chat' ? (lang === 'my' ? 'ဆိုင်ရှင်နှင့် တိုက်ရိုက်ဆက်သွယ်ရန်' : 'Live Chat with Seller') : (lang === 'my' ? 'Customer Code စစ်ဆေးခြင်း' : 'Code Verification')}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="hover:bg-white/10 rounded-full p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'verify' ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[var(--brand-primary)]/20 via-[var(--brand-primary)]/10 to-blue-500/10 border border-[var(--brand-primary)]/30 rounded-2xl flex items-center justify-center mx-auto text-[var(--brand-primary)] mb-2 shadow-lg shadow-[var(--brand-primary)]/20">
                  <Key className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {lang === 'my' ? 'အော်ဒါစစ်ဆေးရန်' : 'Verify Order'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-[300px] mx-auto">
                  {lang === 'my' 
                    ? 'သင့် Customer Code ကို ထည့်သွင်းပြီး အော်ဒါအခြေအနေကို စစ်ဆေးနိုင်ပါသည်။' 
                    : 'Enter your Customer Code to check your order status.'}
                </p>
              </div>

              <form onSubmit={verifySupport} className="space-y-4">
                {error && (
                  <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider ml-1">Customer Code *</label>
                  <input 
                    type="text" 
                    placeholder={lang === 'my' ? 'သင့် Customer Code ကို ထည့်ပါ' : 'Enter Customer Code'} 
                    value={code} 
                    onChange={e => setCode(e.target.value)} 
                    className="w-full bg-white/[0.04] border border-white/10 focus:border-[var(--brand-primary)] focus:bg-white/[0.08] focus:ring-4 focus:ring-[var(--brand-primary)]/15 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all font-mono" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider ml-1">
                    {lang === 'my' ? 'ဖုန်းနံပါတ် (လိုအပ်ပါက)' : 'Phone Number (Optional)'}
                  </label>
                  <input 
                    type="tel" 
                    placeholder={lang === 'my' ? '၀၉xxxxxxxxx' : '09xxxxxxxxx'} 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    className="w-full bg-white/[0.04] border border-white/10 focus:border-[var(--brand-primary)] focus:bg-white/[0.08] focus:ring-4 focus:ring-[var(--brand-primary)]/15 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all font-mono" 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-[var(--brand-primary)] hover:brightness-110 text-[var(--brand-on-primary)] font-semibold py-3.5 px-6 rounded-xl shadow-lg shadow-[var(--brand-primary)]/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-50 text-sm"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{lang === 'my' ? 'စစ်ဆေးနေပါသည်...' : 'Verifying...'}</span>
                    </>
                  ) : (
                    <span>{lang === 'my' ? 'အော်ဒါအခြေအနေ စစ်ဆေးရန်' : 'Verify & Check Status'}</span>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col h-[55vh] sm:h-[420px] space-y-4 animate-in fade-in duration-300">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-slate-500">
                    <MessageSquare className="w-8 h-8 opacity-30" />
                    <p className="text-xs">{lang === 'my' ? 'စကားစတင်ရန် မက်ဆေ့ခ်ျ ပို့နိုင်ပါသည်။' : 'Send a message to start the conversation.'}</p>
                  </div>
                ) : (
                  messages.map(m => (
                    <div key={m.id} className={`flex flex-col ${m.sender === 'customer' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        m.sender === 'customer' 
                          ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)] rounded-tr-sm shadow-md' 
                          : 'bg-white/[0.05] border border-white/10 text-slate-200 rounded-tl-sm'
                      }`}>
                        {m.text}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 px-1 font-mono">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <form onSubmit={sendMessage} className="flex gap-2 pt-3 border-t border-white/10">
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)} 
                  className="flex-1 bg-white/[0.04] border border-white/10 focus:border-[var(--brand-primary)] focus:bg-white/[0.08] focus:ring-4 focus:ring-[var(--brand-primary)]/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all" 
                  placeholder={lang === 'my' ? 'စာရေးရန်...' : 'Type message...'} 
                />
                <button 
                  type="submit" 
                  className="bg-[var(--brand-primary)] hover:brightness-110 p-3 rounded-xl text-[var(--brand-on-primary)] shadow-lg shadow-[var(--brand-primary)]/30 active:scale-95 transition-all cursor-pointer"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
