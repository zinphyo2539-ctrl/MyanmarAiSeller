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
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#181810] border border-[#393426] rounded-none sm:rounded-3xl w-full max-w-lg h-full sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#393426] flex items-center justify-between bg-[#11110D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A227]/10 flex items-center justify-center text-[#C9A227]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F2E8]">
                {lang === 'my' ? 'အော်ဒါ အကူအညီ' : 'Order Support'}
              </h2>
              <p className="text-[10px] text-[#817D70] uppercase font-bold tracking-wider mt-0.5">
                {step === 'chat' ? (lang === 'my' ? 'ဆိုင်ရှင်နှင့် စကားပြောရန်' : 'Live Chat') : (lang === 'my' ? 'ကုဒ်စစ်ဆေးခြင်း' : 'Verification')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-[#252419] rounded-xl text-[#817D70] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'verify' ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2 text-center">
                <div className="w-16 h-16 bg-[#1E1D14] border border-[#393426] rounded-2xl flex items-center justify-center mx-auto text-[#817D70] mb-2">
                  <Key className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-[#F5F2E8]">
                  {lang === 'my' ? 'အော်ဒါစစ်ဆေးရန်' : 'Verify Order'}
                </h3>
                <p className="text-xs text-[#817D70] leading-relaxed max-w-[280px] mx-auto">
                  {lang === 'my' 
                    ? 'သင့် Customer Code ကို ထည့်သွင်းပြီး အော်ဒါအခြေအနေကို စစ်ဆေးနိုင်ပါသည်။' 
                    : 'Enter your Customer Code to check your order status.'}
                </p>
              </div>

              <form onSubmit={verifySupport} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-[11px] text-red-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[#817D70] ml-1">Customer Code</label>
                  <input 
                    type="text" 
                    placeholder={lang === 'my' ? 'သင့် Customer Code ကို ထည့်ပါ' : 'Enter Customer Code'} 
                    value={code} 
                    onChange={e => setCode(e.target.value)} 
                    className="w-full bg-[#11110D] border border-[#393426] focus:border-[#C9A227] rounded-xl p-3.5 text-[#F5F2E8] text-sm outline-none transition-all font-mono" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[#817D70] ml-1">
                    {lang === 'my' ? 'ဖုန်းနံပါတ် (လိုအပ်ပါက)' : 'Phone Number (Optional)'}
                  </label>
                  <input 
                    type="tel" 
                    placeholder={lang === 'my' ? '၀၉xxxxxxxxx' : '09xxxxxxxxx'} 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    className="w-full bg-[#11110D] border border-[#393426] focus:border-[#C9A227] rounded-xl p-3.5 text-[#F5F2E8] text-sm outline-none transition-all font-mono" 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-[#C9A227] hover:bg-[#A88419] py-4 rounded-2xl font-bold text-[#0B0B09] text-sm shadow-lg shadow-[#C9A227]/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{lang === 'my' ? 'စစ်ဆေးနေပါသည်...' : 'Verifying...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{lang === 'my' ? 'အော်ဒါအခြေအနေ စစ်ဆေးရန်' : 'Verify & Check Status'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col h-[50vh] sm:h-96 space-y-4 animate-in fade-in duration-500">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-[#393426]">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-[#817D70]">
                    <MessageSquare className="w-8 h-8 opacity-20" />
                    <p className="text-xs">{lang === 'my' ? 'စကားစတင်ရန် မက်ဆေ့ခ်ျ ပို့နိုင်ပါသည်။' : 'Send a message to start the conversation.'}</p>
                  </div>
                ) : (
                  messages.map(m => (
                    <div key={m.id} className={`flex flex-col ${m.sender === 'customer' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        m.sender === 'customer' 
                          ? 'bg-[#1E1D14] border border-[#393426] text-[#F5F2E8] rounded-tr-none' 
                          : 'bg-[#C9A227]/10 border border-[#C9A227]/20 text-[#F5F2E8] rounded-tl-none'
                      }`}>
                        {m.text}
                      </div>
                      <span className="text-[9px] text-[#817D70] mt-1 px-1">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <form onSubmit={sendMessage} className="flex gap-2 pt-2 border-t border-[#393426]">
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)} 
                  className="flex-1 bg-[#11110D] border border-[#393426] focus:border-[#C9A227] rounded-xl p-3.5 text-[#F5F2E8] text-sm outline-none transition-all" 
                  placeholder={lang === 'my' ? 'စာရေးရန်...' : 'Type message...'} 
                />
                <button 
                  type="submit" 
                  className="bg-[#C9A227] hover:bg-[#A88419] p-3.5 rounded-xl transition-all shadow-lg active:scale-95"
                  aria-label="Send"
                >
                  <Send className="w-5 h-5 text-[#0B0B09]" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
