import React, { useState, useEffect } from 'react';
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
  X,
  Upload,
  QrCode,
  FileText,
  Image as ImageIcon,
  Filter,
  RefreshCw,
  Eye,
  Check
} from 'lucide-react';
import { StoreSettings, Order, ProviderStatus, AiConfig, SampleReply, AiHealth, Product, PaymentSettings } from '../types';
import { StorefrontAppearanceView } from './StorefrontAppearanceView';

interface ProfileViewProps {
  store: StoreSettings | null;
  orders: Order[];
  providerStatus: ProviderStatus | null;
  user: any;
  lang: 'my' | 'en';
  onUpdateStore: (storeData: Partial<StoreSettings>) => Promise<void>;
  onConfirmPayment: (orderId: string) => Promise<void>;
  onRejectPayment?: (orderId: string, reason: string) => Promise<void>;
  onOpenConfig: (provider: 'google' | 'facebook' | 'tiktok') => void;
  onLogout: () => void;
  onOpenPublicStore: () => void;
  onOpenStorefront?: (slug: string) => void;
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
  onRejectPayment,
  onOpenConfig,
  onLogout,
  onOpenPublicStore,
  onOpenStorefront,
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
  const [activeSection, setActiveSection] = useState<'store' | 'appearance' | 'payment_settings' | 'payments' | 'ai' | 'channels' | 'account'>(
    initialTab === 'appearance'
      ? 'appearance'
      : initialTab === 'ai'
      ? 'ai'
      : initialTab === 'payments'
      ? 'payments'
      : initialTab === 'payment_settings'
      ? 'payment_settings'
      : 'store'
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

  // Merchant KPay Payment Settings form state
  const [kpayAccountName, setKpayAccountName] = useState(store?.paymentSettings?.kpayAccountName || '');
  const [kpayPhone, setKpayPhone] = useState(store?.paymentSettings?.kpayPhone || '');
  const [kpayQrUrl, setKpayQrUrl] = useState(store?.paymentSettings?.kpayQrUrl || '');
  const [paymentRules, setPaymentRules] = useState(store?.paymentSettings?.paymentRules || '');
  const [customPaymentInstructions, setCustomPaymentInstructions] = useState(store?.paymentSettings?.customInstructions || '');
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);
  const [paymentSettingsSuccess, setPaymentSettingsSuccess] = useState(false);
  const [paymentSettingsError, setPaymentSettingsError] = useState<string | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [uploadQrError, setUploadQrError] = useState<string | null>(null);

  // Orders Payment Verification Filter & Modals
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<'all' | 'SLIP_SUBMITTED' | 'PENDING' | 'CONFIRMED' | 'REJECTED'>('all');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [rejectModalOrder, setRejectModalOrder] = useState<Order | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [submittingRejection, setSubmittingRejection] = useState(false);
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null);

  // Fetch Authoritative Payment Settings from Server on Mount
  useEffect(() => {
    const loadPaymentSettings = async () => {
      try {
        const token = localStorage.getItem('myanmar_seller_token');
        const res = await fetch('/api/merchant/payment-settings', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (data.kpayAccountName) setKpayAccountName(data.kpayAccountName);
          if (data.kpayPhone) setKpayPhone(data.kpayPhone);
          if (data.kpayQrUrl) setKpayQrUrl(data.kpayQrUrl);
          if (data.paymentRules) setPaymentRules(data.paymentRules);
          if (data.customInstructions) setCustomPaymentInstructions(data.customInstructions);
        }
      } catch {
        // Safe graceful failover
      }
    };
    loadPaymentSettings();
  }, []);

  const handleUploadQrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    setUploadQrError(null);
    try {
      const formData = new FormData();
      formData.append('qrImage', file);
      const token = localStorage.getItem('myanmar_seller_token');
      let res: Response;
      try {
        res = await fetch('/api/merchant/payment-settings/upload-qr', {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData
        });
      } catch {
        throw new Error(lang === 'my' ? 'ကွန်ရက်ချိတ်ဆက်မှု မအောင်မြင်ပါ (Network connection failed)' : 'Network connection failed. Please check your connection.');
      }
      const contentType = res.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => null);
      }
      if (!res.ok) {
        throw new Error((data && data.error) || (res.status === 502 || res.status === 504 ? 'Server is temporarily restarting. Please try again.' : `Failed to upload QR image (HTTP ${res.status})`));
      }
      if (!data?.qrUrl) {
        throw new Error('Invalid server response');
      }
      setKpayQrUrl(data.qrUrl);
    } catch (err: any) {
      setUploadQrError(err.message || 'QR upload failed');
    } finally {
      setUploadingQr(false);
      e.target.value = '';
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPaymentSettings(true);
    setPaymentSettingsSuccess(false);
    setPaymentSettingsError(null);
    try {
      const token = localStorage.getItem('myanmar_seller_token');
      const res = await fetch('/api/merchant/payment-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          kpayAccountName,
          kpayPhone,
          kpayQrUrl,
          paymentRules,
          customInstructions: customPaymentInstructions
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save payment settings');
      }
      setPaymentSettingsSuccess(true);
      setTimeout(() => setPaymentSettingsSuccess(false), 3000);
    } catch (err: any) {
      setPaymentSettingsError(err.message || 'Failed to save payment settings');
    } finally {
      setSavingPaymentSettings(false);
    }
  };

  const handleApplyDefaultRules = () => {
    const defaultRules = `၁။ KBZPay အကောင့်အမည်နှင့် ဖုန်းနံပါတ်ကို သေချာစွာ စစ်ဆေးပြီးမှ ငွေလွှဲပေးပါရန်။
၂။ အော်ဒါတွင် ကျသင့်သော စုစုပေါင်းငွေပမာဏ အတိအကျကိုသာ လွှဲပေးပါရန်။
၃။ ငွေလွှဲပြီးပါက အောင်မြင်သော ပြေစာ (Screenshot/Slip) အပြည့်အစုံကို တင်ပေးပါရန်။
၄။ ငွေလွှဲမှတ်တမ်း (Transaction ID / Ref No.) ကို ထည့်သွင်းပေးပါရန်။
၅။ ဆိုင်ရှင်မှ ငွေဝင်ရောက်မှု စစ်ဆေးအတည်ပြုပြီးမှသာ အော်ဒါ အတည်ဖြစ်ပါမည်။
၆။ ပြေစာအတု သို့မဟုတ် တခြားအော်ဒါ၏ ပြေစာဟောင်းများ အသုံးပြုခြင်းကို တင်းကျပ်စွာ တားမြစ်ပါသည်။`;
    setPaymentRules(defaultRules);
  };

  const handleConfirmRejectOrder = async () => {
    if (!rejectModalOrder || !rejectionReasonText.trim() || submittingRejection) return;
    setSubmittingRejection(true);
    setRejectionError(null);
    try {
      if (onRejectPayment) {
        await onRejectPayment(rejectModalOrder.id, rejectionReasonText.trim());
      } else {
        const token = localStorage.getItem('myanmar_seller_token');
        const res = await fetch(`/api/orders/${rejectModalOrder.id}/reject-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ reason: rejectionReasonText.trim() })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reject payment');
      }
      setRejectModalOrder(null);
      setRejectionReasonText('');
    } catch (err: any) {
      setRejectionError(err.message || 'Failed to reject payment');
    } finally {
      setSubmittingRejection(false);
    }
  };

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
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            activeSection === 'store'
              ? 'bg-[#C9A227] text-[#0B0B09]'
              : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
          }`}
        >
          {lang === 'my' ? 'စတိုးအချက်အလက်' : 'Store Settings'}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('appearance')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeSection === 'appearance'
              ? 'bg-[#C9A227] text-[#0B0B09]'
              : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
          <span>{lang === 'my' ? 'စတိုး ဒီဇိုင်း ပြင်ဆင်မှု' : 'Storefront Appearance'}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('payment_settings')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeSection === 'payment_settings'
              ? 'bg-[#C9A227] text-[#0B0B09]'
              : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>{lang === 'my' ? 'ငွေပေးချေမှု ဆက်တင် (KPay)' : 'Payment Settings'}</span>
          {(!kpayAccountName || !kpayPhone) && (
            <span className="w-2 h-2 rounded-full bg-amber-400" title={lang === 'my' ? 'ဆက်တင် မပြည့်စုံသေးပါ' : 'Setup incomplete'} />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('payments')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeSection === 'payments'
              ? 'bg-[#C9A227] text-[#0B0B09]'
              : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
          }`}
        >
          <span>{lang === 'my' ? 'အော်ဒါနှင့် ငွေလွှဲစစ်ဆေးမှု' : 'Orders & Verification'}</span>
          {orders.filter(o => o.paymentStatus === 'SLIP_SUBMITTED').length > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-neutral-950 font-bold font-mono">
              {orders.filter(o => o.paymentStatus === 'SLIP_SUBMITTED').length}
            </span>
          ) : orders.filter(o => o.paymentStatus !== 'CONFIRMED').length > 0 ? (
            <span className="w-2 h-2 rounded-full bg-[#E0BD55]" />
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('ai')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
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
          onClick={() => setActiveSection('channels')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
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
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            activeSection === 'account'
              ? 'bg-[#C9A227] text-[#0B0B09]'
              : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
          }`}
        >
          {lang === 'my' ? 'အကောင့်လုံခြုံရေး' : 'Account & Security'}
        </button>
      </div>

      {/* Section: Storefront Appearance Studio */}
      {activeSection === 'appearance' && (
        <StorefrontAppearanceView
          store={store}
          products={products}
          lang={lang}
          onStoreUpdated={async (updated) => {
            await onUpdateStore(updated);
          }}
          onOpenLiveStore={onOpenPublicStore}
        />
      )}

      {/* Section 1: Store Settings */}
      {activeSection === 'store' && (
        <section aria-label="Store Profile and Settings" className="bg-[#13121D] border border-white/10 rounded-2xl p-5 shadow-[0_15px_35px_rgba(0,0,0,0.5)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/15 pb-3 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {lang === 'my' ? 'စတိုးပရိုဖိုင်နှင့် အချက်အလက်များ' : 'Store Profile & Publication'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'my' ? 'ဖောက်သည်များနှင့် AI စစ်ဆေးရာတွင် အသုံးပြုမည့် စတိုးအချက်အလက်များ' : 'Public store details used by customers and AI catalog verification.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  const targetSlug = store?.slug || 'yangon-style';
                  if (onOpenStorefront) {
                    onOpenStorefront(targetSlug);
                  } else {
                    window.location.href = `/store/${encodeURIComponent(targetSlug)}`;
                  }
                }}
                className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'Public စတိုး ဖွင့်မည်' : 'Open Storefront'}</span>
              </button>
              <a
                href={`/store/${encodeURIComponent(store?.slug || 'yangon-style')}`}
                target="_blank"
                rel="noreferrer"
                title={lang === 'my' ? 'Tab အသစ်ဖြင့် ဖွင့်မည်' : 'Open in new tab'}
                className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/15 text-slate-200 hover:text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setActiveSection('appearance')}
                className="px-3.5 py-1.5 bg-[#C9A227] hover:brightness-110 text-[#0B0B09] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'ဒီဇိုင်း ပြင်ဆင်မည်' : 'Customize Appearance'}</span>
              </button>
              <button
                type="button"
                onClick={onOpenPublicStore}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-slate-200 hover:text-white rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'စမ်းသပ်ခန်း' : 'Simulator'}</span>
              </button>
            </div>
          </div>

          {/* Public Storefront Link & Sharing Banner */}
          <div className="bg-[#1A1829] border border-white/15 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
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
                className="w-full bg-[#13121D] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 select-all shadow-xs"
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
                <label className="block text-slate-300 font-semibold mb-1">
                  {lang === 'my' ? 'စတိုးအမည် (Store Name)' : 'Store Name'}
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-[#1A1829] border border-white/15 rounded-xl px-3 py-2 text-slate-100 focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between sm:pt-6">
                <div>
                  <span className="font-semibold text-slate-100 block">
                    {lang === 'my' ? 'စတိုး အများပြည်သူသို့ တင်ပြရန်' : 'Publish Storefront'}
                  </span>
                  <span className="text-[11px] text-slate-400">
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
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-[#1A1829] transition-transform ${
                      isPublished ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                {lang === 'my' ? 'စတိုး ဖော်ပြချက် (Description)' : 'Store Description'}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#1A1829] border border-white/15 rounded-xl p-3 text-slate-100 focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {lang === 'my' ? 'ပို့ဆောင်ရေး အချက်အလက် (Delivery Info)' : 'Delivery Information'}
                </label>
                <textarea
                  rows={2}
                  value={deliveryInfo}
                  onChange={(e) => setDeliveryInfo(e.target.value)}
                  className="w-full bg-[#1A1829] border border-white/15 rounded-xl p-3 text-slate-100 focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {lang === 'my' ? 'ငွေပေးချေရန် လမ်းညွှန်ချက်များ (Payment Instructions)' : 'Payment Instructions'}
                </label>
                <textarea
                  rows={2}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  className="w-full bg-[#1A1829] border border-white/15 rounded-xl p-3 text-slate-100 focus:border-[#2563EB] focus:outline-none"
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

      {/* Section: Merchant KPay Payment Settings */}
      {activeSection === 'payment_settings' && (
        <section aria-label="Merchant Payment Settings" className="bg-[#13121D] border border-white/10 rounded-2xl p-5 shadow-[0_15px_35px_rgba(0,0,0,0.5)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/15 pb-3 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#2563EB]" />
                <span>{lang === 'my' ? 'KBZPay ငွေပေးချေမှု ဆက်တင်များ' : 'KBZPay Merchant Payment Setup'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'my'
                  ? 'ဖောက်သည်များ ငွေလွှဲရန် အသုံးပြုမည့် ကုန်သည်၏ စစ်မှန်သော KPay အကောင့်၊ ဖုန်းနံပါတ်၊ QR ကုဒ်နှင့် လွှဲပြောင်းမှု စည်းမျဉ်းများ'
                  : 'Configure verified KBZPay account details, QR code, and strict payment rules shown to customers at checkout.'}
              </p>
            </div>
            {(!kpayAccountName || !kpayPhone) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>{lang === 'my' ? 'ဆက်တင် မပြည့်စုံသေးပါ' : 'Setup Required'}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Configuration Form */}
            <form onSubmit={handleSavePaymentSettings} className="lg:col-span-7 space-y-5 text-xs">
              {paymentSettingsSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lang === 'my' ? 'KBZPay ဆက်တင်များကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။' : 'Payment settings updated successfully!'}</span>
                </div>
              )}

              {paymentSettingsError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{paymentSettingsError}</span>
                </div>
              )}

              {/* Account Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {lang === 'my' ? 'KBZPay အကောင့်ပိုင်ရှင် အမည် *' : 'KBZPay Account Holder Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Daw Thida Win / Ko Aung Thu"
                    value={kpayAccountName}
                    onChange={(e) => setKpayAccountName(e.target.value)}
                    className="w-full bg-[#1A1829] border border-white/15 rounded-xl px-3 py-2 text-slate-100 focus:border-[#2563EB] focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    {lang === 'my' ? 'KBZPay အက်ပ်ထဲတွင် ဖော်ပြထားသည့် အမည် အတိအကျ' : 'Official legal or registered KBZPay account name'}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {lang === 'my' ? 'KBZPay ဖုန်းနံပါတ် *' : 'KBZPay Phone Number *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="09..."
                    value={kpayPhone}
                    onChange={(e) => setKpayPhone(e.target.value)}
                    className="w-full bg-[#1A1829] border border-white/15 rounded-xl px-3 py-2 font-mono text-slate-100 focus:border-[#2563EB] focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    {lang === 'my' ? 'မြန်မာဖုန်းနံပါတ် (09xxxxxxxxx သို့မဟုတ် +959xxxxxxxxx)' : 'Myanmar phone format: 09... or +959...'}
                  </span>
                </div>
              </div>

              {/* QR Code Upload */}
              <div className="bg-[#1A1829] border border-white/15 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-100 block">
                      {lang === 'my' ? 'KBZPay QR ကုဒ် ပုံတင်ရန်' : 'KBZPay QR Code Image'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {lang === 'my' ? 'ဖောက်သည်များ တိုက်ရိုက် Scan ဖတ်နိုင်မည့် QR ပုံ (PNG, JPG, WebP - အများဆုံး 5MB)' : 'Upload your official KBZPay receive-money QR code (PNG, JPG, WebP, max 5MB)'}
                    </span>
                  </div>
                  {kpayQrUrl && (
                    <button
                      type="button"
                      onClick={() => setKpayQrUrl('')}
                      className="text-xs text-rose-600 hover:text-rose-700 underline cursor-pointer"
                    >
                      {lang === 'my' ? 'ပုံဖျက်မည်' : 'Remove QR'}
                    </button>
                  )}
                </div>

                {uploadQrError && (
                  <p className="text-xs text-rose-600 font-medium">{uploadQrError}</p>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {kpayQrUrl ? (
                    <div className="relative group w-32 h-32 bg-[#1A1829] rounded-xl border border-slate-200 p-2 flex items-center justify-center shrink-0 shadow-xs">
                      <img
                        src={kpayQrUrl}
                        alt="KPay QR"
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewSlipUrl(kpayQrUrl)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white cursor-pointer"
                        title="Enlarge QR"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <QrCode className="w-8 h-8 mb-1" />
                      <span className="text-[10px]">{lang === 'my' ? 'QR မတင်ရသေးပါ' : 'No QR uploaded'}</span>
                    </div>
                  )}

                  <div className="space-y-2 flex-1">
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1829] hover:bg-[#1A1829] border border-slate-300 rounded-xl font-semibold text-slate-700 cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span>{uploadingQr ? (lang === 'my' ? 'တင်နေသည်...' : 'Uploading...') : (kpayQrUrl ? (lang === 'my' ? 'QR ပုံ အသစ်လဲမည်' : 'Change QR Image') : (lang === 'my' ? 'QR ပုံ ရွေးချယ်တင်မည်' : 'Upload QR Image'))}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={uploadingQr}
                        onChange={handleUploadQrFile}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'my' ? 'KBZPay App > Receive Money > QR Code ကို Screenshot ရိုက်၍ တင်ပေးပါ။' : 'Take a screenshot of Receive Money QR from your KBZPay app and upload here.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Rules & Regulations */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">
                    {lang === 'my' ? 'ငွေလွှဲစည်းမျဉ်းနှင့် သတိပြုရန်များ (Transfer Rules) *' : 'Payment Rules & Verification Policy *'}
                  </label>
                  <button
                    type="button"
                    onClick={handleApplyDefaultRules}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline"
                  >
                    {lang === 'my' ? 'နမူနာ စည်းမျဉ်းများ ထည့်သွင်းမည်' : 'Use Default Template'}
                  </button>
                </div>
                <textarea
                  rows={6}
                  required
                  placeholder={lang === 'my' ? 'ဖောက်သည်များ ငွေမလွှဲမီ သတိပြုရမည့် စည်းမျဉ်းများကို ရေးသားပါ...' : 'Rules that customers must follow before transferring money...'}
                  value={paymentRules}
                  onChange={(e) => setPaymentRules(e.target.value)}
                  className="w-full bg-[#1A1829] border border-white/15 rounded-xl p-3 text-slate-100 focus:border-[#2563EB] focus:outline-none leading-relaxed font-sans"
                />
                <span className="text-[11px] text-slate-400 block">
                  {lang === 'my' ? 'ငွေလွှဲသည့်အခါ ပြေစာအပြည့်အစုံတင်ရန်၊ မှားယွင်းငွေလွှဲခြင်းနှင့် ပတ်သက်သည့် စည်းမျဉ်းများကို ထည့်သွင်းပါ။' : 'Explicit transfer rules help prevent customer errors and fraudulent transaction slips.'}
                </span>
              </div>

              {/* Custom Optional Instructions */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">
                  {lang === 'my' ? 'ဖောက်သည်များထံသို့ ထပ်ဆောင်း အမှာစကား (ရွေးချယ်နိုင်သည်)' : 'Additional Customer Instructions (Optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={lang === 'my' ? 'ဥပမာ - မနက် ၉ နာရီမှ ညနေ ၆ နာရီအတွင်းသာ ငွေလွှဲအတည်ပြုပေးပါသည်။' : 'e.g. Slips verified within 15 minutes during operating hours.'}
                  value={customPaymentInstructions}
                  onChange={(e) => setCustomPaymentInstructions(e.target.value)}
                  className="w-full bg-[#1A1829] border border-white/15 rounded-xl p-3 text-slate-100 focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPaymentSettings || uploadingQr}
                  className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingPaymentSettings ? (lang === 'my' ? 'သိမ်းဆည်းနေသည်...' : 'Saving...') : (lang === 'my' ? 'KPay ဆက်တင်များ သိမ်းမည်' : 'Save Payment Setup')}</span>
                </button>
              </div>
            </form>

            {/* Right 5 cols: Live Checkout Customer Preview */}
            <div className="lg:col-span-5 bg-[#1A1829] border border-slate-200 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <Eye className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {lang === 'my' ? 'ဖောက်သည်မြင်ကွင်း နမူနာ (Live Checkout Preview)' : 'Customer Checkout Preview'}
                </h4>
              </div>

              {(!kpayAccountName && !kpayPhone) ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CreditCard className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">{lang === 'my' ? 'အချက်အလက်များ ဖြည့်စွက်ပါက နမူနာမြင်ကွင်း ပေါ်လာပါမည်။' : 'Fill in payment details on the left to see customer preview.'}</p>
                </div>
              ) : (
                <div className="bg-[#1A1829] border border-blue-200 rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      KBZPay Official
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Store Checkout</span>
                  </div>

                  {kpayQrUrl ? (
                    <div className="flex justify-center py-2">
                      <div className="w-40 h-40 bg-[#1A1829] p-2 border border-slate-200 rounded-xl shadow-xs">
                        <img src={kpayQrUrl} alt="Preview QR" className="w-full h-full object-contain rounded-lg" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full py-4 bg-slate-100 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                      {lang === 'my' ? 'QR Code ပုံ မထည့်ရသေးပါ' : 'No QR uploaded yet'}
                    </div>
                  )}

                  <div className="bg-[#1A1829] border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{lang === 'my' ? 'အကောင့်ပိုင်ရှင်' : 'Holder Name'}:</span>
                      <span className="font-bold text-slate-100">{kpayAccountName || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{lang === 'my' ? 'KPay ဖုန်း' : 'Phone'}:</span>
                      <span className="font-mono font-bold text-blue-700">{kpayPhone || '—'}</span>
                    </div>
                  </div>

                  {paymentRules && (
                    <div className="text-[11px] bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1 text-amber-900">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>{lang === 'my' ? 'ငွေလွှဲစည်းမျဉ်းများ' : 'Transfer Rules'}</span>
                      </div>
                      <div className="whitespace-pre-line text-[11px] leading-relaxed text-amber-800">
                        {paymentRules}
                      </div>
                    </div>
                  )}

                  {customPaymentInstructions && (
                    <div className="text-[11px] bg-[#1A1829] p-2.5 rounded-lg border border-slate-200 text-slate-600 italic">
                      "{customPaymentInstructions}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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
                  Groq Main AI
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#F5F2E8]">
                {lang === 'my' ? 'Groq AI အရောင်းကိုယ်စားလှယ်' : 'Groq AI Sales Representative'}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-400/80 font-mono pt-0.5">
                <span>Model: {aiHealth?.model || 'llama-3.3-70b-versatile'}</span>
                <span>·</span>
                <span className={aiHealth?.configured ? 'text-[#65B985] font-semibold' : 'text-[#E06B61]'}>
                  Status: {aiHealth?.configured ? 'Operational' : 'GROQ_API_KEY Missing'}
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
                <span className="text-[11px] text-slate-400/80">
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
                <p className="text-xs text-slate-400/80">
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
                <p className="text-xs text-slate-400/80 mt-0.5">
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
                    <span className="text-[10px] text-slate-400/80 font-mono">Groq Llama 3</span>
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
                <p className="text-xs text-slate-400/80">
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
                <HelpCircle className="w-8 h-8 text-slate-400/80 mx-auto" />
                <p className="text-xs text-slate-400/80">
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
                        <span className="text-slate-400/80 font-semibold">Q:</span> {s.customerMessage}
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
        <section aria-label="Orders and Payments" className="bg-[#13121D] border border-white/10 rounded-2xl p-5 shadow-[0_15px_35px_rgba(0,0,0,0.5)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/15 pb-3 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#2563EB]" />
                <span>{lang === 'my' ? 'ဖောက်သည် အော်ဒါများနှင့် ငွေလွှဲစလစ် စစ်ဆေးခြင်း' : 'Customer Orders & Payment Slip Verification'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'my'
                  ? 'KBZPay ပြေစာများကို စစ်ဆေးအတည်ပြုပါ သို့မဟုတ် မကိုက်ညီပါက အကြောင်းပြချက်ဖြင့် ငြင်းပယ်ပါ'
                  : 'Verify submitted KBZPay slips manually, inspect transaction references, and reject invalid slips with clear reasons.'}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold flex items-center gap-1.5">
                <span>{lang === 'my' ? 'စလစ်စစ်ဆေးရန်' : 'Needs Review'}:</span>
                <span className="font-mono font-bold">{orders.filter(o => o.paymentStatus === 'SLIP_SUBMITTED').length}</span>
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setOrderPaymentFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                orderPaymentFilter === 'all'
                  ? 'bg-violet-600 text-white shadow-lg'
                  : 'bg-[#1A1829] text-slate-400 hover:text-slate-100 hover:bg-[#252335]'
              }`}
            >
              {lang === 'my' ? 'အားလုံး' : 'All Orders'} ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setOrderPaymentFilter('SLIP_SUBMITTED')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
                orderPaymentFilter === 'SLIP_SUBMITTED'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'စလစ်စစ်ဆေးရန်' : 'Slip Submitted'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                orderPaymentFilter === 'SLIP_SUBMITTED' ? 'bg-[#1A1829] text-blue-700' : 'bg-blue-600 text-white'
              }`}>
                {orders.filter(o => o.paymentStatus === 'SLIP_SUBMITTED').length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOrderPaymentFilter('PENDING')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                orderPaymentFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
              }`}
            >
              {lang === 'my' ? 'ငွေလွှဲစောင့်ဆိုင်းဆဲ' : 'Pending Payment'} ({orders.filter(o => o.paymentStatus === 'PENDING' || !o.paymentStatus).length})
            </button>
            <button
              type="button"
              onClick={() => setOrderPaymentFilter('CONFIRMED')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                orderPaymentFilter === 'CONFIRMED'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
              }`}
            >
              {lang === 'my' ? 'အတည်ပြုပြီး' : 'Confirmed'} ({orders.filter(o => o.paymentStatus === 'CONFIRMED').length})
            </button>
            <button
              type="button"
              onClick={() => setOrderPaymentFilter('REJECTED')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                orderPaymentFilter === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-lg'
                  : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
              }`}
            >
              {lang === 'my' ? 'ငြင်းပယ်ထားသော' : 'Rejected'} ({orders.filter(o => o.paymentStatus === 'REJECTED').length})
            </button>
          </div>

          {/* Orders List */}
          {(() => {
            const filteredOrders = orders.filter((order) => {
              if (orderPaymentFilter === 'SLIP_SUBMITTED') return order.paymentStatus === 'SLIP_SUBMITTED';
              if (orderPaymentFilter === 'PENDING') return order.paymentStatus === 'PENDING' || !order.paymentStatus;
              if (orderPaymentFilter === 'CONFIRMED') return order.paymentStatus === 'CONFIRMED';
              if (orderPaymentFilter === 'REJECTED') return order.paymentStatus === 'REJECTED';
              return true;
            });

            if (filteredOrders.length === 0) {
              return (
                <div className="text-center py-12 space-y-2 bg-[#1A1829] border border-white/15 rounded-2xl">
                  <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-400">
                    {lang === 'my' ? 'ရွေးချယ်ထားသော အခြေအနေနှင့် ကိုက်ညီသည့် အော်ဒါ မရှိပါ။' : 'No orders found matching the selected filter.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const status = order.paymentStatus || 'PENDING';
                  const isConfirmed = status === 'CONFIRMED';
                  const isSubmitted = status === 'SLIP_SUBMITTED';
                  const isRejected = status === 'REJECTED';
                  const isPending = status === 'PENDING';

                  return (
                    <div
                      key={order.id}
                      className={`bg-[#13121D] border rounded-2xl p-4 md:p-5 transition-all text-xs space-y-4 ${
                        isSubmitted
                          ? 'border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/5'
                          : isConfirmed
                          ? 'border-emerald-500/30 bg-[#13121D]'
                          : isRejected
                          ? 'border-rose-500/30 bg-rose-500/5'
                          : 'border-white/10 bg-[#13121D]'
                      }`}
                    >
                      {/* Order Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono font-bold text-sm text-slate-100">
                            #{order.id.slice(0, 8)}
                          </span>

                          {/* Status Badge */}
                          {isConfirmed && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>{lang === 'my' ? 'ငွေပေးချေမှု အတည်ပြုပြီး' : 'PAID & CONFIRMED'}</span>
                            </span>
                          )}
                          {isSubmitted && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                              <FileText className="w-3 h-3 text-blue-400" />
                              <span>{lang === 'my' ? 'စလစ်စစ်ဆေးရန်' : 'SLIP SUBMITTED'}</span>
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>{lang === 'my' ? 'ငွေလွှဲစောင့်ဆိုင်းဆဲ' : 'PENDING TRANSFER'}</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertCircle className="w-3 h-3 text-rose-500" />
                              <span>{lang === 'my' ? 'ငြင်းပယ်ထားသည်' : 'PAYMENT REJECTED'}</span>
                            </span>
                          )}

                          <span className="text-slate-500 font-mono text-[11px]">
                            {new Date(order.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {order.supportCode && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono bg-[#1A1829] px-2 py-0.5 rounded-md border border-white/10 self-start sm:self-auto">
                            <span>Code:</span>
                            <span className="font-bold text-slate-100">{order.supportCode}</span>
                          </div>
                        )}
                      </div>

                      {/* Main Details Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Customer & Items (7 cols) */}
                        <div className="lg:col-span-7 space-y-3">
                          <div className="bg-[#13121D] border border-white/10 rounded-xl p-3 space-y-1.5 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-100 text-sm">{order.customerName}</span>
                              <a
                                href={`tel:${order.customerPhone}`}
                                className="font-mono text-blue-600 hover:underline font-semibold"
                              >
                                {order.customerPhone}
                              </a>
                            </div>
                            <p className="text-slate-300 text-[11px]">
                              <span className="text-slate-400">{lang === 'my' ? 'လိပ်စာ' : 'Address'}: </span>
                              {order.shippingAddress}
                            </p>
                          </div>

                          {/* Ordered Items */}
                          <div className="bg-[#13121D] border border-white/10 rounded-xl p-3 space-y-2 shadow-xs">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                              {lang === 'my' ? 'မှာယူထားသော ပစ္စည်းများ' : 'Order Items'}
                            </span>
                            <div className="divide-y divide-white/5 space-y-1.5">
                              {order.items?.map((item, i) => (
                                <div key={i} className="flex justify-between items-center pt-1.5">
                                  <div>
                                    <span className="font-medium text-slate-800">{item.name}</span>
                                    {item.variant && (
                                      <span className="text-slate-500 text-[11px]"> ({item.variant})</span>
                                    )}
                                    <span className="text-slate-400 font-mono ml-2">×{item.qty}</span>
                                  </div>
                                  <span className="font-mono font-semibold text-slate-800">
                                    {(item.price * item.qty).toLocaleString()} MMK
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-white/10 pt-2 flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-300">{lang === 'my' ? 'ကျသင့်ငွေ စုစုပေါင်း' : 'Total Amount'}:</span>
                              <span className="font-mono font-bold text-sm text-blue-400">
                                {order.totalAmount.toLocaleString()} MMK
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Payment Verification / Slip Box (5 cols) */}
                        <div className="lg:col-span-5 flex flex-col justify-between space-y-3 bg-[#13121D] border border-white/10 rounded-xl p-4 shadow-xs">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-blue-500" />
                                <span>{lang === 'my' ? 'ငွေလွှဲပြေစာ အချက်အလက်' : 'Payment Slip Details'}</span>
                              </span>
                              {order.paymentSlipUploadedAt && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(order.paymentSlipUploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>

                            {/* Slip Image Thumbnail */}
                            {order.paymentSlipUrl ? (
                              <div className="space-y-2">
                                <div className="relative group w-full h-44 bg-[#1A1829] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
                                  <img
                                    src={order.paymentSlipUrl.startsWith('/api/public/orders/') ? (order.paymentSlipUrl.includes('token=') ? order.paymentSlipUrl : `${order.paymentSlipUrl}${order.paymentSlipUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(localStorage.getItem('myanmar_seller_token') || '')}`) : order.paymentSlipUrl}
                                    alt="Payment Slip"
                                    className="w-full h-full object-contain cursor-pointer"
                                    onClick={() => {
                                      const fullUrl = order.paymentSlipUrl!.startsWith('/api/public/orders/')
                                        ? (order.paymentSlipUrl!.includes('token=') ? order.paymentSlipUrl! : `${order.paymentSlipUrl!}${order.paymentSlipUrl!.includes('?') ? '&' : '?'}token=${encodeURIComponent(localStorage.getItem('myanmar_seller_token') || '')}`)
                                        : order.paymentSlipUrl!;
                                      setPreviewSlipUrl(fullUrl);
                                    }}
                                  />
                                  <div
                                    onClick={() => {
                                      const fullUrl = order.paymentSlipUrl!.startsWith('/api/public/orders/')
                                        ? (order.paymentSlipUrl!.includes('token=') ? order.paymentSlipUrl! : `${order.paymentSlipUrl!}${order.paymentSlipUrl!.includes('?') ? '&' : '?'}token=${encodeURIComponent(localStorage.getItem('myanmar_seller_token') || '')}`)
                                        : order.paymentSlipUrl!;
                                      setPreviewSlipUrl(fullUrl);
                                    }}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 cursor-pointer font-semibold text-xs"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span>{lang === 'my' ? 'စလစ် အကြီးကြည့်မည်' : 'Enlarge Slip'}</span>
                                  </div>
                                </div>

                                {order.transactionRef && (
                                  <div className="bg-[#1A1829] border border-white/10 rounded-lg p-2 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500">KBZPay Ref / Trx ID:</span>
                                    <span className="font-mono font-bold text-slate-100">{order.transactionRef}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-32 bg-[#1A1829] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                                <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                                <span className="text-[11px]">
                                  {lang === 'my' ? 'ဖောက်သည်ထံမှ စလစ်မတင်ရသေးပါ' : 'Customer has not submitted a payment slip yet.'}
                                </span>
                              </div>
                            )}

                            {/* Rejection Alert Box */}
                            {isRejected && order.rejectionReason && (
                              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1 text-rose-900">
                                <div className="flex items-center gap-1 font-bold text-[11px] text-rose-800">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>{lang === 'my' ? 'ငြင်းပယ်ရသည့် အကြောင်းပြချက်' : 'Rejection Reason'}:</span>
                                </div>
                                <p className="text-[11px] font-medium leading-relaxed">"{order.rejectionReason}"</p>
                                {order.rejectedAt && (
                                  <span className="text-[10px] text-rose-600 font-mono block">
                                    {new Date(order.rejectedAt).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Verification Actions */}
                          <div className="pt-3 border-t border-slate-100 flex items-center gap-2 justify-end">
                            {!isConfirmed ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectModalOrder(order);
                                    setRejectionReasonText('');
                                    setRejectionError(null);
                                  }}
                                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>{lang === 'my' ? 'စလစ် ငြင်းပယ်မည်' : 'Reject Slip'}</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={confirmingId === order.id}
                                  onClick={() => handleConfirmOrderPayment(order.id)}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{confirmingId === order.id ? (lang === 'my' ? 'အတည်ပြုနေသည်...' : 'Confirming...') : (lang === 'my' ? 'ငွေလက်ခံ အတည်ပြုမည်' : 'Approve Payment')}</span>
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>{lang === 'my' ? 'စစ်ဆေးအတည်ပြုပြီး' : 'Verified & Approved'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>
      )}

      {/* Section 4: Connected Channels */}
      {activeSection === 'channels' && (
        <section aria-label="Connected Channels" className="bg-[#13121D] border border-white/10 rounded-2xl p-5 shadow-[0_15px_35px_rgba(0,0,0,0.5)] space-y-4">
          <div className="border-b border-white/15 pb-3">
            <h3 className="text-base font-bold text-slate-100">
              {lang === 'my' ? 'ချိတ်ဆက်ထားသော လူမှုကွန်ရက် ချန်နယ်များ' : 'Social Channels Integration'}
            </h3>
            <p className="text-xs text-slate-400/80">
              {lang === 'my' ? 'Facebook Messenger, TikTok စသည်တို့၏ စစ်မှန်သော ချိတ်ဆက်မှု အခြေအနေ' : 'Truthful status of official social platform integrations.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            {/* Facebook Messenger */}
            <div className="bg-[#11110D] border border-[#393426] rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400/80">Facebook Messenger</span>
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
                <span className="text-[10px] uppercase font-bold text-slate-400/80">TikTok</span>
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
                <span className="text-[10px] uppercase font-bold text-slate-400/80">Google OAuth</span>
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
        <section aria-label="Account and Security" className="bg-[#13121D] border border-white/10 rounded-2xl p-5 shadow-[0_15px_35px_rgba(0,0,0,0.5)] space-y-4 text-xs">
          <div className="border-b border-white/15 pb-3">
            <h3 className="text-base font-bold text-slate-100">
              {lang === 'my' ? 'အကောင့်နှင့် လုံခြုံရေး' : 'Account & Security Details'}
            </h3>
            <p className="text-slate-400">
              {lang === 'my' ? 'လော့ဂ်အင်ဝင်ထားသော ကုန်သည်အကောင့် အချက်အလက်' : 'Currently authenticated merchant administrator details.'}
            </p>
          </div>

          <div className="bg-[#1A1829] border border-white/15 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{lang === 'my' ? 'ကုန်သည် အမည်' : 'Name'}:</span>
              <span className="font-bold text-slate-100">{user?.name || user?.displayName || 'Merchant Admin'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{lang === 'my' ? 'အီးမေးလ်' : 'Email'}:</span>
              <span className="font-mono text-slate-100">{user?.email || 'aung@yangonstyle.mm'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400/80">{lang === 'my' ? 'တာဝန် / Role' : 'Role'}:</span>
              <span className="text-[#C9A227] font-semibold">{user?.role || 'merchant_admin'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400/80">{lang === 'my' ? 'ဆာဗာ တိုကင်' : 'Token'}:</span>
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
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-[#1A1829]/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl w-full max-w-lg p-6 space-y-4 text-xs shadow-[0_20px_50px_rgba(15,23,42,0.15)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                {editingSample
                  ? (lang === 'my' ? 'နမူနာ ဖြေကြားချက် ပြင်ဆင်ရန်' : 'Edit Sample Reply')
                  : (lang === 'my' ? 'နမူနာ ဖြေကြားချက် အသစ်ထည့်ရန်' : 'Add New Sample Reply')}
              </h3>
              <button
                type="button"
                onClick={() => setIsSampleModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSample} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5 text-xs">
                  {lang === 'my' ? 'အမျိုးအစား (Category)' : 'Category'}
                </label>
                <input
                  type="text"
                  value={sampleForm.category}
                  onChange={(e) => setSampleForm({ ...sampleForm, category: e.target.value })}
                  placeholder="Stock and variants, Pricing, Shipping..."
                  className="w-full bg-[#1A1829] border border-slate-200 focus:bg-[#1A1829] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 rounded-xl px-3.5 py-2.5 text-slate-100 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5 text-xs">
                  {lang === 'my' ? 'ဖောက်သည်၏ မေးခွန်း (Customer Query)' : 'Customer Query'} *
                </label>
                <input
                  type="text"
                  required
                  value={sampleForm.customerMessage}
                  onChange={(e) => setSampleForm({ ...sampleForm, customerMessage: e.target.value })}
                  placeholder="e.g. Size L ရှိသေးလားရှင်..."
                  className="w-full bg-[#1A1829] border border-slate-200 focus:bg-[#1A1829] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 rounded-xl px-3.5 py-2.5 text-slate-100 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5 text-xs">
                  {lang === 'my' ? 'နှစ်သက်သော တုံ့ပြန်ပုံ (Preferred Reply)' : 'Preferred Reply'} *
                </label>
                <textarea
                  rows={3}
                  required
                  value={sampleForm.preferredReply}
                  onChange={(e) => setSampleForm({ ...sampleForm, preferredReply: e.target.value })}
                  placeholder="e.g. ဟုတ်ကဲ့ရှင် Size L လက်ကျန် ၃ ထည်ရှိပါတယ်..."
                  className="w-full bg-[#1A1829] border border-slate-200 focus:bg-[#1A1829] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 rounded-xl p-3 text-slate-100 focus:outline-none leading-relaxed transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSampleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
                >
                  {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingSample}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 hover:from-indigo-500 hover:to-violet-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-500/20 transition-all"
                >
                  {savingSample ? (lang === 'my' ? 'သိမ်းဆည်းနေသည်...' : 'Saving...') : (lang === 'my' ? 'သိမ်းမည်' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal with Mandatory Reason & Template Chips */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl w-full max-w-md p-6 space-y-4 text-xs shadow-[0_25px_60px_rgba(0,0,0,0.8)] text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>{lang === 'my' ? 'ငွေလွှဲစလစ် ငြင်းပယ်ရန်' : 'Reject Payment Slip'}</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="p-1.5 hover:bg-[#1A1829]/10 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#1A1829]/[0.04] border border-white/10 rounded-2xl p-3.5 space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>{lang === 'my' ? 'အော်ဒါ အမှတ်' : 'Order'}:</span>
                <span className="font-bold text-white">#{rejectModalOrder.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{lang === 'my' ? 'ဖောက်သည်' : 'Customer'}:</span>
                <span className="font-semibold text-white">{rejectModalOrder.customerName} ({rejectModalOrder.customerPhone})</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{lang === 'my' ? 'ကျသင့်ငွေ' : 'Amount'}:</span>
                <span className="font-bold text-purple-300">{rejectModalOrder.totalAmount.toLocaleString()} MMK</span>
              </div>
            </div>

            {rejectionError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-medium">
                {rejectionError}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-slate-300 font-bold">
                {lang === 'my' ? 'ငြင်းပယ်ရသည့် အကြောင်းပြချက် (မဖြစ်မနေ ဖြည့်ပါ) *' : 'Rejection Reason (Required) *'}
              </label>

              {/* Quick Template Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  lang === 'my' ? 'ငွေလက်ခံ မရရှိသေးပါ' : 'Payment not received in account',
                  lang === 'my' ? 'ပြေစာ ပုံရိပ် မရှင်းလင်းပါ/မပြည့်စုံပါ' : 'Slip image is blurry or cropped',
                  lang === 'my' ? 'လွှဲငွေ ပမာဏ မကိုက်ညီပါ' : 'Amount does not match total',
                  lang === 'my' ? 'အခြားအော်ဒါ၏ စလစ်ဟောင်းဖြစ်နေပါ' : 'Duplicate or old slip detected'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setRejectionReasonText(chip)}
                    className="px-2.5 py-1 bg-[#1A1829]/[0.05] hover:bg-[#1A1829]/[0.1] text-slate-300 hover:text-white rounded-lg text-[11px] font-medium transition-colors cursor-pointer border border-white/10"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                required
                placeholder={lang === 'my' ? 'ဖောက်သည် သိရှိစေရန် အကြောင်းပြချက်ကို ရှင်းလင်းစွာ ရေးသားပါ...' : 'Explain clearly why the slip was rejected...'}
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                className="w-full bg-[#1A1829]/[0.04] border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-all resize-none"
              />
              <span className="text-[11px] text-slate-400 block leading-relaxed">
                {lang === 'my' ? 'ဤအကြောင်းပြချက်ကို ဖောက်သည်၏ စစ်ဆေးမှု စာမျက်နှာတွင် ဖော်ပြပေးမည်ဖြစ်ပြီး စလစ်အသစ် ပြန်တင်ခွင့်ရပါမည်။' : 'Customer will see this reason on their order tracking page and can resubmit a valid slip.'}
              </span>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2 bg-[#1A1829]/[0.05] hover:bg-[#1A1829]/[0.1] text-slate-300 font-bold rounded-xl cursor-pointer transition-colors"
              >
                {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!rejectionReasonText.trim() || submittingRejection}
                onClick={handleConfirmRejectOrder}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all"
              >
                <X className="w-4 h-4" />
                <span>{submittingRejection ? (lang === 'my' ? 'ငြင်းပယ်နေသည်...' : 'Rejecting...') : (lang === 'my' ? 'အတည်ပြု ငြင်းပယ်မည်' : 'Confirm Rejection')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slip / Image Zoom Preview Modal */}
      {previewSlipUrl && (
        <div
          onClick={() => setPreviewSlipUrl(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4 cursor-zoom-out transition-all duration-300"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[90vh] bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col items-center p-3 animate-in fade-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setPreviewSlipUrl(null)}
              className="absolute top-4 right-4 p-2 bg-[#1A1829]/10 hover:bg-[#1A1829]/20 text-white rounded-full cursor-pointer z-10 transition-colors shadow-md"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewSlipUrl}
              alt="Enlarged Preview"
              className="max-w-full max-h-[82vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
