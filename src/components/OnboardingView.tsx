import React, { useState } from 'react';
import { Store, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2, Building, Phone, FileText, DollarSign, Globe } from 'lucide-react';
import { StoreSettings } from '../types';

interface OnboardingViewProps {
  user: any;
  lang: 'my' | 'en';
  onCompleteOnboarding: (onboardingData: {
    storeName: string;
    slug: string;
    ownerName: string;
    phone: string;
    description: string;
    deliveryInfo: string;
    paymentInstructions: string;
    isPublished: boolean;
  }) => Promise<void>;
  onLogout: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  user,
  lang,
  onCompleteOnboarding,
  onLogout,
}) => {
  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerName, setOwnerName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState('ရန်ကုန်မြို့တွင်း ပို့ခ 2,500 ကျပ်၊ ၂-၃ ရက်အတွင်း ပို့ဆောင်ပေးပါသည်။');
  const [paymentInstructions, setPaymentInstructions] = useState('KBZPay: 09-XXXXXXXXX\nWavePay: 09-XXXXXXXXX');
  const [isPublished, setIsPublished] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from store name
  const handleStoreNameChange = (val: string) => {
    setStoreName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!storeName.trim() || !slug.trim()) {
      setError(lang === 'my' ? 'ဆိုင်နာမည်နှင့် စတိုးလိပ်စာ (Slug) ထည့်သွင်းရန် လိုအပ်ပါသည်။' : 'Store name and unique public slug are required.');
      return;
    }

    setLoading(true);
    try {
      await onCompleteOnboarding({
        storeName: storeName.trim(),
        slug: slug.trim().toLowerCase(),
        ownerName: ownerName.trim() || 'Merchant Owner',
        phone: phone.trim(),
        description: description.trim(),
        deliveryInfo: deliveryInfo.trim(),
        paymentInstructions: paymentInstructions.trim(),
        isPublished,
      });
    } catch (err: any) {
      setError(err.message || (lang === 'my' ? 'ဆိုင်ဖန်တီးမှု မအောင်မြင်ပါ။' : 'Failed to create merchant shop.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-xl bg-white border border-[#CBD5E1] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-white border border-blue-200 rounded-2xl flex items-center justify-center mx-auto overflow-hidden shadow-sm">
            <img
              src="/assets/aistudio/1792178753519_42de44bf.jpg"
              alt="ShopSone"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
            {lang === 'my' ? 'ShopSone တွင် သင့်ဆိုင်အသစ် ဖွင့်လှစ်ပါ' : 'Open Your Shop on ShopSone'}
          </h1>
          <p className="text-xs text-[#475569] max-w-md mx-auto">
            {lang === 'my'
              ? 'သင့်စတိုးဆိုင်ကို ShopSone (ဆိုင်စုံ) မာကတ်ပလေ့စ်တွင် ပုံဖော်ရန် အချက်အလက်များ ဖြည့်သွင်းပါ။'
              : 'Configure your merchant profile and unique storefront slug to launch your store on ShopSone.'}
          </p>
          <div className="pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#2563EB] text-[11px] font-medium rounded-full border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{user?.email || 'Authenticated User'}</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-[#B91C1C] space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{lang === 'my' ? 'အမှားအယွင်းရှိပါသည်' : 'Onboarding Error'}</span>
            </div>
            <p className="text-[11px] leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Store Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0F172A]">
                {lang === 'my' ? 'စတိုးဆိုင်နာမည် (Store Name) *' : 'Store Name *'}
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => handleStoreNameChange(e.target.value)}
                placeholder={lang === 'my' ? 'ဥပမာ - ရန်ကုန်ဖက်ရှင်' : 'e.g. Yangon Style Fashion'}
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* Unique Slug */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0F172A]">
                {lang === 'my' ? 'စတိုးလိပ်စာအတို (Store Slug) *' : 'Unique Store Slug *'}
              </label>
              <div className="flex items-center bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl overflow-hidden focus-within:border-[#2563EB]">
                <span className="pl-3 text-[11px] text-[#64748B] select-none">/store/</span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="yangon-style"
                  className="w-full px-2 py-2.5 bg-transparent text-xs text-[#0F172A] focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Owner Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0F172A]">
                {lang === 'my' ? 'ပိုင်ရှင်အမည် (Owner Name)' : 'Owner Name'}
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Ko Aung"
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0F172A]">
                {lang === 'my' ? 'ဆက်သွယ်ရန် ဖုန်းနံပါတ်' : 'Contact Phone'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09-912345678"
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0F172A]">
              {lang === 'my' ? 'စတိုးဆိုင်အကြောင်း (Description)' : 'Store Description'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={lang === 'my' ? 'သင်၏ စတိုးဆိုင်နှင့် ကုန်ပစ္စည်းများအကြောင်း တိုတိုရှင်းရှင်း ဖော်ပြပါ...' : 'Brief description of your shop and products...'}
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Delivery Info */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0F172A]">
                {lang === 'my' ? 'ပို့ဆောင်မှု အချက်အလက် (Delivery Info)' : 'Delivery Information'}
              </label>
              <textarea
                rows={2}
                value={deliveryInfo}
                onChange={(e) => setDeliveryInfo(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* Payment Instructions */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0F172A]">
                {lang === 'my' ? 'ငွေပေးချေရန် လမ်းညွှန် (Payment Instructions)' : 'Payment Instructions'}
              </label>
              <textarea
                rows={2}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Publish Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPublished"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]"
            />
            <label htmlFor="isPublished" className="text-xs font-medium text-[#0F172A] cursor-pointer">
              {lang === 'my' ? 'ShopSone မာကတ်ပလေ့စ်တွင် ချက်ချင်းထုတ်ဝေမည် (Publish Store)' : 'Publish store immediately in ShopSone Marketplace'}
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              {lang === 'my' ? 'ထွက်ရန် (Logout)' : 'Sign Out'}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              <span>{loading ? (lang === 'my' ? 'ဆိုင်ဖန်တီးနေသည်...' : 'Creating Shop...') : (lang === 'my' ? 'ဆိုင်စတင်ဖွင့်လှစ်မည် (Launch Store)' : 'Launch Store & Open Dashboard')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
