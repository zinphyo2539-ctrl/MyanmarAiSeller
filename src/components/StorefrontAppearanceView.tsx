import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Palette,
  Image as ImageIcon,
  Type,
  Layout,
  Layers,
  ShoppingBag,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  Upload,
  Trash2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Undo2,
  Save,
  Send,
  Check,
  ChevronDown,
  ChevronUp,
  MoveUp,
  MoveDown,
  Info
} from 'lucide-react';
import { StoreSettings, StorefrontThemeConfig, Product } from '../types';
import { CustomerStorefrontView } from './CustomerStorefrontView';

interface StorefrontAppearanceViewProps {
  store: StoreSettings | null;
  products: Product[];
  lang: 'my' | 'en';
  onStoreUpdated?: (updatedStore: StoreSettings) => void;
  onOpenLiveStore?: () => void;
}

const PRESET_PALETTES = [
  {
    name: 'SHOPSONE Royal Gold',
    primary: '#C9A227',
    secondary: '#393426',
    accent: '#E0BD55',
    surface: '#181810',
    bg: '#0B0B09',
    heading: '#FFFFFF',
    body: '#B9B5A7',
    border: 'rgba(255, 255, 255, 0.08)'
  },
  {
    name: 'Cyber Violet Neon',
    primary: '#8B5CF6',
    secondary: '#4F46E5',
    accent: '#EC4899',
    surface: '#0F172A',
    bg: '#020617',
    heading: '#FFFFFF',
    body: '#94A3B8',
    border: 'rgba(255, 255, 255, 0.1)'
  },
  {
    name: 'Emerald Luxe',
    primary: '#10B981',
    secondary: '#065F46',
    accent: '#34D399',
    surface: '#064E3B',
    bg: '#022C22',
    heading: '#F0FDF4',
    body: '#A7F3D0',
    border: 'rgba(16, 185, 129, 0.2)'
  },
  {
    name: 'Minimal Monolith',
    primary: '#E2E8F0',
    secondary: '#334155',
    accent: '#38BDF8',
    surface: '#1E293B',
    bg: '#0F172A',
    heading: '#F8FAFC',
    body: '#94A3B8',
    border: 'rgba(255, 255, 255, 0.1)'
  },
  {
    name: 'Rose Champagne',
    primary: '#F43F5E',
    secondary: '#881337',
    accent: '#FB7185',
    surface: '#271017',
    bg: '#140508',
    heading: '#FFF1F2',
    body: '#FECDD3',
    border: 'rgba(244, 63, 94, 0.2)'
  }
];

const HEADING_FONTS = [
  'Plus Jakarta Sans',
  'Outfit',
  'Playfair Display',
  'DM Sans',
  'Space Grotesk',
  'Cinzel'
] as const;

const BODY_FONTS = [
  'Plus Jakarta Sans',
  'DM Sans',
  'Manrope',
  'Source Serif 4',
  'Public Sans'
] as const;

export const StorefrontAppearanceView: React.FC<StorefrontAppearanceViewProps> = ({
  store,
  products,
  lang,
  onStoreUpdated,
  onOpenLiveStore
}) => {
  const [activeTab, setActiveTab] = useState<
    'brand' | 'background' | 'typography' | 'header' | 'sections' | 'products' | 'footer'
  >('brand');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewMode, setPreviewMode] = useState<'draft' | 'published'>('draft');

  const [publishedTheme, setPublishedTheme] = useState<StorefrontThemeConfig | null>(null);
  const [draftTheme, setDraftTheme] = useState<StorefrontThemeConfig | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);

  const [bannerNotice, setBannerNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Fetch authoritatively from backend
  const fetchTheme = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('myanmar_seller_token');
      const res = await fetch('/api/merchant/storefront/theme', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        throw new Error('Failed to load storefront theme configuration.');
      }
      const data = await res.json();
      setPublishedTheme(data.published);
      setDraftTheme(data.draft);
      setHasUnpublishedChanges(data.hasUnpublishedChanges);
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err.message || 'Error loading appearance settings.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTheme();
  }, []);

  // Handle draft field mutation
  const updateDraft = (updater: (prev: StorefrontThemeConfig) => StorefrontThemeConfig) => {
    if (!draftTheme) return;
    const updated = updater({ ...draftTheme });
    setDraftTheme(updated);
    setHasUnpublishedChanges(true);
  };

  // Save Draft (does NOT affect customer storefront)
  const handleSaveDraft = async () => {
    if (!draftTheme) return;
    setSavingDraft(true);
    setBannerNotice(null);
    try {
      const token = localStorage.getItem('myanmar_seller_token');
      const res = await fetch('/api/merchant/storefront/theme/draft', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(draftTheme)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save draft.');
      }
      const data = await res.json();
      setDraftTheme(data.draft);
      setBannerNotice({
        type: 'success',
        message:
          lang === 'my'
            ? 'စတိုးမူကြမ်းကို သိမ်းဆည်းပြီးပါပြီ (ဖောက်သည်များသို့ မထုတ်ဝေရသေးပါ)'
            : 'Draft saved successfully (not yet visible on live storefront).'
      });
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err.message || 'Failed to save draft.'
      });
    } finally {
      setSavingDraft(false);
    }
  };

  // Publish to Live Storefront
  const handlePublish = async () => {
    if (!draftTheme) return;
    setPublishing(true);
    setBannerNotice(null);
    try {
      // Auto-save current draft first
      const token = localStorage.getItem('myanmar_seller_token');
      await fetch('/api/merchant/storefront/theme/draft', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(draftTheme)
      });

      const res = await fetch('/api/merchant/storefront/theme/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to publish storefront.');
      }
      const data = await res.json();
      setPublishedTheme(data.published);
      setDraftTheme(data.published);
      setHasUnpublishedChanges(false);

      if (onStoreUpdated && store) {
        onStoreUpdated({
          ...store,
          themeConfig: data.published,
          draftThemeConfig: data.published,
          logoUrl: data.published.brand.logoUrl || store.logoUrl,
          storeName: data.published.brand.storeName || store.storeName
        });
      }

      setBannerNotice({
        type: 'success',
        message:
          lang === 'my'
            ? 'စတိုးဒီဇိုင်း အသစ်ကို တိုက်ရိုက်ထုတ်ဝေပြီးပါပြီ!'
            : 'Storefront theme has been successfully published to customers!'
      });
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err.message || 'Failed to publish storefront.'
      });
    } finally {
      setPublishing(false);
    }
  };

  // Revert draft changes back to current published version
  const handleRevert = async () => {
    if (!publishedTheme) return;
    setReverting(true);
    setBannerNotice(null);
    try {
      const token = localStorage.getItem('myanmar_seller_token');
      const res = await fetch('/api/merchant/storefront/theme/revert', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to revert draft.');
      }
      const data = await res.json();
      setDraftTheme(data.draft);
      setHasUnpublishedChanges(false);
      setBannerNotice({
        type: 'info',
        message:
          lang === 'my'
            ? 'လက်ရှိထုတ်ဝေထားသော ဒီဇိုင်းသို့ ပြန်လည်သတ်မှတ်ပြီးပါပြီ'
            : 'Reverted draft to currently published storefront design.'
      });
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err.message || 'Failed to revert draft.'
      });
    } finally {
      setReverting(false);
    }
  };

  // Asset upload helper
  const handleUploadAsset = async (
    e: React.ChangeEvent<HTMLInputElement>,
    assetType: 'logo' | 'favicon' | 'background' | 'hero' | 'banner',
    targetField: 'brand.logoUrl' | 'brand.faviconUrl' | 'background.storeBgImage' | 'background.heroBgImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAsset(targetField);
    setBannerNotice(null);
    try {
      const formData = new FormData();
      formData.append('asset', file);
      formData.append('assetType', assetType);

      const token = localStorage.getItem('myanmar_seller_token');
      const res = await fetch('/api/merchant/upload-storefront-asset', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed.');
      }

      const data = await res.json();
      const uploadedUrl = data.assetUrl;

      updateDraft((prev) => {
        const next = { ...prev };
        if (targetField === 'brand.logoUrl') {
          next.brand = { ...next.brand, logoUrl: uploadedUrl };
        } else if (targetField === 'brand.faviconUrl') {
          next.brand = { ...next.brand, faviconUrl: uploadedUrl };
        } else if (targetField === 'background.storeBgImage') {
          next.background = { ...next.background, storeBgImage: uploadedUrl };
        } else if (targetField === 'background.heroBgImage') {
          next.background = { ...next.background, heroBgImage: uploadedUrl };
        }
        return next;
      });

      setBannerNotice({
        type: 'success',
        message:
          lang === 'my'
            ? 'ဓာတ်ပုံ အောင်မြင်စွာ တင်ပြီးပါပြီ'
            : 'Image asset uploaded successfully.'
      });
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: err.message || 'Image upload failed.'
      });
    } finally {
      setUploadingAsset(null);
    }
  };

  // Apply a curated color palette preset
  const applyPalette = (palette: (typeof PRESET_PALETTES)[0]) => {
    updateDraft((prev) => ({
      ...prev,
      brand: {
        ...prev.brand,
        primaryColor: palette.primary,
        secondaryColor: palette.secondary,
        accentColor: palette.accent,
        surfaceColor: palette.surface,
        headingTextColor: palette.heading,
        bodyTextColor: palette.body,
        surfaceBorderColor: palette.border
      },
      background: {
        ...prev.background,
        storeBgColor: palette.bg
      },
      buttons: {
        ...prev.buttons,
        buttonPrimaryBg: palette.primary,
        buttonPrimaryText: palette.bg === '#0B0B09' || palette.bg === '#020617' ? '#0B0B09' : '#FFFFFF'
      }
    }));
  };

  if (loading && !draftTheme) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#C9A227] animate-spin" />
        <p className="text-xs text-[#B9B5A7] font-mono">
          {lang === 'my' ? 'စတိုးဒီဇိုင်း ဆက်တင်များ ရယူနေပါသည်...' : 'Loading appearance customizer...'}
        </p>
      </div>
    );
  }

  if (!draftTheme) return null;

  const currentPreviewTheme = previewMode === 'draft' ? draftTheme : publishedTheme || draftTheme;

  return (
    <div className="space-y-5">
      {/* Top Action & Status Control Bar */}
      <div className="bg-[#181810] border border-[#393426] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C9A227] to-[#E0BD55] flex items-center justify-center text-[#0B0B09] font-bold shadow-md shadow-[#C9A227]/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F5F2E8] flex items-center gap-2">
                <span>{lang === 'my' ? 'စတိုး ဒီဇိုင်း ပြင်ဆင်မှု Studio' : 'Storefront Appearance Studio'}</span>
                {hasUnpublishedChanges ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {lang === 'my' ? 'မထုတ်ဝေရသေးသော မူကြမ်းရှိသည်' : 'Unpublished Draft'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{lang === 'my' ? 'တိုက်ရိုက်စတိုးနှင့် တူညီသည်' : 'Live Synced'}</span>
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#B9B5A7] mt-0.5">
                {lang === 'my'
                  ? 'သင့်လုပ်ငန်း Brand Identity နှင့်အညီ စတိုးအရောင်၊ ဖောင့်၊ ဓာတ်ပုံများနှင့် အစီအစဉ်များကို စိတ်ကြိုက်ပြင်ဆင်ပါ'
                  : 'Customize your public storefront colors, typography, layout, and branding.'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          {hasUnpublishedChanges && (
            <button
              type="button"
              onClick={handleRevert}
              disabled={reverting || publishing || savingDraft}
              className="px-3.5 py-2 rounded-xl border border-[#393426] bg-[#0B0B09] hover:bg-white/[0.05] text-[#B9B5A7] hover:text-[#F5F2E8] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Undo2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{lang === 'my' ? 'မူလအတိုင်း ပြန်ထားမည်' : 'Revert Draft'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || publishing}
            className="px-4 py-2 rounded-xl border border-[#393426] bg-[#22211A] hover:bg-[#2B2920] text-[#F5F2E8] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {savingDraft ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-[#C9A227]" />}
            <span>{savingDraft ? (lang === 'my' ? 'သိမ်းနေသည်...' : 'Saving...') : lang === 'my' ? 'မူကြမ်းသိမ်းမည်' : 'Save Draft'}</span>
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || savingDraft}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C9A227] to-[#E0BD55] hover:brightness-110 text-[#0B0B09] text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#C9A227]/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {publishing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{publishing ? (lang === 'my' ? 'ထုတ်ဝေနေသည်...' : 'Publishing...') : lang === 'my' ? 'တိုက်ရိုက်စတိုးသို့ ထုတ်ဝေမည်' : 'Publish Live'}</span>
          </button>

          {onOpenLiveStore && (
            <button
              type="button"
              onClick={onOpenLiveStore}
              className="p-2 rounded-xl border border-[#393426] bg-[#0B0B09] hover:bg-white/[0.05] text-[#B9B5A7] hover:text-[#F5F2E8] transition-colors cursor-pointer"
              title={lang === 'my' ? 'တိုက်ရိုက်စတိုးကို ကြည့်ရှုမည်' : 'View Live Store'}
            >
              <ExternalLink className="w-4 h-4 text-[#C9A227]" />
            </button>
          )}
        </div>
      </div>

      {/* Notice Banner */}
      {bannerNotice && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            bannerNotice.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
              : bannerNotice.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
              : 'bg-blue-500/15 border-blue-500/30 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerNotice.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
            {bannerNotice.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
            {bannerNotice.type === 'info' && <Info className="w-4 h-4 shrink-0 text-blue-400" />}
            <span>{bannerNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerNotice(null)}
            className="text-white/60 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Split Interface: Controls on Left, Responsive Device Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Customization Controls (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Navigation Sub-Tabs */}
          <div className="bg-[#181810] border border-[#393426] p-1 rounded-2xl flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'brand', label: lang === 'my' ? 'အမှတ်တံဆိပ်' : 'Brand', icon: Palette },
              { id: 'background', label: lang === 'my' ? 'နောက်ခံ' : 'Background', icon: ImageIcon },
              { id: 'typography', label: lang === 'my' ? 'ဖောင့်' : 'Fonts', icon: Type },
              { id: 'header', label: lang === 'my' ? 'ခေါင်းစဉ်' : 'Header', icon: Layout },
              { id: 'sections', label: lang === 'my' ? 'အပိုင်းများ' : 'Sections', icon: Layers },
              { id: 'products', label: lang === 'my' ? 'ပစ္စည်းပြကွက်' : 'Products', icon: ShoppingBag },
              { id: 'footer', label: lang === 'my' ? 'အောက်ခြေ' : 'Footer', icon: Sliders }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#C9A227] text-[#0B0B09] shadow-sm font-bold'
                      : 'text-[#B9B5A7] hover:text-[#F5F2E8] hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Panel Content Box */}
          <div className="bg-[#181810] border border-[#393426] rounded-2xl p-5 shadow-xl space-y-5">
            {/* 1. BRAND TAB */}
            {activeTab === 'brand' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[#F5F2E8] flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#C9A227]" />
                    <span>{lang === 'my' ? 'အမှတ်တံဆိပ်နှင့် အရောင်များ' : 'Brand Identity & Palette'}</span>
                  </h3>
                  <p className="text-xs text-[#B9B5A7] mt-0.5">
                    {lang === 'my'
                      ? 'လိုဂို၊ ဖန်ဗီကွန်၊ ဆိုင်အမည်နှင့် သင့် Brand အရောင်စုံတွဲများကို ရွေးချယ်ပါ'
                      : 'Set your store logo, name, tagline, and brand color palette.'}
                  </p>
                </div>

                {/* Preset Palettes Quick Pick */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#F5F2E8] block">
                    {lang === 'my' ? 'ဒီဇိုင်း အရောင်စုံတွဲများ (Curated Palettes)' : 'Curated Brand Palettes'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRESET_PALETTES.map((p) => {
                      const isSelected =
                        draftTheme.brand.primaryColor.toLowerCase() === p.primary.toLowerCase();
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => applyPalette(p)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#C9A227] bg-[#C9A227]/10'
                              : 'border-[#393426] bg-[#0B0B09] hover:border-[#C9A227]/50'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#F5F2E8] block truncate">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: p.primary }} />
                              <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: p.secondary }} />
                              <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: p.accent }} />
                              <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: p.surface }} />
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#C9A227] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Logo & Favicon Uploaders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#393426]">
                  {/* Logo */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#F5F2E8] block">
                      {lang === 'my' ? 'ဆိုင် Logo' : 'Store Logo'}
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#0B0B09] border border-[#393426] flex items-center justify-center overflow-hidden shrink-0">
                        {draftTheme.brand.logoUrl ? (
                          <img
                            src={draftTheme.brand.logoUrl}
                            alt="Logo"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-[#8C887B]" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22211A] hover:bg-[#2B2920] border border-[#393426] text-xs font-semibold text-[#F5F2E8] cursor-pointer">
                          {uploadingAsset === 'brand.logoUrl' ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-[#C9A227]" />
                          )}
                          <span>{lang === 'my' ? 'တင်မည်' : 'Upload'}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => handleUploadAsset(e, 'logo', 'brand.logoUrl')}
                          />
                        </label>
                        {draftTheme.brand.logoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft((prev) => ({
                                ...prev,
                                brand: { ...prev.brand, logoUrl: '' }
                              }))
                            }
                            className="block text-[11px] text-rose-400 hover:underline cursor-pointer"
                          >
                            {lang === 'my' ? 'ဖျက်မည်' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Favicon */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#F5F2E8] block">
                      {lang === 'my' ? 'Favicon Icon' : 'Browser Favicon'}
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#0B0B09] border border-[#393426] flex items-center justify-center overflow-hidden shrink-0">
                        {draftTheme.brand.faviconUrl ? (
                          <img
                            src={draftTheme.brand.faviconUrl}
                            alt="Favicon"
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <Sparkles className="w-6 h-6 text-[#8C887B]" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22211A] hover:bg-[#2B2920] border border-[#393426] text-xs font-semibold text-[#F5F2E8] cursor-pointer">
                          {uploadingAsset === 'brand.faviconUrl' ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-[#C9A227]" />
                          )}
                          <span>{lang === 'my' ? 'တင်မည်' : 'Upload'}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => handleUploadAsset(e, 'favicon', 'brand.faviconUrl')}
                          />
                        </label>
                        {draftTheme.brand.faviconUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft((prev) => ({
                                ...prev,
                                brand: { ...prev.brand, faviconUrl: '' }
                              }))
                            }
                            className="block text-[11px] text-rose-400 hover:underline cursor-pointer"
                          >
                            {lang === 'my' ? 'ဖျက်မည်' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Store Name, Tagline & Description */}
                <div className="space-y-3 pt-2 border-t border-[#393426]">
                  <div>
                    <label className="text-xs font-semibold text-[#F5F2E8] block mb-1">
                      {lang === 'my' ? 'စတိုးအမည်' : 'Store Display Name'}
                    </label>
                    <input
                      type="text"
                      value={draftTheme.brand.storeName}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          brand: { ...prev.brand, storeName: e.target.value }
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#F5F2E8] block mb-1">
                      {lang === 'my' ? 'ဆောင်ပုဒ် / Tagline' : 'Brand Tagline'}
                    </label>
                    <input
                      type="text"
                      value={draftTheme.brand.tagline || ''}
                      placeholder="e.g. Modern Everyday Streetwear"
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          brand: { ...prev.brand, tagline: e.target.value }
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#F5F2E8] block mb-1">
                      {lang === 'my' ? 'စတိုးမိတ်ဆက် စာပိုဒ်' : 'Store Description'}
                    </label>
                    <textarea
                      rows={2}
                      value={draftTheme.brand.description}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          brand: { ...prev.brand, description: e.target.value }
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Detailed Hex Color Pickers */}
                <div className="space-y-3 pt-2 border-t border-[#393426]">
                  <label className="text-xs font-semibold text-[#F5F2E8] block">
                    {lang === 'my' ? 'သတ်မှတ်အရောင်များ (Custom Color Tokens)' : 'Custom Color Values'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-[#B9B5A7] block mb-1">Primary Brand</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draftTheme.brand.primaryColor}
                          onChange={(e) =>
                            updateDraft((prev) => ({
                              ...prev,
                              brand: { ...prev.brand, primaryColor: e.target.value }
                            }))
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer border border-[#393426] bg-transparent"
                        />
                        <input
                          type="text"
                          value={draftTheme.brand.primaryColor}
                          onChange={(e) =>
                            updateDraft((prev) => ({
                              ...prev,
                              brand: { ...prev.brand, primaryColor: e.target.value }
                            }))
                          }
                          className="w-full px-2 py-1.5 rounded-lg bg-[#0B0B09] border border-[#393426] text-[11px] font-mono text-[#F5F2E8]"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-[#B9B5A7] block mb-1">Accent Highlight</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draftTheme.brand.accentColor}
                          onChange={(e) =>
                            updateDraft((prev) => ({
                              ...prev,
                              brand: { ...prev.brand, accentColor: e.target.value }
                            }))
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer border border-[#393426] bg-transparent"
                        />
                        <input
                          type="text"
                          value={draftTheme.brand.accentColor}
                          onChange={(e) =>
                            updateDraft((prev) => ({
                              ...prev,
                              brand: { ...prev.brand, accentColor: e.target.value }
                            }))
                          }
                          className="w-full px-2 py-1.5 rounded-lg bg-[#0B0B09] border border-[#393426] text-[11px] font-mono text-[#F5F2E8]"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-[#B9B5A7] block mb-1">Surface Card Bg</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draftTheme.brand.surfaceColor}
                          onChange={(e) =>
                            updateDraft((prev) => ({
                              ...prev,
                              brand: { ...prev.brand, surfaceColor: e.target.value }
                            }))
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer border border-[#393426] bg-transparent"
                        />
                        <input
                          type="text"
                          value={draftTheme.brand.surfaceColor}
                          onChange={(e) =>
                            updateDraft((prev) => ({
                              ...prev,
                              brand: { ...prev.brand, surfaceColor: e.target.value }
                            }))
                          }
                          className="w-full px-2 py-1.5 rounded-lg bg-[#0B0B09] border border-[#393426] text-[11px] font-mono text-[#F5F2E8]"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-[#B9B5A7] block mb-1">Heading Text</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draftTheme.brand.headingTextColor}
                          onChange={(e) =>
                            updateDraft((prev) => ({
                              ...prev,
                              brand: { ...prev.brand, headingTextColor: e.target.value }
                            }))
                          }
                          className="w-8 h-8 rounded-lg cursor-pointer border border-[#393426] bg-transparent"
                        />
                        <input
                          type="text"
                          value={draftTheme.brand.headingTextColor}
                          onChange={(e) =>
                            updateDraft((prev) => ({
                              ...prev,
                              brand: { ...prev.brand, headingTextColor: e.target.value }
                            }))
                          }
                          className="w-full px-2 py-1.5 rounded-lg bg-[#0B0B09] border border-[#393426] text-[11px] font-mono text-[#F5F2E8]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. BACKGROUND & VISUAL TAB */}
            {activeTab === 'background' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[#F5F2E8] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#C9A227]" />
                    <span>{lang === 'my' ? 'နောက်ခံဓာတ်ပုံနှင့် မြင်ကွင်းဒီဇိုင်း' : 'Background & Visual Scrim'}</span>
                  </h3>
                  <p className="text-xs text-[#B9B5A7] mt-0.5">
                    {lang === 'my'
                      ? 'စတိုးနောက်ခံပုံ၊ အနေအထား၊ အချိုးအစားနှင့် ရှင်းလင်းစွာဖတ်ရှုနိုင်ရန် Scrim အလွှာကို သတ်မှတ်ပါ'
                      : 'Upload full background photos, positioning, scale, and readability scrim.'}
                  </p>
                </div>

                {/* Store Background Image */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-[#F5F2E8] block">
                    {lang === 'my' ? 'စတိုး ပင်မနောက်ခံပုံ (Store Background)' : 'Store Background Photo'}
                  </label>
                  <div className="p-3 rounded-2xl bg-[#0B0B09] border border-[#393426] space-y-3">
                    {draftTheme.background.storeBgImage ? (
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-[#393426]">
                        <img
                          src={draftTheme.background.storeBgImage}
                          alt="Store Background"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft((prev) => ({
                              ...prev,
                              background: { ...prev.background, storeBgImage: '' }
                            }))
                          }
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                          title="Remove image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-6 border-2 border-dashed border-[#393426] rounded-xl flex flex-col items-center justify-center text-center text-[#8C887B] space-y-1">
                        <ImageIcon className="w-8 h-8 text-[#C9A227]/40 mb-1" />
                        <span className="text-xs font-semibold text-[#F5F2E8]">
                          {lang === 'my' ? 'နောက်ခံပုံ မရှိသေးပါ' : 'No background image uploaded'}
                        </span>
                        <span className="text-[11px] text-[#8C887B]">
                          PNG, JPG, WebP up to 5MB
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <label className="px-3.5 py-1.5 rounded-xl bg-[#22211A] hover:bg-[#2B2920] border border-[#393426] text-xs font-semibold text-[#F5F2E8] flex items-center gap-1.5 transition-colors cursor-pointer">
                        {uploadingAsset === 'background.storeBgImage' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-[#C9A227]" />
                        )}
                        <span>{lang === 'my' ? 'နောက်ခံပုံ အသစ်တင်မည်' : 'Upload Image'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) =>
                            handleUploadAsset(e, 'background', 'background.storeBgImage')
                          }
                        />
                      </label>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#B9B5A7]">Base Color:</span>
                        <input
                          type="color"
                          value={draftTheme.background.storeBgColor}
                          onChange={(e) =>
                            updateDraft((prev) => ({
                              ...prev,
                              background: { ...prev.background, storeBgColor: e.target.value }
                            }))
                          }
                          className="w-7 h-7 rounded cursor-pointer border border-[#393426] bg-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Position, Size, Repeat Controls */}
                <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-[#393426]">
                  <div>
                    <label className="text-[11px] font-semibold text-[#B9B5A7] block mb-1">
                      Position
                    </label>
                    <select
                      value={draftTheme.background.bgPosition}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          background: { ...prev.background, bgPosition: e.target.value as any }
                        }))
                      }
                      className="w-full px-2 py-1.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs text-[#F5F2E8] focus:border-[#C9A227]"
                    >
                      <option value="center">Center</option>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#B9B5A7] block mb-1">
                      Size
                    </label>
                    <select
                      value={draftTheme.background.bgSize}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          background: { ...prev.background, bgSize: e.target.value as any }
                        }))
                      }
                      className="w-full px-2 py-1.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs text-[#F5F2E8] focus:border-[#C9A227]"
                    >
                      <option value="cover">Cover (Full)</option>
                      <option value="contain">Contain</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#B9B5A7] block mb-1">
                      Repeat
                    </label>
                    <select
                      value={draftTheme.background.bgRepeat}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          background: { ...prev.background, bgRepeat: e.target.value as any }
                        }))
                      }
                      className="w-full px-2 py-1.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs text-[#F5F2E8] focus:border-[#C9A227]"
                    >
                      <option value="no-repeat">No Repeat</option>
                      <option value="repeat">Repeat Both</option>
                      <option value="repeat-x">Repeat X</option>
                      <option value="repeat-y">Repeat Y</option>
                    </select>
                  </div>
                </div>

                {/* Scrim Overlay Opacity & Color */}
                <div className="space-y-2 pt-2 border-t border-[#393426]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#F5F2E8]">
                      {lang === 'my' ? 'ဖတ်ရှုရလွယ်ကူစေမည့် Scrim အမှောင်လွှာ' : 'Contrast Overlay Scrim'}
                    </span>
                    <span className="font-mono text-[#C9A227]">
                      {draftTheme.background.overlayOpacity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={draftTheme.background.overlayOpacity}
                    onChange={(e) =>
                      updateDraft((prev) => ({
                        ...prev,
                        background: { ...prev.background, overlayOpacity: Number(e.target.value) }
                      }))
                    }
                    className="w-full accent-[#C9A227] cursor-pointer"
                  />
                  <p className="text-[11px] text-[#8C887B]">
                    {lang === 'my'
                      ? 'နောက်ခံပုံပေါ်တွင် ကုန်ပစ္စည်းစာလုံးများ ရှင်းလင်းစွာဖတ်ရှုနိုင်စေရန် 30% မှ 60% ကြားထားရှိရန် အကြံပြုပါသည်'
                      : 'Recommended between 30% and 60% so text remains crisp and readable over photography.'}
                  </p>
                </div>
              </div>
            )}

            {/* 3. TYPOGRAPHY TAB */}
            {activeTab === 'typography' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[#F5F2E8] flex items-center gap-2">
                    <Type className="w-4 h-4 text-[#C9A227]" />
                    <span>{lang === 'my' ? 'ဖောင့်စတိုင်နှင့် အရွယ်အစား' : 'Typography & Font Scale'}</span>
                  </h3>
                  <p className="text-xs text-[#B9B5A7] mt-0.5">
                    {lang === 'my'
                      ? 'ခေါင်းစဉ်ဖောင့်နှင့် အကြောင်းအရာဖောင့်များကို ရွေးချယ်ပါ'
                      : 'Choose curated font families for headings and body content.'}
                  </p>
                </div>

                {/* Heading Font */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#F5F2E8] block">
                    {lang === 'my' ? 'ခေါင်းစဉ်ဖောင့် (Heading Font)' : 'Heading Font Family'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {HEADING_FONTS.map((font) => {
                      const isSelected = draftTheme.typography.headingFont === font;
                      return (
                        <button
                          key={font}
                          type="button"
                          onClick={() =>
                            updateDraft((prev) => ({
                              ...prev,
                              typography: { ...prev.typography, headingFont: font }
                            }))
                          }
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#C9A227] bg-[#C9A227]/10'
                              : 'border-[#393426] bg-[#0B0B09] hover:border-[#C9A227]/40'
                          }`}
                        >
                          <span
                            className="text-sm font-bold block text-[#F5F2E8]"
                            style={{ fontFamily: font }}
                          >
                            {font}
                          </span>
                          <span className="text-[10px] text-[#8C887B] block mt-0.5">
                            Sample Heading Text
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Body Font */}
                <div className="space-y-2 pt-2 border-t border-[#393426]">
                  <label className="text-xs font-semibold text-[#F5F2E8] block">
                    {lang === 'my' ? 'အကြောင်းအရာဖောင့် (Body Font)' : 'Body Font Family'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {BODY_FONTS.map((font) => {
                      const isSelected = draftTheme.typography.bodyFont === font;
                      return (
                        <button
                          key={font}
                          type="button"
                          onClick={() =>
                            updateDraft((prev) => ({
                              ...prev,
                              typography: { ...prev.typography, bodyFont: font }
                            }))
                          }
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#C9A227] bg-[#C9A227]/10'
                              : 'border-[#393426] bg-[#0B0B09] hover:border-[#C9A227]/40'
                          }`}
                        >
                          <span
                            className="text-xs font-medium block text-[#F5F2E8]"
                            style={{ fontFamily: font }}
                          >
                            {font}
                          </span>
                          <span className="text-[10px] text-[#8C887B] block mt-0.5">
                            Clean readable text
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Alignment & Scale */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#393426]">
                  <div>
                    <label className="text-xs font-semibold text-[#F5F2E8] block mb-1">
                      {lang === 'my' ? 'ခေါင်းစဉ် အရွယ်အစား' : 'Heading Scale'}
                    </label>
                    <select
                      value={draftTheme.typography.headingScale}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          typography: { ...prev.typography, headingScale: e.target.value as any }
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs text-[#F5F2E8] focus:border-[#C9A227]"
                    >
                      <option value="compact">Compact</option>
                      <option value="normal">Normal</option>
                      <option value="large">Prominent / Large</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#F5F2E8] block mb-1">
                      {lang === 'my' ? 'စာသား ညှိချက်' : 'Text Alignment'}
                    </label>
                    <select
                      value={draftTheme.typography.textAlignment}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          typography: { ...prev.typography, textAlignment: e.target.value as any }
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs text-[#F5F2E8] focus:border-[#C9A227]"
                    >
                      <option value="left">Left Aligned</option>
                      <option value="center">Centered</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 4. HEADER TAB */}
            {activeTab === 'header' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[#F5F2E8] flex items-center gap-2">
                    <Layout className="w-4 h-4 text-[#C9A227]" />
                    <span>{lang === 'my' ? 'စတိုး ခေါင်းစဉ် (Header Settings)' : 'Header Customization'}</span>
                  </h3>
                  <p className="text-xs text-[#B9B5A7] mt-0.5">
                    {lang === 'my'
                      ? 'Logo အနေအထား၊ စတိုးအပေါ်ဘားအရောင်နှင့် ခလုတ်များကို သတ်မှတ်ပါ'
                      : 'Configure logo position, sticky behavior, and header controls.'}
                  </p>
                </div>

                {/* Logo Position */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#F5F2E8] block">
                    Logo Placement
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['left', 'center'] as const).map((pos) => {
                      const isSelected = draftTheme.header.logoPosition === pos;
                      return (
                        <button
                          key={pos}
                          type="button"
                          onClick={() =>
                            updateDraft((prev) => ({
                              ...prev,
                              header: { ...prev.header, logoPosition: pos }
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-center text-xs font-bold capitalize transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#C9A227] bg-[#C9A227]/10 text-[#C9A227]'
                              : 'border-[#393426] bg-[#0B0B09] text-[#B9B5A7]'
                          }`}
                        >
                          {pos}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sticky Header Toggle */}
                <div className="p-3 rounded-xl bg-[#0B0B09] border border-[#393426] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#F5F2E8] block">
                      Sticky Header
                    </span>
                    <span className="text-[11px] text-[#8C887B]">
                      Keep header fixed at top while scrolling
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft((prev) => ({
                        ...prev,
                        header: { ...prev.header, stickyHeader: !prev.header.stickyHeader }
                      }))
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      draftTheme.header.stickyHeader ? 'bg-[#C9A227]' : 'bg-[#393426]'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        draftTheme.header.stickyHeader ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Header Feature Toggles */}
                <div className="space-y-2 pt-2 border-t border-[#393426]">
                  <label className="text-xs font-semibold text-[#F5F2E8] block">
                    Header Buttons & Search
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs">
                      <span className="text-[#F5F2E8]">Show Product Search Bar</span>
                      <input
                        type="checkbox"
                        checked={draftTheme.header.showSearch}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            header: { ...prev.header, showSearch: e.target.checked }
                          }))
                        }
                        className="accent-[#C9A227] w-4 h-4 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs">
                      <span className="text-[#F5F2E8]">Show Cart Button</span>
                      <input
                        type="checkbox"
                        checked={draftTheme.header.showCart}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            header: { ...prev.header, showCart: e.target.checked }
                          }))
                        }
                        className="accent-[#C9A227] w-4 h-4 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs">
                      <span className="text-[#F5F2E8]">Show Marketplace Navigation</span>
                      <input
                        type="checkbox"
                        checked={draftTheme.header.showNavigation}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            header: { ...prev.header, showNavigation: e.target.checked }
                          }))
                        }
                        className="accent-[#C9A227] w-4 h-4 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. HOMEPAGE SECTIONS TAB */}
            {activeTab === 'sections' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[#F5F2E8] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#C9A227]" />
                    <span>{lang === 'my' ? 'ပင်မစာမျက်နှာ အပိုင်းများ' : 'Homepage Section Builder'}</span>
                  </h3>
                  <p className="text-xs text-[#B9B5A7] mt-0.5">
                    {lang === 'my'
                      ? 'စတိုးစာမျက်နှာတွင် ဖော်ပြမည့် အပိုင်းများကို ဖွင့်/ပိတ်နှင့် အစီအစဉ် ပြင်ဆင်ပါ'
                      : 'Toggle and reorder sections displayed on your storefront homepage.'}
                  </p>
                </div>

                <div className="space-y-2">
                  {draftTheme.homepage.sections.map((section, idx) => {
                    const sectionLabels: Record<string, { title: string; desc: string }> = {
                      hero: {
                        title: 'Hero Banner & Headline',
                        desc: 'Top announcement and welcome message'
                      },
                      customer_lookup: {
                        title: 'Order Status & Support Code',
                        desc: 'Customer tracking search bar'
                      },
                      delivery_payment: {
                        title: 'Delivery & Payment Policies',
                        desc: 'Official shipping rules and accepted payments'
                      },
                      featured_products: {
                        title: 'Product Catalog Grid',
                        desc: 'Interactive shopping products list'
                      },
                      intro: {
                        title: 'Store Story / About Intro',
                        desc: 'Brand bio and shop information'
                      },
                      contact: {
                        title: 'Social & Contact Channels',
                        desc: 'Facebook, Viber, phone channels'
                      }
                    };

                    const meta = sectionLabels[section.id] || {
                      title: section.id,
                      desc: 'Storefront section'
                    };

                    return (
                      <div
                        key={section.id}
                        className={`p-3 rounded-xl border transition-all ${
                          section.enabled
                            ? 'bg-[#0B0B09] border-[#393426]'
                            : 'bg-white/[0.01] border-white/5 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[11px] font-mono text-[#8C887B]">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-[#F5F2E8] block truncate">
                                {meta.title}
                              </span>
                              <span className="text-[10px] text-[#8C887B] block truncate">
                                {meta.desc}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Move Up / Down */}
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                updateDraft((prev) => {
                                  const arr = [...prev.homepage.sections];
                                  const temp = arr[idx - 1];
                                  arr[idx - 1] = arr[idx];
                                  arr[idx] = temp;
                                  return { ...prev, homepage: { ...prev.homepage, sections: arr } };
                                });
                              }}
                              className="p-1 rounded-lg hover:bg-white/[0.08] text-[#B9B5A7] disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === draftTheme.homepage.sections.length - 1}
                              onClick={() => {
                                updateDraft((prev) => {
                                  const arr = [...prev.homepage.sections];
                                  const temp = arr[idx + 1];
                                  arr[idx + 1] = arr[idx];
                                  arr[idx] = temp;
                                  return { ...prev, homepage: { ...prev.homepage, sections: arr } };
                                });
                              }}
                              className="p-1 rounded-lg hover:bg-white/[0.08] text-[#B9B5A7] disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Enable Toggle */}
                            <input
                              type="checkbox"
                              checked={section.enabled}
                              onChange={(e) => {
                                updateDraft((prev) => {
                                  const arr = prev.homepage.sections.map((s, i) =>
                                    i === idx ? { ...s, enabled: e.target.checked } : s
                                  );
                                  return { ...prev, homepage: { ...prev.homepage, sections: arr } };
                                });
                              }}
                              className="accent-[#C9A227] w-4 h-4 cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. PRODUCTS TAB */}
            {activeTab === 'products' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[#F5F2E8] flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#C9A227]" />
                    <span>{lang === 'my' ? 'ကုန်ပစ္စည်း ကတ်ဒီဇိုင်း' : 'Product Display & Cards'}</span>
                  </h3>
                  <p className="text-xs text-[#B9B5A7] mt-0.5">
                    {lang === 'my'
                      ? 'ကတ်အရွယ်အစား၊ ကော်လံအရေအတွက်၊ ဓာတ်ပုံအချိုးနှင့် ခလုတ်ပုံစံများကို ရွေးပါ'
                      : 'Customize columns, card borders, image aspect ratio, and button styles.'}
                  </p>
                </div>

                {/* Grid Columns */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#F5F2E8] block">
                    Catalog Grid Columns (Desktop)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([2, 3, 4] as const).map((cols) => {
                      const isSelected = draftTheme.productDisplay.gridColumns === cols;
                      return (
                        <button
                          key={cols}
                          type="button"
                          onClick={() =>
                            updateDraft((prev) => ({
                              ...prev,
                              productDisplay: { ...prev.productDisplay, gridColumns: cols }
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#C9A227] bg-[#C9A227]/10 text-[#C9A227]'
                              : 'border-[#393426] bg-[#0B0B09] text-[#B9B5A7]'
                          }`}
                        >
                          {cols} Columns
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Image Aspect Ratio */}
                <div className="space-y-2 pt-2 border-t border-[#393426]">
                  <label className="text-xs font-semibold text-[#F5F2E8] block">
                    Product Photo Aspect Ratio
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['square', 'portrait', 'landscape'] as const).map((aspect) => {
                      const isSelected = draftTheme.productDisplay.imageAspectRatio === aspect;
                      return (
                        <button
                          key={aspect}
                          type="button"
                          onClick={() =>
                            updateDraft((prev) => ({
                              ...prev,
                              productDisplay: { ...prev.productDisplay, imageAspectRatio: aspect }
                            }))
                          }
                          className={`p-2 rounded-xl border text-center text-xs font-semibold capitalize transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#C9A227] bg-[#C9A227]/10 text-[#C9A227]'
                              : 'border-[#393426] bg-[#0B0B09] text-[#B9B5A7]'
                          }`}
                        >
                          {aspect === 'square' ? '1:1 Square' : aspect === 'portrait' ? '3:4 Portrait' : '16:9 Wide'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Corner Radius & Button Style */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#393426]">
                  <div>
                    <label className="text-[11px] font-semibold text-[#B9B5A7] block mb-1">
                      Card Corner Radius
                    </label>
                    <select
                      value={draftTheme.productDisplay.cardRadius}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          productDisplay: { ...prev.productDisplay, cardRadius: e.target.value as any }
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs text-[#F5F2E8] focus:border-[#C9A227]"
                    >
                      <option value="none">Sharp / None</option>
                      <option value="md">Subtle (md)</option>
                      <option value="xl">Standard (xl)</option>
                      <option value="2xl">Rounded (2xl)</option>
                      <option value="3xl">Pill Smooth (3xl)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#B9B5A7] block mb-1">
                      Button Style
                    </label>
                    <select
                      value={draftTheme.productDisplay.buttonStyle}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          productDisplay: { ...prev.productDisplay, buttonStyle: e.target.value as any }
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs text-[#F5F2E8] focus:border-[#C9A227]"
                    >
                      <option value="gradient">Brand Gradient</option>
                      <option value="solid">Solid Color</option>
                      <option value="outline">Glass Outline</option>
                      <option value="pill">Pill Rounded</option>
                    </select>
                  </div>
                </div>

                {/* Badges Toggle */}
                <div className="space-y-2 pt-2 border-t border-[#393426]">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs">
                    <span className="text-[#F5F2E8]">Show Stock Availability Pills</span>
                    <input
                      type="checkbox"
                      checked={draftTheme.productDisplay.showStockBadge}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          productDisplay: { ...prev.productDisplay, showStockBadge: e.target.checked }
                        }))
                      }
                      className="accent-[#C9A227] w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs">
                    <span className="text-[#F5F2E8]">Show Discount Badges</span>
                    <input
                      type="checkbox"
                      checked={draftTheme.productDisplay.showDiscountBadge}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          productDisplay: { ...prev.productDisplay, showDiscountBadge: e.target.checked }
                        }))
                      }
                      className="accent-[#C9A227] w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 7. FOOTER TAB */}
            {activeTab === 'footer' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-[#F5F2E8] flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#C9A227]" />
                    <span>{lang === 'my' ? 'စတိုး အောက်ခြေပိုင်း (Footer)' : 'Footer Customization'}</span>
                  </h3>
                  <p className="text-xs text-[#B9B5A7] mt-0.5">
                    {lang === 'my'
                      ? 'မူပိုင်ခွင့်စာသား၊ ဆက်သွယ်ရန်နှင့် လူမှုကွန်ရက်လင့်ခ်များကို သတ်မှတ်ပါ'
                      : 'Set copyright notice and merchant social contact channels.'}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#F5F2E8] block mb-1">
                    Copyright Notice
                  </label>
                  <input
                    type="text"
                    value={draftTheme.footer.copyrightText}
                    onChange={(e) =>
                      updateDraft((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, copyrightText: e.target.value }
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs text-[#F5F2E8] focus:border-[#C9A227]"
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-[#393426]">
                  <label className="text-xs font-semibold text-[#F5F2E8] block">
                    Merchant Social Channels
                  </label>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[11px] text-[#B9B5A7] block mb-1">Facebook Page URL</span>
                      <input
                        type="text"
                        placeholder="https://facebook.com/yourpage"
                        value={draftTheme.footer.socialLinks?.facebook || ''}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            footer: {
                              ...prev.footer,
                              socialLinks: {
                                ...prev.footer.socialLinks,
                                facebook: e.target.value
                              }
                            }
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs text-[#F5F2E8] focus:border-[#C9A227]"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] text-[#B9B5A7] block mb-1">Viber Contact / Channel</span>
                      <input
                        type="text"
                        placeholder="viber://chat?number=..."
                        value={draftTheme.footer.socialLinks?.viber || ''}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            footer: {
                              ...prev.footer,
                              socialLinks: {
                                ...prev.footer.socialLinks,
                                viber: e.target.value
                              }
                            }
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs text-[#F5F2E8] focus:border-[#C9A227]"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] text-[#B9B5A7] block mb-1">Telegram Link</span>
                      <input
                        type="text"
                        placeholder="https://t.me/yourstore"
                        value={draftTheme.footer.socialLinks?.telegram || ''}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            footer: {
                              ...prev.footer,
                              socialLinks: {
                                ...prev.footer.socialLinks,
                                telegram: e.target.value
                              }
                            }
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-[#0B0B09] border border-[#393426] text-xs text-[#F5F2E8] focus:border-[#C9A227]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Responsive Live Preview Stage (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Preview Viewport Toolbar */}
          <div className="bg-[#181810] border border-[#393426] rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
            {/* Mode Switcher: Draft vs Published */}
            <div className="flex items-center gap-1 bg-[#0B0B09] p-1 rounded-xl border border-[#393426]">
              <button
                type="button"
                onClick={() => setPreviewMode('draft')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  previewMode === 'draft'
                    ? 'bg-[#C9A227] text-[#0B0B09] font-bold shadow-xs'
                    : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
                }`}
              >
                {lang === 'my' ? 'မူကြမ်း (Draft)' : 'Draft Preview'}
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('published')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  previewMode === 'published'
                    ? 'bg-[#C9A227] text-[#0B0B09] font-bold shadow-xs'
                    : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
                }`}
              >
                {lang === 'my' ? 'တိုက်ရိုက် (Live)' : 'Live Store'}
              </button>
            </div>

            {/* Device Frame Switcher */}
            <div className="flex items-center gap-1 bg-[#0B0B09] p-1 rounded-xl border border-[#393426]">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                  previewDevice === 'desktop'
                    ? 'bg-[#C9A227] text-[#0B0B09]'
                    : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
                }`}
                title="Desktop View (100%)"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('tablet')}
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                  previewDevice === 'tablet'
                    ? 'bg-[#C9A227] text-[#0B0B09]'
                    : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
                }`}
                title="Tablet View (768px)"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                  previewDevice === 'mobile'
                    ? 'bg-[#C9A227] text-[#0B0B09]'
                    : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
                }`}
                title="Mobile View (375px)"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Device Frame Container */}
          <div className="bg-[#0B0B09] border border-[#393426] rounded-3xl p-3 sm:p-5 overflow-hidden flex justify-center min-h-[750px] shadow-2xl">
            <div
              className={`transition-all duration-300 rounded-2xl overflow-y-auto max-h-[820px] shadow-2xl ${
                previewDevice === 'mobile'
                  ? 'w-[375px] border-8 border-[#22211A] rounded-[36px]'
                  : previewDevice === 'tablet'
                  ? 'w-[768px] border-4 border-[#22211A] rounded-[24px]'
                  : 'w-full border border-white/10'
              }`}
            >
              {/* Embedded CustomerStorefrontView using active preview theme and store */}
              <CustomerStorefrontView
                slug={store?.slug || 'sample'}
                previewTheme={currentPreviewTheme}
                previewStore={store}
                previewProducts={products}
                isPreviewMode={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
