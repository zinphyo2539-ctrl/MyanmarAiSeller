import React, { useState } from 'react';
import {
  Store,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Save,
  LogOut,
  Sliders,
  DollarSign,
  AlertCircle,
  ShoppingBag,
  CreditCard,
  UserCheck,
  Copy,
  Globe,
  Bot,
  Sparkles,
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  Send,
  Zap,
  Activity,
  MessageSquare,
  FlaskConical,
  X
} from 'lucide-react';
import { StoreSettings, Order, ProviderStatus, AiConfig, SampleReply, AiHealth, Product } from '../types';

interface ProfileViewProps {
  store: StoreSettings | null;
  orders: Order[];
  providerStatus: ProviderStatus | null;
  user: any;
  lang: 'my' | 'en';
  onUpdateStore: (storeData: Partial<StoreSettings>) => Promise<void>;
  onConfirmPayment: (orderId: string) => Promise<void>;
  onOpenConfig: (provider: 'google' | 'facebook' | 'tiktok') => void;
  onLogout: () => void;
  onOpenPublicStore: () => void;
  initialTab?: string;
  // AI System Props
  config: AiConfig | null;
  samples: SampleReply[];
  products: Product[];
  aiHealth: AiHealth | null;
  onUpdateConfig: (newConfig: Partial<AiConfig>) => Promise<void>;
  onAddSample: (sample: { customerMessage: string; preferredReply: string; category: string }) => Promise<void>;
  onUpdateSample: (id: string, sample: { customerMessage: string; preferredReply: string; category: string }) => Promise<void>;
  onDeleteSample: (id: string) => Promise<void>;
  onTestPreview: (customerMessage: string, customInstructions?: string, replyStyle?: string) => Promise<string>;
  onOpenLab?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  store,
  orders,
  providerStatus,
  user,
  lang,
  onUpdateStore,
  onConfirmPayment,
  onOpenConfig,
  onLogout,
  onOpenPublicStore,
  initialTab,
  config,
  samples,
  products,
  aiHealth,
  onUpdateConfig,
  onAddSample,
  onUpdateSample,
  onDeleteSample,
  onTestPreview,
  onOpenLab
}) => {
  const [activeSection, setActiveSection] = useState<'store' | 'ai' | 'payments' | 'channels' | 'account'>(
    initialTab === 'ai' ? 'ai' : initialTab === 'payments' ? 'payments' : 'store'
  );

  // Store profile form state
  const [storeName, setStoreName] = useState(store?.storeName || '');
  const [description, setDescription] = useState(store?.description || '');
  const [deliveryInfo, setDeliveryInfo] = useState(store?.deliveryInfo || '');
  const [paymentInstructions, setPaymentInstructions] = useState(store?.paymentInstructions || '');
  const [isPublished, setIsPublished] = useState(store?.isPublished ?? true);
  const [savingStore, setSavingStore] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // AI Configuration form local state
  const [preferredLang, setPreferredLang] = useState(config?.preferredLanguage || 'myanmar');
  const [replyStyle, setReplyStyle] = useState(config?.replyStyle || 'friendly');
  const [customInstructions, setCustomInstructions] = useState(config?.customInstructions || '');
  const [handoffUncertain, setHandoffUncertain] = useState(config?.humanHandoff?.triggerOnUncertain ?? true);
  const [handoffComplaint, setHandoffComplaint] = useState(config?.humanHandoff?.triggerOnComplaint ?? true);
  const [handoffHumanReq, setHandoffHumanReq] = useState(config?.humanHandoff?.triggerOnHumanRequest ?? true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);

  // AI Playground simulation state
  const [previewInput, setPreviewInput] = useState('');
  const [previewOutput, setPreviewOutput] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Dynamic suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Sample Reply CRUD Modal state
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<SampleReply | null>(null);
  const [sampleForm, setSampleForm] = useState({ customerMessage: '', preferredReply: '', category: 'Stock and variants' });
  const [savingSample, setSavingSample] = useState(false);

  const publicStoreUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/store/${store?.slug || 'yangon-style'}`
    : `/store/${store?.slug || 'yangon-style'}`;

  const handleCopyStoreUrl = () => {
    navigator.clipboard.writeText(publicStoreUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  // Payment confirmation loading tracker
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStore(true);
    setSaveSuccess(false);
    try {
      await onUpdateStore({
        storeName,
        description,
        deliveryInfo,
        paymentInstructions,
        isPublished
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSavingStore(false);
    }
  };

  const handleConfirmOrderPayment = async (orderId: string) => {
    setConfirmingId(orderId);
    try {
      await onConfirmPayment(orderId);
    } finally {
      setConfirmingId(null);
    }
  };

  // AI Handlers
  const fetchSuggestions = async () => {
    if (suggestionsLoading) return;
    setSuggestionsLoading(true);
    try {
      const res = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('myanmar_seller_token') ? { 'Authorization': `Bearer ${localStorage.getItem('myanmar_seller_token')}` } : {})
        },
        body: JSON.stringify({})
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.suggestions) {
          setSuggestions(data.suggestions);
        }
      }
    } catch {
      // Ignored
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleToggleAi = async () => {
    if (!config || savingConfig) return;
    setSavingConfig(true);
    try {
      await onUpdateConfig({ enabled: !config.enabled });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSaveSuccess(false);
    try {
      await onUpdateConfig({
        preferredLanguage: preferredLang,
        replyStyle,
        customInstructions,
        humanHandoff: {
          enabled: true,
          triggerOnUncertain: handoffUncertain,
          triggerOnComplaint: handoffComplaint,
          triggerOnHumanRequest: handoffHumanReq,
          notificationChannel: 'telegram_staff'
        }
      });
      setConfigSaveSuccess(true);
      setTimeout(() => setConfigSaveSuccess(false), 3000);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRunPreview = async (queryText?: string) => {
    const text = (queryText || previewInput).trim();
    if (!text || previewLoading) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const reply = await onTestPreview(text, customInstructions, replyStyle);
      setPreviewOutput(reply);
      if (queryText) setPreviewInput(queryText);
    } catch (err: any) {
      setPreviewError(err.message || 'AI Generation Error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenAddSample = () => {
    setEditingSample(null);
    setSampleForm({ customerMessage: '', preferredReply: '', category: 'Stock and variants' });
    setIsSampleModalOpen(true);
  };

  const handleOpenEditSample = (sample: SampleReply) => {
    setEditingSample(sample);
    setSampleForm({
      customerMessage: sample.customerMessage,
      preferredReply: sample.preferredReply,
      category: sample.category || 'Stock and variants'
    });
    setIsSampleModalOpen(true);
  };

  const handleSaveSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleForm.customerMessage.trim() || !sampleForm.preferredReply.trim() || savingSample) return;
    setSavingSample(true);
    try {
      if (editingSample) {
        await onUpdateSample(editingSample.id, sampleForm);
      } else {
        await onAddSample(sampleForm);
      }
      setIsSampleModalOpen(false);
    } finally {
      setSavingSample(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile & AI Section Switcher */}
      <div className="flex items-center gap-1 bg-[#181810] border border-[#393426] p-1 rounded-2xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection('store')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            activeSection === 'store'
              ? 'bg-[#C9A227] text-[#0B0B09]'
              : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
          }`}
        >
          {lang === 'my' ? 'စတိုးအချက်အလက်' : 'Store Settings'}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('ai')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeSection === 'ai'
              ? 'bg-[#C9A227] text-[#0B0B09]'
              : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>{lang === 'my' ? 'AI စနစ်' : 'AI System'}</span>
          {config?.enabled && <span className="w-2 h-2 rounded-full bg-[#65B985]" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeSection === 'payments'
              ? 'bg-[#C9A227] text-[#0B0B09]'
              : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
          }`}
        >
          <span>{lang === 'my' ? 'ငွေပေးချေမှုနှင့် အော်ဒါများ' : 'Orders & Payments'}</span>
          {orders.filter(o => o.paymentStatus !== 'CONFIRMED').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#E0BD55]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('channels')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            activeSection === 'channels'
              ? 'bg-[#C9A227] text-[#0B0B09]'
              : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
          }`}
        >
          {lang === 'my' ? 'ချိတ်ဆက်ထားသော ချန်နယ်များ' : 'Connected Channels'}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('account')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            activeSection === 'account'
              ? 'bg-[#C9A227] text-[#0B0B09]'
              : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
          }`}
        >
          {lang === 'my' ? 'အကောင့်လုံခြုံရေး' : 'Account & Security'}
        </button>
      </div>

      {/* Section 1: Store Settings */}
      {activeSection === 'store' && (
        <section aria-label="Store Profile and Settings" className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#CBD5E1] pb-3 gap-2">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                {lang === 'my' ? 'စတိုးပရိုဖိုင်နှင့် အချက်အလက်များ' : 'Store Profile & Publication'}
              </h3>
              <p className="text-xs text-[#64748B]">
                {lang === 'my' ? 'ဖောက်သည်များနှင့် AI စစ်ဆေးရာတွင် အသုံးပြုမည့် စတိုးအချက်အလက်များ' : 'Public store details used by customers and AI catalog verification.'}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <a
                href={`/store/${store?.slug || 'yangon-style'}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'Public စတိုး ဖွင့်မည်' : 'Open Storefront'}</span>
              </a>
              <button
                type="button"
                onClick={onOpenPublicStore}
                className="px-3 py-1.5 bg-[#F8FAFC] hover:bg-[#CBD5E1] border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:text-[#0F172A] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'စမ်းသပ်ခန်း' : 'Simulator'}</span>
              </button>
            </div>
          </div>

          {/* Public Storefront Link & Sharing Banner */}
          <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-[#2563EB]" />
                <span>{lang === 'my' ? 'ဖောက်သည်များသို့ ပေးပို့ရမည့် စတိုးလိပ်စာ (Storefront URL)' : 'Public Customer Storefront Link'}</span>
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isPublished
                  ? 'bg-[#65B985]/15 border border-[#65B985]/30 text-[#65B985]'
                  : 'bg-[#E06B61]/15 border border-[#E06B61]/30 text-[#E06B61]'
              }`}>
                {isPublished ? (lang === 'my' ? 'ဖွင့်လှစ်ထားသည်' : 'Published') : (lang === 'my' ? 'ပိတ်ထားသည်' : 'Unpublished')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicStoreUrl}
                className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-mono text-[#0F172A] select-all shadow-xs"
              />
              <button
                type="button"
                onClick={handleCopyStoreUrl}
                className="px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                {copiedUrl ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedUrl ? (lang === 'my' ? 'ကူးပြီး' : 'Copied') : (lang === 'my' ? 'လင့်ခ်ကူးမည်' : 'Copy')}</span>
              </button>
            </div>
          </div>

          {/* Store Edit Form */}
          <form onSubmit={handleSaveStore} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#475569] font-semibold mb-1">
                  {lang === 'my' ? 'စတိုးအမည် (Store Name)' : 'Store Name'}
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between sm:pt-6">
                <div>
                  <span className="font-semibold text-[#0F172A] block">
                    {lang === 'my' ? 'စတိုး အများပြည်သူသို့ တင်ပြရန်' : 'Publish Storefront'}
                  </span>
                  <span className="text-[11px] text-[#64748B]">
                    {lang === 'my' ? 'ဖောက်သည်များ ဝင်ရောက်ဝယ်ယူနိုင်ခြင်း ရှိမရှိ' : 'Allow customers to view and place orders.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublished(!isPublished)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isPublished ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      isPublished ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[#475569] font-semibold mb-1">
                {lang === 'my' ? 'စတိုး ဖော်ပြချက် (Description)' : 'Store Description'}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3 text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#475569] font-semibold mb-1">
                  {lang === 'my' ? 'ပို့ဆောင်ရေး အချက်အလက် (Delivery Info)' : 'Delivery Information'}
                </label>
                <textarea
                  rows={2}
                  value={deliveryInfo}
                  onChange={(e) => setDeliveryInfo(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3 text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#475569] font-semibold mb-1">
                  {lang === 'my' ? 'ငွေပေးချေရန် လမ်းညွှန်ချက်များ (Payment Instructions)' : 'Payment Instructions'}
                </label>
                <textarea
                  rows={2}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3 text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {saveSuccess && (
                <span className="text-[#16A34A] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'my' ? 'စတိုးအချက်အလက် သိမ်းဆည်းပြီးပါပြီ' : 'Store updated successfully'}</span>
                </span>
              )}
              <div className="ml-auto">
                <button
                  type="submit"
                  disabled={savingStore}
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingStore ? (lang === 'my' ? 'သိမ်းဆည်းနေသည်...' : 'Saving...') : (lang === 'my' ? 'အပြောင်းအလဲများ သိမ်းမည်' : 'Save Changes')}</span>
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* Section 2: AI System (Merged from AiSellerView) */}
      {activeSection === 'ai' && (
        <div className="space-y-6">
          {/* Provider Health and Master Switch */}
          <section
            aria-label="AI Provider Health and Operating Status"
            className="bg-[#181810] border border-[#393426] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-[#C9A227] font-bold">
                  {lang === 'my' ? 'AI အရောင်းအကူ ကွပ်ကဲရေး' : 'Sales Agent Control Center'}
                </span>
                <span className="text-[10px] bg-[#1E1D14] text-[#E0BD55] px-2 py-0.5 rounded-full font-mono border border-[#393426]">
                  Groq Cloud Only
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#F5F2E8]">
                {lang === 'my' ? 'Groq AI အရောင်းကိုယ်စားလှယ်' : 'Groq AI Sales Representative'}
              </h2>
              <div className="flex items-center gap-3 text-xs text-[#817D70] font-mono pt-0.5">
                <span>Model: {aiHealth?.model || 'openai/gpt-oss-120b'}</span>
                <span>·</span>
                <span className={aiHealth?.configured ? 'text-[#65B985] font-semibold' : 'text-[#E06B61]'}>
                  Status: {aiHealth?.configured ? 'Operational' : 'API Key Missing'}
                </span>
              </div>
            </div>

            {/* Master AI Enable Toggle */}
            <div className="flex items-center gap-3 bg-[#11110D] border border-[#393426] p-2.5 px-4 rounded-xl">
              <div className="text-right">
                <span className="text-xs font-bold text-[#F5F2E8] block">
                  {config?.enabled
                    ? (lang === 'my' ? 'အလိုအလျောက်ဖွင့်ထားသည်' : 'Agent Active')
                    : (lang === 'my' ? 'ယာယီရပ်ဆိုင်းထားသည်' : 'Agent Paused')}
                </span>
                <span className="text-[11px] text-[#817D70]">
                  {config?.enabled
                    ? (lang === 'my' ? 'ဖောက်သည်အား ဖြေကြားနေသည်' : 'Answering customer queries')
                    : (lang === 'my' ? 'ဖောက်သည်ထံ စာမပြန်ပါ' : 'No automated responses')}
                </span>
              </div>

              <button
                type="button"
                disabled={savingConfig}
                onClick={handleToggleAi}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  config?.enabled ? 'bg-[#C9A227]' : 'bg-[#393426]'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-[#0B0B09] transition-transform ${
                    config?.enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Strict Operating Policies */}
          <section aria-label="Operating Rules & Merchant Policies" className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#B9B5A7]">
              {lang === 'my' ? 'တင်းကျပ်သော လုပ်ငန်းလည်ပတ်မှု စည်းမျဉ်းများ' : 'Authoritative Operating Policies'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-[#181810] border border-[#393426] p-4 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#C9A227] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-bold text-[#F5F2E8]">
                    {lang === 'my' ? '၁။ စျေးနှုန်းအတည်ပြု စည်းမျဉ်း' : '1. Authoritative Pricing Integrity'}
                  </h4>
                  <p className="text-[#B9B5A7] leading-relaxed">
                    {lang === 'my'
                      ? 'AI သည် ဆာဗာ Database ထဲရှိ အတည်ပြုပြီး စျေးနှုန်းများကိုသာ တင်းကျပ်စွာ အသုံးပြုရမည်။ စျေးနှုန်းနှင့် လျှော့စျေးများကို လုပ်ကြံဖန်တီးခွင့် မရှိပါ။'
                      : 'AI strictly enforces database catalog prices. Unauthorized discounts or fabricated prices are automatically blocked.'}
                  </p>
                </div>
              </div>

              <div className="bg-[#181810] border border-[#393426] p-4 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#65B985] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-bold text-[#F5F2E8]">
                    {lang === 'my' ? '၂။ စတော့လက်ကျန် စစ်ဆေးမှု စည်းမျဉ်း' : '2. Real Stock Verification'}
                  </h4>
                  <p className="text-[#B9B5A7] leading-relaxed">
                    {lang === 'my'
                      ? 'ပစ္စည်းရရှိနိုင်မှု မဖြေကြားမီ Database ရှိ Variant အလိုက် စတော့ကို အမြဲတမ်း စစ်ဆေးရမည်။ လက်ကျန်ပြတ်နေပါက မှန်ကန်စွာ ရှင်းပြရမည်။'
                      : 'Variant stock is verified before promising availability. Out of stock items must be honestly communicated to customers.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* AI Behavior & Custom Instructions Configuration Form */}
          <section aria-label="AI Personality and Handoff Rules" className="bg-[#181810] border border-[#393426] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#393426] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#F5F2E8]">
                  {lang === 'my' ? 'AI အရောင်းဟန်ပန်နှင့် ညွှန်ကြားချက်များ' : 'Sales Behavior & Custom Instructions'}
                </h3>
                <p className="text-xs text-[#817D70]">
                  {lang === 'my' ? 'ဖောက်သည်အား ပြန်လည်ဖြေကြားမည့် ပုံစံကို စိတ်ကြိုက်သတ်မှတ်ပါ' : 'Configure tone, language, and human escalation triggers.'}
                </p>
              </div>

              {configSaveSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-[#65B985] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'my' ? 'သိမ်းဆည်းပြီးပါပြီ' : 'Saved'}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSavePolicies} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#B9B5A7] font-semibold mb-1">
                    {lang === 'my' ? 'တုံ့ပြန်မည့် ဘာသာစကား' : 'Response Language'}
                  </label>
                  <select
                    value={preferredLang}
                    onChange={(e) => setPreferredLang(e.target.value)}
                    className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
                  >
                    <option value="myanmar">မြန်မာဘာသာ (Myanmar)</option>
                    <option value="english">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#B9B5A7] font-semibold mb-1">
                    {lang === 'my' ? 'စကားပြောဟန်ပန် (Reply Style)' : 'Reply Style'}
                  </label>
                  <select
                    value={replyStyle}
                    onChange={(e) => setReplyStyle(e.target.value)}
                    className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
                  >
                    <option value="friendly">ဖော်ရွေသော အရောင်းပုံစံ (Friendly & Polite)</option>
                    <option value="formal">လေးနက်ယဉ်ကျေးသော ပုံစံ (Formal & Professional)</option>
                    <option value="concise">တိုတိုနှင့် လိုရင်းရှင်းသော ပုံစံ (Concise & Direct)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#B9B5A7] font-semibold mb-1">
                  {lang === 'my' ? 'စတိုးအတွက် သီးသန့် ညွှန်ကြားချက်များ (Custom Prompt Instructions)' : 'Custom Prompt Instructions'}
                </label>
                <textarea
                  rows={4}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Always greet warmly, verify stock from database, guide customer to order via KBZPay..."
                  className="w-full bg-[#11110D] border border-[#393426] rounded-xl p-3 text-[#F5F2E8] placeholder-[#817D70] focus:border-[#C9A227] focus:outline-none leading-relaxed"
                />
              </div>

              {/* Human Escalation Triggers */}
              <div className="pt-2 border-t border-[#393426]">
                <span className="text-xs font-bold text-[#E0BD55] block mb-2">
                  {lang === 'my' ? 'လူထံသို့ အလိုအလျောက် လွှဲပြောင်းရမည့် အခြေအနေများ (Handoff Triggers)' : 'Human Escalation Triggers'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className="flex items-center gap-2 bg-[#11110D] p-2.5 rounded-xl border border-[#393426] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={handoffUncertain}
                      onChange={(e) => setHandoffUncertain(e.target.checked)}
                      className="rounded text-[#C9A227] focus:ring-0"
                    />
                    <span className="text-xs text-[#B9B5A7]">
                      {lang === 'my' ? 'မသေချာသော မေးခွန်းများ' : 'Uncertain questions'}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 bg-[#11110D] p-2.5 rounded-xl border border-[#393426] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={handoffComplaint}
                      onChange={(e) => setHandoffComplaint(e.target.checked)}
                      className="rounded text-[#C9A227] focus:ring-0"
                    />
                    <span className="text-xs text-[#B9B5A7]">
                      {lang === 'my' ? 'တိုင်ကြားမှု / မကျေနပ်မှု' : 'Customer complaints'}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 bg-[#11110D] p-2.5 rounded-xl border border-[#393426] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={handoffHumanReq}
                      onChange={(e) => setHandoffHumanReq(e.target.checked)}
                      className="rounded text-[#C9A227] focus:ring-0"
                    />
                    <span className="text-xs text-[#B9B5A7]">
                      {lang === 'my' ? 'လူနှင့်ပြောရန် တောင်းဆိုမှု' : 'Human staff requested'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2.5 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingConfig ? (lang === 'my' ? 'သိမ်းဆည်းနေသည်...' : 'Saving...') : (lang === 'my' ? 'စည်းမျဉ်းများ သိမ်းဆည်းမည်' : 'Save Policies')}</span>
                </button>
              </div>
            </form>
          </section>

          {/* AI Reply Simulation & Live Playground */}
          <section aria-label="AI Reply Simulation Playground" className="bg-[#181810] border border-[#393426] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#393426] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C9A227]" />
                  <h3 className="text-base font-bold text-[#F5F2E8]">
                    {lang === 'my' ? 'AI တုံ့ပြန်မှု စမ်းသပ်ခန်း (AI Simulation Preview)' : 'AI Simulation Preview'}
                  </h3>
                </div>
                <p className="text-xs text-[#817D70] mt-0.5">
                  {lang === 'my'
                    ? 'စမ်းသပ်မှုသက်သက်သာဖြစ်သည် — ဖောက်သည်ထံ စာမပို့ပါ၊ အော်ဒါမတင်ပါ၊ စတော့မနုတ်ပါ။'
                    : 'Isolated simulation only — Does not message real customers, create orders, or modify inventory.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {onOpenLab && (
                  <button
                    type="button"
                    onClick={onOpenLab}
                    className="px-2.5 py-1.5 bg-[#C9A227]/15 hover:bg-[#C9A227]/25 border border-[#C9A227]/40 text-[#C9A227] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={lang === 'my' ? 'ခေတ်မီ Multi-Turn AI စမ်းသပ်ခန်းသို့ သွားရန်' : 'Open Dedicated Multi-Turn AI Chat Testing Lab'}
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>{lang === 'my' ? 'AI Chat စမ်းသပ်ခန်း' : 'Testing Lab'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={fetchSuggestions}
                  disabled={suggestionsLoading}
                  className="text-xs text-[#C9A227] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{suggestionsLoading ? (lang === 'my' ? 'မေးခွန်းထုတ်နေသည်...' : 'Generating...') : (lang === 'my' ? 'မေးခွန်းအသစ်များ ထုတ်ယူမည်' : 'Generate Suggestions')}</span>
                </button>
              </div>
            </div>

            {/* Dynamic Suggested Questions */}
            {suggestions.length > 0 && (
              <div className="bg-[#11110D] border border-[#393426] p-3 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-[#A88419] uppercase tracking-wider block">
                  {lang === 'my' ? 'စတိုး ကုန်ပစ္စည်းများမှ ထုတ်လုပ်ထားသော အကြံပြုမေးခွန်းများ' : 'Catalog-Aware Sample Questions'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleRunPreview(s)}
                      className="px-2.5 py-1 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#F5F2E8] rounded-lg text-xs transition-colors cursor-pointer text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Simulation Input / Output Box */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#B9B5A7] font-semibold mb-1">
                  {lang === 'my' ? 'ဖောက်သည် စာသား တင်သွင်းရန် (Customer Test Message)' : 'Customer Test Message'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={previewInput}
                    onChange={(e) => setPreviewInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRunPreview()}
                    placeholder={lang === 'my' ? 'ဥပမာ - ဒီဒီဇိုင်း ရှိသေးလား၊ ဘယ်လောက်လဲင်...' : 'e.g. Is this available in red size L?'}
                    className="flex-1 bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] placeholder-[#817D70] focus:border-[#C9A227] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={previewLoading || !previewInput.trim()}
                    onClick={() => handleRunPreview()}
                    className="px-4 py-2 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{previewLoading ? (lang === 'my' ? 'စစ်ဆေးနေသည်...' : 'Testing...') : (lang === 'my' ? 'စမ်းသပ်မည်' : 'Test AI')}</span>
                  </button>
                </div>
              </div>

              {previewError && (
                <div className="p-3 bg-[#E06B61]/15 border border-[#E06B61]/40 rounded-xl text-[#E06B61] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{previewError}</span>
                </div>
              )}

              {previewOutput && (
                <div className="bg-[#11110D] border border-[#C9A227]/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#C9A227] tracking-wider flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'AI ၏ တုံ့ပြန်မည့်ပုံစံ (Generated AI Reply)' : 'Generated AI Reply'}</span>
                    </span>
                    <span className="text-[10px] text-[#817D70] font-mono">Groq Llama 3</span>
                  </div>
                  <p className="text-xs text-[#F5F2E8] leading-relaxed whitespace-pre-wrap bg-[#181810] p-3 rounded-lg border border-[#393426]">
                    {previewOutput}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Sample Replies Library (Few-Shot Prompting Rules) */}
          <section aria-label="Sample Replies Library" className="bg-[#181810] border border-[#393426] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#393426] pb-3 gap-2">
              <div>
                <h3 className="text-base font-bold text-[#F5F2E8]">
                  {lang === 'my' ? 'နမူနာ ဖြေကြားချက်များ (Few-Shot Sample Replies)' : 'Few-Shot Sample Replies Library'}
                </h3>
                <p className="text-xs text-[#817D70]">
                  {lang === 'my' ? 'AI အား ကုန်သည်၏ အမိုက်စား ဖြေကြားဟန်ကို သင်ကြားပေးသည့် နမူနာများ' : 'Teach AI your preferred brand tone with expert conversational examples.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddSample}
                className="px-3.5 py-2 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'my' ? 'နမူနာ အသစ်ထည့်မည်' : 'Add Sample Reply'}</span>
              </button>
            </div>

            {samples.length === 0 ? (
              <div className="text-center py-10 space-y-2 bg-[#11110D] border border-[#393426] rounded-2xl">
                <HelpCircle className="w-8 h-8 text-[#817D70] mx-auto" />
                <p className="text-xs text-[#817D70]">
                  {lang === 'my' ? 'နမူနာ ဖြေကြားချက် မရှိသေးပါ။' : 'No sample replies configured yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {samples.map((s) => (
                  <div key={s.id} className="bg-[#11110D] border border-[#393426] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E1D14] border border-[#393426] text-[#C9A227]">
                          {s.category || 'General'}
                        </span>
                      </div>
                      <div className="text-xs text-[#B9B5A7]">
                        <span className="text-[#817D70] font-semibold">Q:</span> {s.customerMessage}
                      </div>
                      <div className="text-xs text-[#F5F2E8] font-medium bg-[#181810] p-2.5 rounded-lg border border-[#393426]">
                        <span className="text-[#65B985] font-semibold">A:</span> {s.preferredReply}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSample(s)}
                        className="p-2 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#B9B5A7] hover:text-[#F5F2E8] rounded-lg transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSample(s.id)}
                        className="p-2 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#E06B61] hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Section 3: Orders & Payments */}
      {activeSection === 'payments' && (
        <section aria-label="Orders and Payments" className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-2xl p-5 space-y-4">
          <div className="border-b border-[#CBD5E1] pb-3">
            <h3 className="text-base font-bold text-[#0F172A]">
              {lang === 'my' ? 'ဖောက်သည် အော်ဒါများနှင့် ငွေလွှဲအတည်ပြုချက်များ' : 'Customer Orders & Payment Verification'}
            </h3>
            <p className="text-xs text-[#64748B]">
              {lang === 'my' ? 'ဖောက်သည်များ တင်ထားသော အော်ဒါများနှင့် KBZPay / WavePay ငွေလွှဲစလစ်များ' : 'Verify customer payments and manage active sales orders.'}
            </p>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 space-y-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl">
              <ShoppingBag className="w-8 h-8 text-[#64748B] mx-auto" />
              <p className="text-xs text-[#64748B]">
                {lang === 'my' ? 'အော်ဒါ မရှိသေးပါ။' : 'No customer orders recorded yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const isConfirmed = order.paymentStatus === 'CONFIRMED';
                return (
                  <div key={order.id} className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-[#0F172A]">#{order.id.slice(0, 8)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isConfirmed
                            ? 'bg-[#16A34A]/15 text-[#16A34A] border border-[#16A34A]/30'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {isConfirmed ? (lang === 'my' ? 'ငွေပေးချေပြီး' : 'PAID') : (lang === 'my' ? 'စစ်ဆေးဆဲ' : 'PENDING PAYMENT')}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {new Date(order.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-[#0F172A] font-medium">
                        <span className="font-bold">{order.customerName}</span> ({order.customerPhone}) · {order.shippingAddress}
                      </div>

                      <div className="text-slate-600 space-y-0.5">
                        {order.items?.map((item, i) => (
                          <div key={i} className="flex justify-between max-w-md">
                            <span>{item.name} ({item.variant}) × {item.qty}</span>
                            <span className="font-mono">{(item.price * item.qty).toLocaleString()} MMK</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase block">Total</span>
                        <span className="text-base font-bold font-mono text-[#2563EB]">{order.totalAmount.toLocaleString()} MMK</span>
                      </div>

                      {!isConfirmed && (
                        <button
                          type="button"
                          disabled={confirmingId === order.id}
                          onClick={() => handleConfirmOrderPayment(order.id)}
                          className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          {confirmingId === order.id
                            ? (lang === 'my' ? 'အတည်ပြုနေသည်...' : 'Confirming...')
                            : (lang === 'my' ? 'ငွေလက်ခံ အတည်ပြုမည်' : 'Confirm Payment')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Section 4: Connected Channels */}
      {activeSection === 'channels' && (
        <section aria-label="Connected Channels" className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-2xl p-5 space-y-4">
          <div className="border-b border-[#CBD5E1] pb-3">
            <h3 className="text-base font-bold text-[#0F172A]">
              {lang === 'my' ? 'ချိတ်ဆက်ထားသော လူမှုကွန်ရက် ချန်နယ်များ' : 'Social Channels Integration'}
            </h3>
            <p className="text-xs text-[#817D70]">
              {lang === 'my' ? 'Facebook Messenger, TikTok စသည်တို့၏ စစ်မှန်သော ချိတ်ဆက်မှု အခြေအနေ' : 'Truthful status of official social platform integrations.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            {/* Facebook Messenger */}
            <div className="bg-[#11110D] border border-[#393426] rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#817D70]">Facebook Messenger</span>
                <h4 className="text-sm font-bold text-[#F5F2E8]">Messenger Sales Chatbot</h4>
                <div className="pt-1">
                  {providerStatus?.facebook ? (
                    <span className="text-[#65B985] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'ချိတ်ဆက်ပြီး (Active)' : 'Connected & Verified'}</span>
                    </span>
                  ) : (
                    <span className="text-[#A88419] font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'App ID မထည့်ရသေးပါ' : 'Configuration Missing'}</span>
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenConfig('facebook')}
                className="w-full py-2 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-xs font-semibold text-[#C9A227] rounded-lg transition-colors cursor-pointer text-center"
              >
                {providerStatus?.facebook ? (lang === 'my' ? 'Credentials ပြင်ဆင်ရန်' : 'Update Credentials') : (lang === 'my' ? 'App ID ချိတ်ဆက်ရန်' : 'Configure Credentials')}
              </button>
            </div>

            {/* TikTok */}
            <div className="bg-[#11110D] border border-[#393426] rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#817D70]">TikTok</span>
                <h4 className="text-sm font-bold text-[#F5F2E8]">TikTok Direct Messages</h4>
                <div className="pt-1">
                  {providerStatus?.tiktok ? (
                    <span className="text-[#65B985] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'ချိတ်ဆက်ပြီး (Active)' : 'Connected & Verified'}</span>
                    </span>
                  ) : (
                    <span className="text-[#A88419] font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'Client Key မထည့်ရသေးပါ' : 'Configuration Missing'}</span>
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenConfig('tiktok')}
                className="w-full py-2 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-xs font-semibold text-[#C9A227] rounded-lg transition-colors cursor-pointer text-center"
              >
                {providerStatus?.tiktok ? (lang === 'my' ? 'Credentials ပြင်ဆင်ရန်' : 'Update Credentials') : (lang === 'my' ? 'Client Key ချိတ်ဆက်ရန်' : 'Configure Credentials')}
              </button>
            </div>

            {/* Google Sign-In OAuth */}
            <div className="bg-[#11110D] border border-[#393426] rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#817D70]">Google OAuth</span>
                <h4 className="text-sm font-bold text-[#F5F2E8]">Google Sign-In</h4>
                <div className="pt-1">
                  {providerStatus?.google ? (
                    <span className="text-[#65B985] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'OAuth ချိတ်ဆက်ထားသည်' : 'OAuth Ready'}</span>
                    </span>
                  ) : (
                    <span className="text-[#A88419] font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'Client ID မသတ်မှတ်ရသေးပါ' : 'Not Configured'}</span>
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenConfig('google')}
                className="w-full py-2 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-xs font-semibold text-[#C9A227] rounded-lg transition-colors cursor-pointer text-center"
              >
                {lang === 'my' ? 'Google OAuth ပြင်ရန်' : 'Configure Google OAuth'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Section 5: Account Security & Logout */}
      {activeSection === 'account' && (
        <section aria-label="Account and Security" className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-2xl p-5 space-y-4 text-xs">
          <div className="border-b border-[#CBD5E1] pb-3">
            <h3 className="text-base font-bold text-[#0F172A]">
              {lang === 'my' ? 'အကောင့်နှင့် လုံခြုံရေး' : 'Account & Security Details'}
            </h3>
            <p className="text-[#64748B]">
              {lang === 'my' ? 'လော့ဂ်အင်ဝင်ထားသော ကုန်သည်အကောင့် အချက်အလက်' : 'Currently authenticated merchant administrator details.'}
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#64748B]">{lang === 'my' ? 'ကုန်သည် အမည်' : 'Name'}:</span>
              <span className="font-bold text-[#0F172A]">{user?.name || user?.displayName || 'Merchant Admin'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#64748B]">{lang === 'my' ? 'အီးမေးလ်' : 'Email'}:</span>
              <span className="font-mono text-[#0F172A]">{user?.email || 'aung@yangonstyle.mm'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#817D70]">{lang === 'my' ? 'တာဝန် / Role' : 'Role'}:</span>
              <span className="text-[#C9A227] font-semibold">{user?.role || 'merchant_admin'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#817D70]">{lang === 'my' ? 'ဆာဗာ တိုကင်' : 'Token'}:</span>
              <span className="text-[#65B985] font-mono">Active (Valid Session)</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 bg-[#E06B61]/15 hover:bg-[#E06B61]/25 border border-[#E06B61]/40 text-[#E06B61] font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{lang === 'my' ? 'အကောင့်မှ ထွက်မည်' : 'Sign Out'}</span>
            </button>
          </div>
        </section>
      )}

      {/* Sample Reply Add/Edit Modal */}
      {isSampleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#181810] border border-[#393426] rounded-2xl w-full max-w-lg p-6 space-y-5 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#393426] pb-3">
              <h3 className="text-sm font-bold text-[#F5F2E8]">
                {editingSample
                  ? (lang === 'my' ? 'နမူနာ ဖြေကြားချက် ပြင်ဆင်ရန်' : 'Edit Sample Reply')
                  : (lang === 'my' ? 'နမူနာ ဖြေကြားချက် အသစ်ထည့်ရန်' : 'Add New Sample Reply')}
              </h3>
              <button
                type="button"
                onClick={() => setIsSampleModalOpen(false)}
                className="text-[#817D70] hover:text-[#F5F2E8] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSample} className="space-y-4">
              <div>
                <label className="block text-[#B9B5A7] font-semibold mb-1">
                  {lang === 'my' ? 'အမျိုးအစား (Category)' : 'Category'}
                </label>
                <input
                  type="text"
                  value={sampleForm.category}
                  onChange={(e) => setSampleForm({ ...sampleForm, category: e.target.value })}
                  placeholder="Stock and variants, Pricing, Shipping..."
                  className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#B9B5A7] font-semibold mb-1">
                  {lang === 'my' ? 'ဖောက်သည်၏ မေးခွန်း (Customer Query)' : 'Customer Query'}
                </label>
                <input
                  type="text"
                  required
                  value={sampleForm.customerMessage}
                  onChange={(e) => setSampleForm({ ...sampleForm, customerMessage: e.target.value })}
                  placeholder="e.g. Size L ရှိသေးလားင်..."
                  className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#B9B5A7] font-semibold mb-1">
                  {lang === 'my' ? 'နှစ်သက်သော တုံ့ပြန်ပုံ (Preferred Reply)' : 'Preferred Reply'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={sampleForm.preferredReply}
                  onChange={(e) => setSampleForm({ ...sampleForm, preferredReply: e.target.value })}
                  placeholder="e.g. ဟုတ်ကဲ့ရှင် Size L လက်ကျန် ၃ ထည်ရှိပါတယ်..."
                  className="w-full bg-[#11110D] border border-[#393426] rounded-xl p-3 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#393426]">
                <button
                  type="button"
                  onClick={() => setIsSampleModalOpen(false)}
                  className="px-4 py-2 bg-[#11110D] hover:bg-[#1E1D14] border border-[#393426] text-[#B9B5A7] font-bold rounded-xl cursor-pointer"
                >
                  {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingSample}
                  className="px-5 py-2 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {savingSample ? (lang === 'my' ? 'သိမ်းဆည်းနေသည်...' : 'Saving...') : (lang === 'my' ? 'သိမ်းမည်' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
