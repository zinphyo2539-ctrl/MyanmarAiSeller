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
  Info,
  Box,
  Laptop,
  Smartphone as PhoneIcon,
  Shirt,
  Zap,
  Brush,
  Carrot,
  Home as HomeIcon,
  ShoppingBasket
} from 'lucide-react';
import { StoreSettings, StorefrontThemeConfig, Product } from '../types';
import { CustomerStorefrontView } from './CustomerStorefrontView';
import { DevicePreviewFrame } from './studio/DevicePreviewFrame';

interface StorefrontAppearanceViewProps {
  store: StoreSettings | null;
  products: Product[];
  lang: 'my' | 'en';
  onStoreUpdated?: (updatedStore: StoreSettings) => void;
  onOpenLiveStore?: () => void;
}

const INDUSTRY_PROFILES = [
  {
    id: 'general',
    nameMy: 'အထွေထွေ အရောင်းဆိုင် (General)',
    nameEn: 'General Retail',
    description: 'Balanced universal storefront default for any business.',
    icon: ShoppingBag,
    config: {
      industryProfile: 'general',
      productDisplay: {
        gridColumns: 3,
        layoutDensity: 'comfortable',
        cardRadius: '2xl',
        imageAspectRatio: 'square',
        imageFit: 'cover',
        imagePadding: 0,
        showSkuOnCard: false,
        showBuyButtonOnCard: true
      },
      homepage: { heroStyle: 'editorial' },
      background: { surfaceTheme: 'light' }
    }
  },
  {
    id: 'fashion',
    nameMy: 'အဝတ်အထည်နှင့် ဖက်ရှင် (Fashion)',
    nameEn: 'Fashion & Apparel',
    description: '4:5 Portrait cards, cover fit, minimal editorial typography.',
    icon: Shirt,
    config: {
      industryProfile: 'fashion',
      productDisplay: {
        gridColumns: 3,
        layoutDensity: 'comfortable',
        cardRadius: 'none',
        imageAspectRatio: 'portrait',
        imageFit: 'cover',
        imagePadding: 0,
        showSkuOnCard: false,
        showBuyButtonOnCard: true
      },
      homepage: { heroStyle: 'editorial' },
      background: { surfaceTheme: 'light' }
    }
  },
  {
    id: 'electronics',
    nameMy: 'အီလက်ထရောနစ် (Electronics)',
    nameEn: 'Electronics & Gadgets',
    description: '1:1 Square cards, contain fit with padding, technical style.',
    icon: Zap,
    config: {
      industryProfile: 'electronics',
      productDisplay: {
        gridColumns: 3,
        layoutDensity: 'compact',
        cardRadius: 'xl',
        imageAspectRatio: 'square',
        imageFit: 'contain',
        imagePadding: 12,
        showSkuOnCard: true,
        showBuyButtonOnCard: true
      },
      homepage: { heroStyle: 'compact' },
      background: { surfaceTheme: 'dark' }
    }
  },
  {
    id: 'cosmetics',
    nameMy: 'အလှကုန်နှင့် ပစ္စည်းများ (Cosmetics)',
    nameEn: 'Cosmetics & Beauty',
    description: 'Clean luxury layout, soft neutral surfaces, elegant presentation.',
    icon: Brush,
    config: {
      industryProfile: 'cosmetics',
      productDisplay: {
        gridColumns: 3,
        layoutDensity: 'comfortable',
        cardRadius: '3xl',
        imageAspectRatio: 'portrait',
        imageFit: 'cover',
        imagePadding: 0,
        showSkuOnCard: false,
        showBuyButtonOnCard: true
      },
      homepage: { heroStyle: 'editorial' },
      background: { surfaceTheme: 'ivory' }
    }
  },
  {
    id: 'grocery',
    nameMy: 'ကုန်စုံဆိုင် (Grocery)',
    nameEn: 'Grocery & Mini-Mart',
    description: 'High-density compact grid, instant add-to-cart focus.',
    icon: Carrot,
    config: {
      industryProfile: 'grocery',
      productDisplay: {
        gridColumns: 4,
        layoutDensity: 'tight',
        cardRadius: 'md',
        imageAspectRatio: 'square',
        imageFit: 'contain',
        imagePadding: 8,
        showSkuOnCard: false,
        showBuyButtonOnCard: true
      },
      homepage: { heroStyle: 'hidden' },
      background: { surfaceTheme: 'light' }
    }
  },
  {
    id: 'home',
    nameMy: 'အိမ်သုံးနှင့် အလှဆင် (Home)',
    nameEn: 'Home & Living',
    description: 'Spacious curated layout for furniture and decor.',
    icon: HomeIcon,
    config: {
      industryProfile: 'home',
      productDisplay: {
        gridColumns: 2,
        layoutDensity: 'comfortable',
        cardRadius: '2xl',
        imageAspectRatio: 'landscape',
        imageFit: 'cover',
        imagePadding: 0,
        showSkuOnCard: false,
        showBuyButtonOnCard: true
      },
      homepage: { heroStyle: 'editorial' },
      background: { surfaceTheme: 'ivory' }
    }
  }
];

const PRESET_PALETTES = [
  {
    name: 'Editorial Alabaster',
    primary: '#121212',
    secondary: '#F6F6F4',
    accent: '#121212',
    surface: '#FFFFFF',
    bg: '#FFFFFF',
    heading: '#121212',
    body: '#555555',
    border: 'rgba(0, 0, 0, 0.08)'
  },
  {
    name: 'Obsidian Champagne',
    primary: '#D4AF37',
    secondary: '#16161D',
    accent: '#D4AF37',
    surface: '#13121D',
    bg: '#0E0E12',
    heading: '#FFFFFF',
    body: '#A0A0B0',
    border: 'rgba(255, 255, 255, 0.08)'
  },
  {
    name: 'Emerald Boutique',
    primary: '#0F3D2E',
    secondary: '#FAF9F6',
    accent: '#C9A227',
    surface: '#FFFFFF',
    bg: '#FAF9F6',
    heading: '#0F3D2E',
    body: '#2D4F3F',
    border: 'rgba(15, 61, 46, 0.1)'
  },
  {
    name: 'Rose Atelier',
    primary: '#C86D51',
    secondary: '#FDFBF9',
    accent: '#231F20',
    surface: '#FFFFFF',
    bg: '#FDFBF9',
    heading: '#231F20',
    body: '#5A5452',
    border: 'rgba(200, 109, 81, 0.15)'
  },
  {
    name: 'Cyber Titanium',
    primary: '#6366F1',
    secondary: '#111827',
    accent: '#6366F1',
    surface: '#1F2937',
    bg: '#0B0F19',
    heading: '#F9FAFB',
    body: '#9CA3AF',
    border: 'rgba(255, 255, 255, 0.1)'
  },
  {
    name: 'Minimal Monochrome',
    primary: '#000000',
    secondary: '#FFFFFF',
    accent: '#000000',
    surface: '#FFFFFF',
    bg: '#FFFFFF',
    heading: '#000000',
    body: '#333333',
    border: 'rgba(0, 0, 0, 0.2)'
  }
];

function getContrastColor(hex: string): string {
  if (!hex) return '#FFFFFF';
  if (hex.indexOf('#') === 0) hex = hex.slice(1);
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length !== 6) return '#FFFFFF';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155 ? '#121212' : '#FFFFFF';
}

export const StorefrontAppearanceView: React.FC<StorefrontAppearanceViewProps> = ({
  store,
  products,
  lang,
  onStoreUpdated,
  onOpenLiveStore
}) => {
  const [activeTab, setActiveTab] = useState<
    'vibe' | 'brand' | 'background' | 'typography' | 'header' | 'sections' | 'products' | 'footer'
  >('vibe');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
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

  const fetchTheme = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('myanmar_seller_token');
      const res = await fetch('/api/merchant/storefront/theme', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to load theme');
      const data = await res.json();
      setPublishedTheme(data.published);
      setDraftTheme(data.draft);
      setHasUnpublishedChanges(data.hasUnpublishedChanges);
    } catch (err) {
      console.warn('Theme fetch failed, using defaults');
      // Create default if fetch fails
      const defaultTheme: StorefrontThemeConfig = {
        version: 1,
        updatedAt: new Date().toISOString(),
        industryProfile: 'general',
        brand: {
          storeName: store?.storeName || 'My Store',
          description: store?.description || 'Premium shopping experience.',
          primaryColor: '#121212',
          secondaryColor: '#F6F6F4',
          accentColor: '#121212',
          headingTextColor: '#121212',
          bodyTextColor: '#555555',
          surfaceColor: '#FFFFFF',
          surfaceBorderColor: 'rgba(0, 0, 0, 0.08)'
        },
        background: { storeBgColor: '#FFFFFF', bgPosition: 'center', bgSize: 'cover', bgRepeat: 'no-repeat', overlayColor: '#000000', overlayOpacity: 0 },
        typography: { headingFont: 'Plus Jakarta Sans', bodyFont: 'Plus Jakarta Sans', headingScale: 'normal', bodyScale: 'normal', textAlignment: 'left' },
        header: { logoPosition: 'left', headerBgColor: 'rgba(255, 255, 255, 0.9)', headerTextColor: '#121212', showNavigation: true, showSearch: true, showCart: true, stickyHeader: true, showAnnouncement: true, announcementText: '' },
        homepage: { 
          sections: [
            { id: 'hero', enabled: true, title: 'Welcome', subtitle: 'Explore our latest collection' },
            { id: 'featured_products', enabled: true, title: 'Our Catalog' }
          ],
          heroStyle: 'editorial'
        },
        productDisplay: { gridColumns: 3, layoutDensity: 'comfortable', cardRadius: '2xl', cardShadow: 'lg', imageAspectRatio: 'square', imageFit: 'cover', imagePadding: 0, showDiscountBadge: true, showStockBadge: true, showSkuOnCard: false, showBuyButtonOnCard: true, buttonStyle: 'solid' },
        buttons: { buttonPrimaryBg: '#121212', buttonPrimaryText: '#FFFFFF', buttonRadius: 'full' },
        footer: { footerBgColor: '#FFFFFF', footerTextColor: '#555555', showContact: true, showSocial: true, copyrightText: 'All rights reserved.' }
      };
      setDraftTheme(defaultTheme);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTheme();
  }, []);

  const updateDraft = (updater: (prev: StorefrontThemeConfig) => StorefrontThemeConfig) => {
    if (!draftTheme) return;
    const updated = updater({ ...draftTheme });
    setDraftTheme(updated);
    setHasUnpublishedChanges(true);
  };

  const handleSaveDraft = async () => {
    if (!draftTheme) return;
    setSavingDraft(true);
    try {
      const token = localStorage.getItem('myanmar_seller_token');
      await fetch('/api/merchant/storefront/theme/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(draftTheme)
      });
      setBannerNotice({ type: 'success', message: lang === 'my' ? 'မူကြမ်းသိမ်းပြီးပါပြီ' : 'Draft saved successfully' });
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message });
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (!draftTheme) return;
    setPublishing(true);
    try {
      const token = localStorage.getItem('myanmar_seller_token');
      const res = await fetch('/api/merchant/storefront/theme/publish', {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      setPublishedTheme(data.published);
      setDraftTheme(data.published);
      setHasUnpublishedChanges(false);
      setBannerNotice({ type: 'success', message: lang === 'my' ? 'တိုက်ရိုက်ထုတ်ဝေပြီးပါပြီ' : 'Published successfully' });
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message });
    } finally {
      setPublishing(false);
    }
  };

  const applyIndustryProfile = (profile: typeof INDUSTRY_PROFILES[0]) => {
    updateDraft(prev => ({
      ...prev,
      industryProfile: profile.id as any,
      productDisplay: {
        ...prev.productDisplay,
        ...profile.config.productDisplay
      } as any,
      homepage: {
        ...prev.homepage,
        ...profile.config.homepage
      } as any,
      background: {
        ...prev.background,
        ...profile.config.background
      } as any
    }));
  };

  const applyPalette = (palette: typeof PRESET_PALETTES[0]) => {
    updateDraft(prev => ({
      ...prev,
      brand: {
        ...prev.brand,
        primaryColor: palette.primary,
        secondaryColor: palette.secondary,
        accentColor: palette.accent,
        surfaceColor: palette.surface,
        bg: palette.bg,
        headingTextColor: palette.heading,
        bodyTextColor: palette.body,
        surfaceBorderColor: palette.border
      } as any,
      background: { ...prev.background, storeBgColor: palette.bg },
      buttons: {
        ...prev.buttons,
        buttonPrimaryBg: palette.primary,
        buttonPrimaryText: getContrastColor(palette.primary)
      }
    }));
  };

  if (loading && !draftTheme) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 space-y-4">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Initializing Theme Studio...</p>
      </div>
    );
  }

  if (!draftTheme) return null;

  const currentPreviewTheme = previewMode === 'draft' ? draftTheme : publishedTheme || draftTheme;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-[#13121D] border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
            <Brush className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {lang === 'my' ? 'စတိုးဒီဇိုင်း ဖန်တီးမှု စတူဒီယို' : 'Storefront Theme Studio'}
            </h2>
            <p className="text-xs text-slate-400">
              {lang === 'my' ? 'No-code စနစ်ဖြင့် သင့်စတိုးကို စိတ်ကြိုက်ပြင်ဆင်ပါ' : 'Code-free visual theme customization'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {hasUnpublishedChanges && (
            <button
              onClick={() => fetchTheme()}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all cursor-pointer"
            >
              Revert
            </button>
          )}
          <button
            onClick={handleSaveDraft}
            disabled={savingDraft || publishing}
            className="px-4 py-2 rounded-xl bg-[#1A1829] border border-white/15 text-white text-xs font-bold hover:bg-[#232135] transition-all cursor-pointer disabled:opacity-50"
          >
            {savingDraft ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || savingDraft}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-extrabold shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 transition-all cursor-pointer disabled:opacity-50"
          >
            {publishing ? 'Publishing...' : 'Publish Live'}
          </button>
          {onOpenLiveStore && (
            <button onClick={onOpenLiveStore} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer">
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {bannerNotice && (
        <div className={`px-4 py-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
          bannerNotice.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          <div className="flex items-center gap-2">
            {bannerNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{bannerNotice.message}</span>
          </div>
          <button onClick={() => setBannerNotice(null)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Sidebar */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#13121D] border border-white/10 p-1 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'vibe', label: 'Vibe', icon: Sparkles },
              { id: 'brand', label: 'Colors', icon: Palette },
              { id: 'typography', label: 'Typography', icon: Type },
              { id: 'header', label: 'Header', icon: Layout },
              { id: 'sections', label: 'Sections', icon: Layers },
              { id: 'products', label: 'Cards', icon: ShoppingBag }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === tab.id ? 'bg-white/10 text-violet-400 border border-violet-500/30 shadow-inner' : 'text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-[#13121D] border border-white/10 rounded-2xl p-6 shadow-2xl min-h-[500px]">
            {activeTab === 'vibe' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white">Industry Presets</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Select your industry to auto-apply optimal layout rules.</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {INDUSTRY_PROFILES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => applyIndustryProfile(p)}
                      className={`p-4 rounded-2xl border text-left flex items-center gap-4 transition-all group cursor-pointer ${
                        draftTheme.industryProfile === p.id ? 'bg-violet-600/10 border-violet-500/40 ring-1 ring-violet-500/20' : 'bg-white/[0.03] border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                        draftTheme.industryProfile === p.id ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-400 group-hover:text-white'
                      }`}>
                        <p.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-white">{lang === 'my' ? p.nameMy : p.nameEn}</div>
                        <p className="text-[11px] text-slate-400 truncate">{p.description}</p>
                      </div>
                      {draftTheme.industryProfile === p.id && <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'brand' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white">Store Surface Theme</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', labelMy: 'Editorial Light', labelEn: 'Light', canvas: '#FFFFFF', accent: '#000000' },
                      { id: 'ivory', labelMy: 'Warm Ivory', labelEn: 'Ivory', canvas: '#FAF8F5', accent: '#B48A3E' },
                      { id: 'dark', labelMy: 'Obsidian Dark', labelEn: 'Dark', canvas: '#0B0B0E', accent: '#FFFFFF' }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => updateDraft(prev => ({ ...prev, background: { ...prev.background, surfaceTheme: s.id as any }}))}
                        className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 cursor-pointer ${
                          (draftTheme.background.surfaceTheme || 'light') === s.id ? 'bg-violet-600/10 border-violet-500/40 shadow-inner' : 'bg-white/[0.03] border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg shadow-inner border border-white/5" style={{ backgroundColor: s.canvas }}>
                           <div className="w-4 h-2 rounded-sm mx-auto mt-2" style={{ backgroundColor: s.accent }} />
                        </div>
                        <span className="text-[10px] font-bold text-white">{lang === 'my' ? s.labelMy : s.labelEn}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-white">Brand Accent Color</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Applies to primary buttons, active states, and badges.</p>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      '#121212', // Obsidian
                      '#B48A3E', // Champagne Gold
                      '#BE185D', // Royal Rose
                      '#047857', // Emerald
                      '#4338CA', // Indigo
                      '#7C3AED', // Violet
                      '#EA580C', // Orange
                      '#2563EB', // Blue
                      '#000000', // Black
                      '#FFFFFF'  // White
                    ].map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          updateDraft(prev => ({
                            ...prev,
                            brand: { ...prev.brand, primaryColor: color, accentColor: color },
                            buttons: { ...prev.buttons, buttonPrimaryBg: color, buttonPrimaryText: getContrastColor(color) }
                          }));
                        }}
                        className={`w-full aspect-square rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                          draftTheme.brand.primaryColor.toLowerCase() === color.toLowerCase() ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-white/10'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={draftTheme.brand.primaryColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateDraft(prev => ({
                          ...prev,
                          brand: { ...prev.brand, primaryColor: val, accentColor: val },
                          buttons: { ...prev.buttons, buttonPrimaryBg: val, buttonPrimaryText: getContrastColor(val) }
                        }));
                      }}
                      className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                    />
                    <input
                      type="text"
                      value={draftTheme.brand.primaryColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('#') && val.length <= 7) {
                          updateDraft(prev => ({
                            ...prev,
                            brand: { ...prev.brand, primaryColor: val, accentColor: val },
                            buttons: { ...prev.buttons, buttonPrimaryBg: val, buttonPrimaryText: getContrastColor(val) }
                          }));
                        }
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'typography' && (
              <div className="space-y-6">
                 <div>
                  <h3 className="text-sm font-bold text-white">Store Typography</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Premium font pairings optimized for English & Myanmar.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">Heading Font</label>
                    <select
                      value={draftTheme.typography.headingFont}
                      onChange={(e) => updateDraft(prev => ({ ...prev, typography: { ...prev.typography, headingFont: e.target.value as any }}))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white"
                    >
                      {['Plus Jakarta Sans', 'Outfit', 'Playfair Display', 'DM Sans', 'Space Grotesk', 'Cinzel'].map(f => <option key={f} value={f} className="bg-[#13121D]">{f}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">Text Alignment</label>
                    <div className="flex bg-white/5 p-1 rounded-xl gap-1">
                      {['left', 'center'].map(align => (
                        <button
                          key={align}
                          onClick={() => updateDraft(prev => ({ ...prev, typography: { ...prev.typography, textAlignment: align as any }}))}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                            draftTheme.typography.textAlignment === align ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'header' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white">Header & Announcement Bar</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Configure your storefront announcement ribbon and header navigation.</p>
                </div>

                <div className="space-y-5">
                  {/* Announcement Bar Toggle */}
                  <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Announcement Ribbon ပြသမည်</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Show top announcement / promotion ribbon</span>
                    </div>
                    <button
                      onClick={() => updateDraft(prev => ({
                        ...prev,
                        header: {
                          ...prev.header,
                          showAnnouncement: prev.header?.showAnnouncement === false ? true : false
                        }
                      }))}
                      className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${draftTheme.header?.showAnnouncement !== false ? 'bg-violet-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${draftTheme.header?.showAnnouncement !== false ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  {/* Announcement Text Input */}
                  {draftTheme.header?.showAnnouncement !== false && (
                    <div className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                      <label className="text-xs font-bold text-slate-300 block">
                        အဓိက ပရိုမိုးရှင်း သို့မဟုတ် Delivery စာသား
                      </label>
                      <input
                        type="text"
                        value={draftTheme.header?.announcementText || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateDraft(prev => ({
                            ...prev,
                            header: { ...prev.header, announcementText: val }
                          }));
                        }}
                        placeholder="ဥပမာ - တစ်နိုင်ငံလုံး အိမ်အရောက် ပို့ဆောင်ပေးပါသည်"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
                      />

                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-slate-400 block mb-2 uppercase tracking-wider">
                          အကြံပြုချက် နမူနာများ (Quick Presets)
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            'တစ်နိုင်ငံလုံး အိမ်အရောက် ပို့ဆောင်ပေးပါသည်',
                            '၅၀,၀၀၀ ကျပ်အထက် ဝယ်ယူပါက ပို့ခအခမဲ့',
                            'တိုက်ရိုက် အော်ဒါများကို ၂၄ နာရီအတွင်း အမြန်ပို့ပေးပါသည်',
                            'Official Verified Luxury Boutique'
                          ].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                updateDraft(prev => ({
                                  ...prev,
                                  header: { ...prev.header, announcementText: preset }
                                }));
                              }}
                              className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-violet-600/20 hover:text-violet-300 border border-white/5 transition-all text-slate-300 cursor-pointer text-left"
                            >
                              + {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sticky Header Toggle */}
                  <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Sticky Header ကပ်ထားမည်</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Keep header fixed at top while scrolling</span>
                    </div>
                    <button
                      onClick={() => updateDraft(prev => ({
                        ...prev,
                        header: {
                          ...prev.header,
                          stickyHeader: !prev.header?.stickyHeader
                        }
                      }))}
                      className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${draftTheme.header?.stickyHeader !== false ? 'bg-violet-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${draftTheme.header?.stickyHeader !== false ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white">Product Card Style</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Configure how your products are displayed in the grid.</p>
                </div>
                <div className="space-y-5">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400">Corner Radius</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['none', 'xl', '3xl'].map(radius => (
                        <button
                          key={radius}
                          onClick={() => updateDraft(prev => ({ ...prev, productDisplay: { ...prev.productDisplay, cardRadius: radius as any }}))}
                          className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            draftTheme.productDisplay.cardRadius === radius ? 'bg-violet-600/10 border-violet-500/40 text-white' : 'bg-white/5 border-white/5 text-slate-400'
                          }`}
                        >
                          {radius === 'none' ? 'Sharp' : radius === 'xl' ? 'Modern' : 'Soft'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400">Image Ratio</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'portrait', label: '4:5 Portrait' },
                        { id: 'square', label: '1:1 Square' },
                        { id: 'landscape', label: '4:3 Landscape' }
                      ].map(ratio => (
                        <button
                          key={ratio.id}
                          onClick={() => updateDraft(prev => ({ ...prev, productDisplay: { ...prev.productDisplay, imageAspectRatio: ratio.id as any }}))}
                          className={`py-2 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                            draftTheme.productDisplay.imageAspectRatio === ratio.id ? 'bg-violet-600/10 border-violet-500/40 text-white' : 'bg-white/5 border-white/5 text-slate-400'
                          }`}
                        >
                          {ratio.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 space-y-4">
                    <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">SKU ကုဒ် ပြသမည်</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest">Show Technical SKU</span>
                      </div>
                      <button
                        onClick={() => updateDraft(prev => ({ ...prev, productDisplay: { ...prev.productDisplay, showSkuOnCard: !prev.productDisplay.showSkuOnCard }}))}
                        className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${draftTheme.productDisplay.showSkuOnCard ? 'bg-violet-600' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${draftTheme.productDisplay.showSkuOnCard ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">ဝယ်ယူရန်ခလုတ် ပြသမည်</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest">Show Buy Button</span>
                      </div>
                      <button
                        onClick={() => updateDraft(prev => ({ ...prev, productDisplay: { ...prev.productDisplay, showBuyButtonOnCard: draftTheme.productDisplay.showBuyButtonOnCard === false ? true : false }}))}
                        className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${draftTheme.productDisplay.showBuyButtonOnCard !== false ? 'bg-violet-600' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${draftTheme.productDisplay.showBuyButtonOnCard !== false ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400">Image Fit</label>
                    <div className="flex bg-white/5 p-1 rounded-xl gap-1">
                      {['cover', 'contain'].map(fit => (
                        <button
                          key={fit}
                          onClick={() => updateDraft(prev => ({ ...prev, productDisplay: { ...prev.productDisplay, imageFit: fit as any }}))}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                            draftTheme.productDisplay.imageFit === fit ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {fit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'sections' && (
              <>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-white">Hero Banner Style</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Control the main spotlight area of your store.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'editorial', labelMy: 'Editorial Lookbook (ပုံအပြည့်)', labelEn: 'Editorial Lookbook' },
                      { id: 'compact', labelMy: 'Compact Minimal (အကျဉ်းချုပ်)', labelEn: 'Compact Minimal' },
                      { id: 'hidden', labelMy: 'Hidden (ဖျောက်ထားမည်)', labelEn: 'Hidden / Catalog Only' }
                    ].map(style => (
                      <button
                        key={style.id}
                        onClick={() => updateDraft(prev => ({ ...prev, homepage: { ...prev.homepage, heroStyle: style.id as any }}))}
                        className={`px-4 py-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          (draftTheme.homepage.heroStyle || 'editorial') === style.id ? 'bg-violet-600/10 border-violet-500/40 text-white' : 'bg-white/[0.03] border-white/5 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <span className="text-xs font-bold">{lang === 'my' ? style.labelMy : style.labelEn}</span>
                        {(draftTheme.homepage.heroStyle || 'editorial') === style.id && <CheckCircle2 className="w-4 h-4 text-violet-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Homepage Sections</h3>
                      <p className="text-[11px] text-slate-400 mt-1">Toggle and reorder secondary modules.</p>
                    </div>
                  </div>
                <div className="space-y-3">
                  {draftTheme.homepage.sections.map((section, idx) => (
                    <div key={section.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 group">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                             disabled={idx === 0}
                             onClick={() => {
                               const sections = [...draftTheme.homepage.sections];
                               [sections[idx-1], sections[idx]] = [sections[idx], sections[idx-1]];
                               updateDraft(prev => ({ ...prev, homepage: { sections }}));
                             }}
                             className="text-slate-500 hover:text-white disabled:opacity-20 cursor-pointer"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                             disabled={idx === draftTheme.homepage.sections.length - 1}
                             onClick={() => {
                               const sections = [...draftTheme.homepage.sections];
                               [sections[idx+1], sections[idx]] = [sections[idx], sections[idx+1]];
                               updateDraft(prev => ({ ...prev, homepage: { sections }}));
                             }}
                             className="text-slate-500 hover:text-white disabled:opacity-20 cursor-pointer"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="font-bold text-xs text-white capitalize">{section.id.replace(/_/g, ' ')}</div>
                      </div>
                      <button
                        onClick={() => {
                          const sections = draftTheme.homepage.sections.map(s => s.id === section.id ? { ...s, enabled: !s.enabled } : s);
                          updateDraft(prev => ({ ...prev, homepage: { sections }}));
                        }}
                        className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${section.enabled ? 'bg-violet-600' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${section.enabled ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          </div>
        </div>

        {/* Live Preview Stage */}
        <div className="lg:col-span-7 h-full flex flex-col">
          <div className="bg-[#13121D] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex-1 flex flex-col min-h-[850px]">
            <DevicePreviewFrame 
              device={previewDevice}
              setDevice={setPreviewDevice}
              url={`https://shopsone.com/store/${store?.slug || 'yangon-style'}`}
              lang={lang}
              onOpenExternal={onOpenLiveStore}
            >
              <CustomerStorefrontView
                slug={store?.slug || 'yangon-style'}
                previewTheme={currentPreviewTheme}
                previewStore={store}
                previewProducts={products}
                isPreviewMode={true}
                viewport={previewDevice}
              />
            </DevicePreviewFrame>
          </div>
          
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-slate-500 font-mono italic">
             <Info className="w-3 h-3" />
             High-fidelity {previewDevice} hardware simulation. Proportional scaling active.
          </div>
        </div>
      </div>
    </div>
  );
};
