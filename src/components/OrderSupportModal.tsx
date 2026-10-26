import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, AlertCircle, RefreshCw, Key } from 'lucide-react';

interface OrderSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'my' | 'en';
}

export const OrderSupportModal: React.FC<OrderSupportModalProps> = ({ isOpen, onClose, lang }) => {
  const [step, setStep] = useState<'verify' | 'chat'>('verify');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const verifySupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/public/support/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, phone })
      });
      if (!res.ok) throw new Error(lang === 'my' ? 'ကုတ်နံပါတ် သို့မဟုတ် ဖုန်းနံပါတ် မှားယွင်းနေပါသည်' : 'Invalid support code or phone');
      setStep('chat');
      fetchMessages();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/public/support/chat');
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {}
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await fetch('/api/public/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMessage })
      });
      setNewMessage('');
      fetchMessages();
    } catch {}
  };

  useEffect(() => {
    if (step === 'chat') {
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [step]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#181810] border border-[#393426] rounded-3xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4 border-b border-[#393426] pb-3">
          <h2 className="text-base font-bold text-[#F5F2E8] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#C9A227]" />
            {lang === 'my' ? 'အော်ဒါ အကူအညီ' : 'Order Support'}
          </h2>
          <button onClick={onClose} className="text-[#817D70] hover:text-[#F5F2E8]"><X className="w-5 h-5" /></button>
        </div>

        {step === 'verify' ? (
          <form onSubmit={verifySupport} className="space-y-4 text-xs">
            {error && <p className="text-red-500">{error}</p>}
            <input type="text" placeholder={lang === 'my' ? 'Support Code' : 'Support Code'} value={code} onChange={e => setCode(e.target.value)} className="w-full bg-[#11110D] border border-[#393426] rounded-xl p-3 text-[#F5F2E8]" required />
            <input type="tel" placeholder={lang === 'my' ? 'ဖုန်းနံပါတ်' : 'Phone Number'} value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-[#11110D] border border-[#393426] rounded-xl p-3 text-[#F5F2E8]" required />
            <button type="submit" disabled={loading} className="w-full bg-[#C9A227] py-3 rounded-xl font-bold text-[#0B0B09]">
              {loading ? (lang === 'my' ? 'စစ်ဆေးနေသည်...' : 'Verifying...') : (lang === 'my' ? 'စစ်ဆေးမည်' : 'Verify')}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="h-64 overflow-y-auto space-y-2 border border-[#393426] p-3 rounded-xl bg-[#11110D]">
              {messages.map(m => (
                <div key={m.id} className={`p-2 rounded-lg text-xs ${m.sender === 'customer' ? 'bg-[#1E1D14] text-white ml-auto' : 'bg-[#C9A227]/20 text-amber-200 mr-auto'}`}>
                  {m.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="flex gap-2">
              <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 bg-[#11110D] border border-[#393426] rounded-xl p-3 text-[#F5F2E8]" placeholder={lang === 'my' ? 'စာရေးရန်...' : 'Type message...'} />
              <button type="submit" className="bg-[#C9A227] p-3 rounded-xl"><Send className="w-4 h-4 text-[#0B0B09]" /></button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
