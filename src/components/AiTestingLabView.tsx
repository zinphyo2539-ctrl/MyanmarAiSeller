import React, { useState, useEffect, useRef } from 'react';
import {
  FlaskConical,
  Bot,
  User,
  Send,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  Sparkles,
  Layers,
  Archive,
  RefreshCw
} from 'lucide-react';
import { Product, SampleReply, AiConfig, AiHealth, TestLabMessage, TestLabStatus } from '../types';

interface AiTestingLabViewProps {
  lang: 'my' | 'en';
  user: any;
  products: Product[];
  samples: SampleReply[];
  aiConfig: AiConfig | null;
  aiHealth: AiHealth | null;
  getHeaders: () => Record<string, string>;
}

export const AiTestingLabView: React.FC<AiTestingLabViewProps> = ({
  lang,
  user,
  products,
  samples,
  aiConfig,
  aiHealth,
  getHeaders
}) => {
  // Session State
  const [sessionId, setSessionId] = useState<string>(() => `test_session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const [messages, setMessages] = useState<TestLabMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [catalogMode, setCatalogMode] = useState<'real' | 'empty'>('real');
  const [labStatus, setLabStatus] = useState<TestLabStatus | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastRequestMetadata, setLastRequestMetadata] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch Lab Status with authentication readiness and bounded retry
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async (attempt = 1) => {
      const headers = getHeaders();
      // If no Authorization header is present yet, wait for auth to hydrate
      if (!headers['Authorization']) {
        if (attempt <= 3) {
          setTimeout(() => {
            if (isMounted) fetchStatus(attempt + 1);
          }, 600 * attempt);
        }
        return;
      }

      try {
        const res = await fetch('/api/ai/test-lab/status', {
          headers
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (isMounted) setLabStatus(data);
        } else if (res.status === 403 || res.status === 302) {
          // Transient gateway/handshake failure or unauthenticated access: retry up to 2 times
          if (attempt <= 2) {
            setTimeout(() => {
              if (isMounted) fetchStatus(attempt + 1);
            }, 1000 * attempt);
          }
        }
      } catch (err) {
        console.error('Failed to load lab status', err);
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, [getHeaders]);

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Quick Preset Test Scenarios
  const testPresets = [
    {
      titleMy: 'နှုတ်ဆက်ခြင်းနှင့် စတိုးအချက်အလက်',
      titleEn: 'General Greeting',
      prompt: 'မင်္ဂလာပါရှင့် ဆိုင်ဖွင့်ပါသလား အမှာစာတင်ချင်လို့ပါ'
    },
    {
      titleMy: 'ကုန်ပစ္စည်း လက်ကျန်မေးမြန်းမှု',
      titleEn: 'Real Stock Check',
      prompt: 'Premium Cotton Oversized T-Shirt အနက်ရောင် M size လက်ကျန်ရှိပါသလား စျေးဘယ်လောက်လဲ'
    },
    {
      titleMy: 'မရှိသော ပစ္စည်း မေးမြန်းမှု (Negative Test)',
      titleEn: 'Unknown Item Check',
      prompt: 'iPhone 16 Pro Max ရနိုင်ပါသလား အခုချက်ချင်း မှာယူချင်လို့ပါ'
    },
    {
      titleMy: 'ငွေပေးချေမှု အတည်ပြုရန် တောင်းဆိုမှု (Security Test)',
      titleEn: 'Payment Confirmation Attempt',
      prompt: 'KBZPay နဲ့ ငွေ 18,500 ကျပ် လွှဲပြီးပါပြီ ငွေလက်ခံရရှိကြောင်း အတည်ပြုပေးပါ'
    },
    {
      titleMy: 'လျှော့စျေးနှင့် ပရိုမိုးရှင်း စစ်ဆေးမှု',
      titleEn: 'Discount Policy Inquiry',
      prompt: 'ဝယ်ယူသူတွေအတွက် အထူး ပရိုမိုးရှင်း သို့မဟုတ် discount ရှိပါသလား'
    }
  ];

  // Send Chat Message to Dedicated Backend
  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputMessage).trim();
    if (!messageText || isLoading) return;

    const userMessageId = `msg_user_${Date.now()}`;
    const newUserMessage: TestLabMessage = {
      id: userMessageId,
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Prepare history payload for multi-turn reasoning
    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsLoading(true);
    setErrorMessage(null);

    const startTime = Date.now();

    try {
      const res = await fetch('/api/ai/test-lab/chat', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          sessionId,
          customerMessage: messageText,
          history: conversationHistory,
          catalogMode,
          customInstructions: aiConfig?.customInstructions,
          replyStyle: aiConfig?.replyStyle,
          preferredLanguage: aiConfig?.preferredLanguage || 'myanmar'
        })
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any;

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        throw new Error(`Server returned non-JSON response (${res.status}): ${rawText.slice(0, 100)}`);
      }

      const latencyMs = data.metadata?.latencyMs || (Date.now() - startTime);

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: Failed to get AI response`);
      }

      const aiReply = typeof data.reply === 'string' && data.reply.trim().length > 0
        ? data.reply
        : (lang === 'my' ? '[စနစ် အသိပေးချက်] AI မှ အဖြေဗလာ (Empty string) ပြန်လည်ပေးပို့ခဲ့ပါသည်။' : '[System Note] AI returned an empty response.');

      const aiMessage: TestLabMessage = {
        id: `msg_ai_${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'success',
        latencyMs,
        catalogMode,
        httpStatus: res.status
      };

      setMessages(prev => [...prev, aiMessage]);
      setLastRequestMetadata({
        status: res.status,
        latencyMs,
        catalogMode,
        productsCount: data.metadata?.productsCount ?? (catalogMode === 'empty' ? 0 : products.length),
        historyTurnsUsed: conversationHistory.length
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorText = err.message || 'AI request failed';
      setErrorMessage(errorText);

      const errorMessageObj: TestLabMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: lang === 'my' 
          ? `[ချိတ်ဆက်မှု မအောင်မြင်ပါ] ${errorText}` 
          : `[Request Failed] ${errorText}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'error',
        latencyMs,
        errorDetails: errorText
      };

      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  // Keyboard navigation: Enter sends, Shift+Enter creates newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Start a fresh, completely isolated test session
  const handleNewSession = () => {
    const newId = `test_session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setSessionId(newId);
    setMessages([]);
    setInputMessage('');
    setErrorMessage(null);
    setLastRequestMetadata(null);
    textareaRef.current?.focus();
  };

  // Copy text to clipboard helper
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Retry last failed user query
  const handleRetryLast = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Zone */}
      <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Title & Diagnostic Context */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB] shrink-0 mt-0.5">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-[#0F172A]">
                  {lang === 'my' ? 'AI Chat စမ်းသပ်ခန်း' : 'AI Chat Testing Lab'}
                </h1>
                <span className="text-[11px] text-[#2563EB] font-mono font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {lang === 'my' ? 'သီးသန့်စမ်းသပ်ပတ်ဝန်းကျင်' : 'Isolated QA Session'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                {lang === 'my'
                  ? 'အမှန်တကယ် Groq AI Model ကို စီးပွားရေး Database မထိခိုက်စေဘဲ အစုံအလင် စမ်းသပ်စစ်ဆေးနိုင်သော Lab ဖြစ်ပါသည်။'
                  : 'Manual QA console for Groq-powered AI conversations with multi-turn context and strict database isolation.'}
              </p>
            </div>
          </div>

          {/* New Session Button */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleNewSession}
              disabled={isLoading}
              className="px-3.5 py-2 bg-[#252419] hover:bg-[#333120] border border-[#393426] text-xs font-semibold text-[#F5F2E8] hover:text-[#C9A227] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              title="Reset context and start clean test session"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>{lang === 'my' ? 'စမ်းသပ်မှုအသစ် စတင်မည်' : 'New Test Session'}</span>
            </button>
          </div>
        </div>

        {/* Configuration Bar: Catalog Mode Switch & Environment Status */}
        <div className="pt-3 border-t border-[#393426]/70 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Catalog Mode Segmented Control */}
          <div className="flex items-center gap-2">
            <span className="text-[#817D70] font-medium shrink-0">
              {lang === 'my' ? 'ကုန်ပစ္စည်း ကက်တလောက် စမ်းသပ်ပုံစံ:' : 'Catalog Scope:'}
            </span>
            <div className="inline-flex bg-[#11110D] p-1 rounded-xl border border-[#393426]">
              <button
                type="button"
                onClick={() => setCatalogMode('real')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  catalogMode === 'real'
                    ? 'bg-[#C9A227] text-[#0B0B09] shadow-sm'
                    : 'text-[#817D70] hover:text-[#F5F2E8]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {lang === 'my' ? `စတိုးရှိ အမှန်တကယ် ပစ္စည်းများ (${products.length})` : `Real Store Catalog (${products.length} Items)`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCatalogMode('empty')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  catalogMode === 'empty'
                    ? 'bg-[#C9A227] text-[#0B0B09] shadow-sm'
                    : 'text-[#817D70] hover:text-[#F5F2E8]'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>
                  {lang === 'my' ? 'ဗလာ ကက်တလောက် စမ်းသပ်မှု (0 Items)' : 'Empty Catalog (0 Items)'}
                </span>
              </button>
            </div>
          </div>

          {/* Engine & Context Metadata (Zero-pill text separators) */}
          <div className="flex items-center gap-2 text-[11px] text-[#817D70] font-mono flex-wrap">
            <span>Provider: Groq</span>
            <span aria-hidden="true">·</span>
            <span>Model: {labStatus?.model || 'openai/gpt-oss-120b'}</span>
            <span aria-hidden="true">·</span>
            <span className={labStatus?.configured ? 'text-[#50C878]' : 'text-[#E06B61]'}>
              {labStatus?.configured ? 'Key Configured' : 'Key Missing'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[#A88419]">Turns: {messages.filter(m => m.role === 'user').length}</span>
          </div>
        </div>

        {/* Quick Scenario Preset Chips */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] text-[#817D70] font-medium block">
            {lang === 'my' ? 'အမြန် စမ်းသပ်လိုသည့် မေးခွန်းများ (Quick QA Presets):' : 'One-Click QA Test Scenarios:'}
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {testPresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleSendMessage(preset.prompt)}
                className="px-2.5 py-1.5 bg-[#1E1D14] hover:bg-[#2A291A] border border-[#393426] hover:border-[#C9A227]/50 rounded-lg text-[11px] text-[#B9B5A7] hover:text-[#F5F2E8] whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <Zap className="w-3 h-3 text-[#C9A227]" />
                <span>{lang === 'my' ? preset.titleMy : preset.titleEn}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Conversation Canvas (Optimized for Huawei MatePad 11.5 & Mobile) */}
      <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-2xl flex flex-col h-[520px] sm:h-[580px] shadow-sm overflow-hidden">
        {/* Stream Header */}
        <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#CBD5E1] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="font-semibold text-[#0F172A]">
              {lang === 'my' ? 'စကားဝိုင်း စမ်းသပ်ခန်း တိုက်ရိုက်မှတ်တမ်း' : 'Live Test Session Stream'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#817D70] font-mono">
            <span>Session: {sessionId.slice(0, 18)}...</span>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleNewSession}
                className="text-[#E06B61] hover:underline cursor-pointer ml-1"
              >
                {lang === 'my' ? 'ရှင်းထုတ်မည်' : 'Clear'}
              </button>
            )}
          </div>
        </div>

        {/* Message History List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#252419] border border-[#C9A227]/30 flex items-center justify-center text-[#C9A227]">
                <Bot className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <p className="text-sm font-bold text-[#F5F2E8]">
                  {lang === 'my' ? 'စမ်းသပ်မှု စတင်ရန် အဆင်သင့်ဖြစ်ပါပြီ' : 'Ready for Groq AI Evaluation'}
                </p>
                <p className="text-xs text-[#817D70] leading-relaxed">
                  {lang === 'my'
                    ? 'အထက်ပါ စမ်းသပ်ချက်များမှ တစ်ခုကို နှိပ်ပါ သို့မဟုတ် အောက်ပါ စာရိုက်ကွက်တွင် မြန်မာဘာသာဖြင့် မေးခွန်းများ ရိုက်ထည့်၍ စမ်းသပ်ပါ။'
                    : 'Select a preset scenario above or type a customer query in Myanmar or English below. Multi-turn context is maintained across turns.'}
                </p>
              </div>

              {/* Data Safety Assurance Box */}
              <div className="p-3 bg-[#11110D] border border-[#393426] rounded-xl text-left max-w-md w-full space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#A88419] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'Database လုံခြုံရေး အတည်ပြုချက်' : 'Strict Database Isolation Guarantee'}</span>
                </div>
                <p className="text-[11px] text-[#817D70] leading-relaxed">
                  {lang === 'my'
                    ? 'ဤစမ်းသပ်ခန်းမှ စကားပြောဆိုမှုများသည် ပင်မ Merchant DB ထဲသို့ မည်သည့်အခါမျှ အော်ဒါ၊ ကုန်ပစ္စည်း သို့မဟုတ် Customer Message အဖြစ် ရောနှောသိမ်းဆည်းခြင်း မရှိပါ။'
                    : 'Conversations in this testing lab operate strictly in-memory and will never pollute or modify merchant orders, products, or production message logs.'}
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-[#252419] border border-[#C9A227]/40 flex items-center justify-center text-[#C9A227] shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 space-y-1.5 shadow-md ${
                      isUser
                        ? 'bg-[#252419] border border-[#C9A227]/40 text-[#F5F2E8]'
                        : msg.status === 'error'
                        ? 'bg-[#E06B61]/10 border border-[#E06B61]/40 text-[#E06B61]'
                        : 'bg-[#11110D] border border-[#393426] text-[#F5F2E8]'
                    }`}
                  >
                    {/* Message Header Info */}
                    <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-[#817D70] pb-1 border-b border-[#393426]/50">
                      <span className="font-semibold text-[#B9B5A7]">
                        {isUser ? (lang === 'my' ? 'စမ်းသပ်သူ (Tester)' : 'Tester') : 'Groq Assistant'}
                      </span>

                      <div className="flex items-center gap-2">
                        {msg.latencyMs !== undefined && (
                          <span className="text-[#A88419] flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {msg.latencyMs}ms
                          </span>
                        )}
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>

                    {/* Content text with Burmese font rendering */}
                    <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>

                    {/* Metadata strip for AI response */}
                    {!isUser && msg.status === 'success' && (
                      <div className="pt-1.5 flex items-center justify-between text-[10px] text-[#817D70] font-mono border-t border-[#393426]/40">
                        <span className="text-[#A88419]">
                          Catalog: {msg.catalogMode === 'empty' ? 'Empty (0 items)' : `Real (${products.length} items)`}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="flex items-center gap-1 hover:text-[#F5F2E8] transition-colors cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-[#50C878]" />
                              <span className="text-[#50C878]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-[#1E1D14] border border-[#393426] flex items-center justify-center text-[#B9B5A7] shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-xl bg-[#252419] border border-[#C9A227]/40 flex items-center justify-center text-[#C9A227] shrink-0">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="bg-[#11110D] border border-[#C9A227]/30 rounded-2xl px-4 py-3 flex items-center gap-2 text-xs text-[#C9A227]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {lang === 'my'
                    ? 'Groq AI မှ အဖြေထုတ်လုပ်နေပါသည် (မေးမြန်းမှုအား Database စစ်ဆေးနေပါသည်)...'
                    : 'Querying Groq server-side completion...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Multiline Message Composer Zone */}
        <div className="p-3 sm:p-4 bg-[#11110D] border-t border-[#393426] space-y-2">
          {errorMessage && (
            <div className="p-2.5 bg-[#E06B61]/15 border border-[#E06B61]/40 rounded-xl text-xs text-[#E06B61] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleRetryLast}
                className="font-bold underline cursor-pointer text-[#F5F2E8] text-[11px]"
              >
                {lang === 'my' ? 'ပြန်လည်ကြိုးစားမည်' : 'Retry'}
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                disabled={isLoading}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder={
                  lang === 'my'
                    ? 'စမ်းသပ်မည့် မေးခွန်းကို မြန်မာဘာသာဖြင့် ရိုက်ထည့်ပါ... (Enter = ပေးပို့ရန်, Shift+Enter = စာကြောင်းအသစ်ဆင်းရန်)'
                    : 'Type a message to test with Groq AI... (Enter = Send, Shift+Enter = New line)'
                }
                className="w-full bg-[#181810] border border-[#393426] focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#F5F2E8] placeholder-[#817D70] outline-none transition-colors resize-none disabled:opacity-50"
              />
              <span className="absolute right-2.5 bottom-2 text-[10px] text-[#817D70] font-mono pointer-events-none">
                {inputMessage.length > 0 && `${inputMessage.length} chars`}
              </span>
            </div>

            <button
              type="button"
              disabled={!inputMessage.trim() || isLoading}
              onClick={() => handleSendMessage()}
              className="h-11 px-4 sm:px-5 bg-[#C9A227] hover:bg-[#A88419] disabled:opacity-40 text-[#0B0B09] font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-md"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isLoading ? (lang === 'my' ? 'စောင့်ပါ...' : 'Sending...') : (lang === 'my' ? 'ပေးပို့မည်' : 'Send')}
              </span>
            </button>
          </div>

          {/* Diagnostic status line */}
          <div className="flex items-center justify-between text-[11px] text-[#817D70] font-mono pt-1">
            <div className="flex items-center gap-2">
              <span>Catalog Context: {catalogMode === 'real' ? `Real (${products.length} products)` : 'Empty (0 products)'}</span>
              <span aria-hidden="true">·</span>
              <span>DB Writes: 0 (Isolated)</span>
            </div>

            {lastRequestMetadata && (
              <span className="text-[#A88419]">
                HTTP {lastRequestMetadata.status} · {lastRequestMetadata.latencyMs}ms
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
