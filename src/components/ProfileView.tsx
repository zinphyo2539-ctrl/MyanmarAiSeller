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
  Globe
} from 'lucide-react';
import { StoreSettings, Order, ProviderStatus } from '../types';

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
  initialTab
}) => {
  const [activeSection, setActiveSection] = useState<'store' | 'payments' | 'channels' | 'account'>(
    initialTab === 'payments' ? 'payments' : 'store'
  );

  // Store profile form
  const [storeName, setStoreName] = useState(store?.storeName || '');
  const [description, setDescription] = useState(store?.description || '');
  const [deliveryInfo, setDeliveryInfo] = useState(store?.deliveryInfo || '');
  const [paymentInstructions, setPaymentInstructions] = useState(store?.paymentInstructions || '');
  const [isPublished, setIsPublished] = useState(store?.isPublished ?? true);
  const [savingStore, setSavingStore] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Profile Section Switcher */}
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
                <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-[#65B985]' : 'bg-[#E06B61]'}`} />
                <span>{isPublished ? (lang === 'my' ? 'ဖွင့်လှစ်ထားသည် (LIVE)' : 'Publicly Live') : (lang === 'my' ? 'ပိတ်ထားသည် (Draft)' : 'Unpublished')}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicStoreUrl}
                className="flex-1 bg-[#FFFFFF] border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#2563EB] font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyStoreUrl}
                className="px-3 py-1.5 bg-[#F8FAFC] hover:bg-[#CBD5E1] border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:text-[#2563EB] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedUrl ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span className="text-[#16A34A]">{lang === 'my' ? 'ကူးပြီးပါပြီ' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{lang === 'my' ? 'လင့်ခ် ကူးမည်' : 'Copy Link'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveStore} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#475569] font-semibold mb-1">
                  {lang === 'my' ? 'စတိုးအမည်' : 'Store Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#475569] font-semibold mb-1">
                  {lang === 'my' ? 'စတိုးလိပ်စာခွဲ (Store Slug)' : 'Store Slug'}
                </label>
                <input
                  type="text"
                  disabled
                  value={store?.slug || 'yangon-style'}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#64748B] font-mono cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#475569] font-semibold mb-1">
                {lang === 'my' ? 'စတိုးဖော်ပြချက်' : 'Store Description'}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl p-3 text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#475569] font-semibold mb-1">
                {lang === 'my' ? 'ပို့ဆောင်မှု အချက်အလက် (Delivery Policy)' : 'Delivery Policy & Fees'}
              </label>
              <textarea
                rows={2}
                value={deliveryInfo}
                onChange={(e) => setDeliveryInfo(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl p-3 text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#475569] font-semibold mb-1">
                {lang === 'my' ? 'ငွေပေးချေမှု လမ်းညွှန် (Payment Instructions - KBZPay, WavePay)' : 'Payment Instructions (KBZPay, WavePay Numbers)'}
              </label>
              <textarea
                rows={2}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl p-3 text-[#0F172A] focus:border-[#2563EB] focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#CBD5E1]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded text-[#2563EB] focus:ring-0"
                />
                <span className="text-xs text-[#475569] font-medium">
                  {lang === 'my' ? 'Public စတိုးကို လူအများ ကြည့်ရှုနိုင်ရန် ဖွင့်ထားမည်' : 'Publish Storefront to Public'}
                </span>
              </label>

              <button
                type="submit"
                disabled={savingStore}
                className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingStore ? (lang === 'my' ? 'သိမ်းဆည်းနေသည်...' : 'Saving...') : (lang === 'my' ? 'စတိုးအချက်အလက် သိမ်းမည်' : 'Save Store Profile')}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Section 2: Orders and Human Payment Verification */}
      {activeSection === 'payments' && (
        <section aria-label="Orders and Payment Verification" className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-2xl p-5 space-y-4">
          <div className="border-b border-[#CBD5E1] pb-3">
            <h3 className="text-base font-bold text-[#0F172A]">
              {lang === 'my' ? 'အော်ဒါများနှင့် ငွေပေးချေမှု အတည်ပြုခြင်း' : 'Authoritative Orders & Payment Verification'}
            </h3>
            <p className="text-xs text-[#64748B]">
              {lang === 'my'
                ? 'လုံခြုံရေးစည်းမျဉ်း- ငွေပေးချေမှုကို တာဝန်ရှိ လူကိုယ်တိုင်သာ စစ်ဆေးအတည်ပြုနိုင်ပါသည်။ AI မှ အလိုအလျောက် အတည်မပြုပါ။'
                : 'Security Invariant: Payments must be verified by authorized human staff. AI is blocked from confirming payments.'}
            </p>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#64748B] space-y-2">
              <ShoppingBag className="w-10 h-10 text-[#CBD5E1] mx-auto" />
              <p className="text-sm font-semibold text-[#0F172A]">
                {lang === 'my' ? 'အရောင်းမှတ်တမ်း မရှိသေးပါ (No sales records yet)' : 'Sales History: No sales records yet'}
              </p>
              <p className="text-[11px] text-[#64748B]">
                {lang === 'my' ? 'လတ်တလော အရောင်းလှုပ်ရှားမှု မရှိသေးပါ' : 'Recent Sales: No sales activity yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#CBD5E1]">
              {orders.map((order) => {
                const isConfirmed = order.paymentStatus === 'CONFIRMED';
                return (
                  <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#0F172A]">
                          {order.id}
                        </span>
                        <span className="text-[#64748B]">·</span>
                        <span className="font-semibold text-[#475569]">
                          {order.customerName} ({order.customerPhone})
                        </span>
                      </div>

                      <div className="text-[11px] text-[#64748B] space-y-0.5">
                        <p>
                          Items:{' '}
                          {(order.items || []).map(i => `${i.name} (${i.variant}) x${i.qty}`).join(', ')}
                        </p>
                        <p>Address: {order.shippingAddress} · Method: {order.paymentMethod}</p>
                        <p className="font-mono">
                          Date: {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {isConfirmed && order.confirmedAt && (
                        <div className="text-[10px] text-[#16A34A] font-mono pt-0.5">
                          ✓ Verified by {order.confirmedBy || 'Authorized Staff'} at {new Date(order.confirmedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono tabular-nums text-[#0F172A]">
                          {order.totalAmount.toLocaleString()} MMK
                        </span>
                        <div className="text-[11px] font-semibold mt-0.5">
                          {isConfirmed ? (
                            <span className="text-[#16A34A] flex items-center gap-1 justify-end">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{lang === 'my' ? 'ငွေလွှဲအတည်ပြုပြီး' : 'CONFIRMED'}</span>
                            </span>
                          ) : (
                            <span className="text-[#D97706] flex items-center gap-1 justify-end">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{lang === 'my' ? 'စိစစ်ရန်ကျန်' : 'PENDING VERIFICATION'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {!isConfirmed && (
                        <button
                          type="button"
                          disabled={confirmingId === order.id}
                          onClick={() => handleConfirmOrderPayment(order.id)}
                          className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
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

      {/* Section 3: Connected Channels */}
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

      {/* Section 4: Account Security & Logout */}
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
    </div>
  );
};
