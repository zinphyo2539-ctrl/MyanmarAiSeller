import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ShoppingCart,
  Package,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Copy,
  Store,
  Truck,
  CreditCard,
  RefreshCw,
  Tag,
  Search,
  Sparkles,
  Phone,
  MessageCircle,
  ExternalLink,
  Plus,
  Minus,
  ShoppingBasket,
  ChevronRight,
  X,
  Sliders,
  ShoppingBag,
  Zap,
  Globe
} from 'lucide-react';
import { OrderSupportModal } from './OrderSupportModal';
import { CheckoutWorkflowModal } from './CheckoutWorkflowModal';
import { CustomerCodeLookup } from './CustomerCodeLookup';
import { Product, StoreSettings, StorefrontThemeConfig } from '../types';

interface CustomerStorefrontViewProps {
  slug: string;
  onNavigateToMerchant?: () => void;
  onNavigateToMarketplace?: () => void;
  initialProductId?: string | null;
  previewTheme?: StorefrontThemeConfig;
  previewStore?: StoreSettings | null;
  previewProducts?: Product[];
  isPreviewMode?: boolean;
  viewport?: 'mobile' | 'tablet' | 'desktop' | 'auto';
}

interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  price: number;
  qty: number;
  maxStock: number;
  imageUrl?: string | null;
}

const DEFAULT_THEME: StorefrontThemeConfig = {
  version: 1,
  updatedAt: new Date().toISOString(),
  publishedAt: new Date().toISOString(),
  industryProfile: 'general',
  brand: {
    logoUrl: '',
    faviconUrl: '',
    storeName: 'Official Store',
    tagline: 'Premium Commerce & Fashion',
    description: 'Welcome to our official branded storefront.',
    primaryColor: '#121212',
    secondaryColor: '#F6F6F4',
    accentColor: '#121212',
    headingTextColor: '#121212',
    bodyTextColor: '#555555',
    surfaceColor: '#FFFFFF',
    surfaceBorderColor: 'rgba(0, 0, 0, 0.08)'
  },
  background: {
    storeBgImage: '',
    storeBgColor: '#FFFFFF',
    heroBgImage: '',
    bannerBgImage: '',
    bgPosition: 'center',
    bgSize: 'cover',
    bgRepeat: 'no-repeat',
    overlayColor: '#FFFFFF',
    overlayOpacity: 0
  },
  typography: {
    headingFont: 'Plus Jakarta Sans',
    bodyFont: 'Plus Jakarta Sans',
    headingScale: 'normal',
    bodyScale: 'normal',
    textAlignment: 'left'
  },
  header: {
    logoPosition: 'left',
    headerBgColor: 'rgba(255, 255, 255, 0.9)',
    headerTextColor: '#121212',
    showNavigation: true,
    showSearch: true,
    showCart: true,
    stickyHeader: true,
    showAnnouncement: true,
    announcementText: ''
  },
  homepage: {
    sections: [
      { id: 'hero', enabled: true, title: 'Welcome to our Official Storefront', subtitle: 'Curated premium collection' },
      { id: 'featured_products', enabled: true, title: 'Our Catalog', subtitle: 'Explore all available items' },
      { id: 'delivery_payment', enabled: true, title: 'Delivery & Payment Policies', subtitle: 'Fast and reliable delivery across Myanmar' },
      { id: 'customer_lookup', enabled: true, title: 'Order & Support Lookup', subtitle: 'Track your order status with your support code' }
    ]
  },
  productDisplay: {
    gridColumns: 3,
    layoutDensity: 'comfortable',
    cardRadius: '2xl',
    cardShadow: 'lg',
    imageAspectRatio: 'square',
    imageFit: 'cover',
    imagePadding: 0,
    showDiscountBadge: true,
    showStockBadge: true,
    buttonStyle: 'solid'
  },
  buttons: {
    buttonPrimaryBg: '#121212',
    buttonPrimaryText: '#FFFFFF',
    buttonRadius: 'full'
  },
  footer: {
    footerBgColor: '#FFFFFF',
    footerTextColor: '#555555',
    showContact: true,
    showSocial: true,
    socialLinks: { facebook: '', viber: '', telegram: '', tiktok: '', phone: '' },
    copyrightText: 'Official Verified Storefront. All rights reserved.'
  }
};

function mergeThemeWithDefaults(partial?: Partial<StorefrontThemeConfig> | null): StorefrontThemeConfig {
  if (!partial) return DEFAULT_THEME;
  return {
    ...DEFAULT_THEME,
    ...partial,
    brand: { ...DEFAULT_THEME.brand, ...(partial.brand || {}) },
    background: { ...DEFAULT_THEME.background, ...(partial.background || {}) },
    typography: { ...DEFAULT_THEME.typography, ...(partial.typography || {}) },
    header: { ...DEFAULT_THEME.header, ...(partial.header || {}) },
    homepage: {
      ...DEFAULT_THEME.homepage,
      ...(partial.homepage || {}),
      sections:
        Array.isArray(partial.homepage?.sections) && partial.homepage.sections.length > 0
          ? partial.homepage.sections
          : DEFAULT_THEME.homepage.sections,
    },
    productDisplay: { ...DEFAULT_THEME.productDisplay, ...(partial.productDisplay || {}) },
    buttons: { ...DEFAULT_THEME.buttons, ...(partial.buttons || {}) },
    footer: {
      ...DEFAULT_THEME.footer,
      ...(partial.footer || {}),
      socialLinks: {
        ...DEFAULT_THEME.footer.socialLinks,
        ...(partial.footer?.socialLinks || {}),
      },
    },
  };
}

const FORCED_GRID_COLS_CLASS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

const RESPONSIVE_LG_GRID_COLS_CLASS: Record<number, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

const StorefrontProductCard: React.FC<{
  product: Product;
  isHighlighted: boolean;
  selectedVariantId?: string;
  onSelectVariant: (variantId: string) => void;
  onAddToCart: (qty?: number) => void;
  cartQty: number;
  lang: 'my' | 'en';
  theme: StorefrontThemeConfig;
}> = ({ product, isHighlighted, selectedVariantId, onSelectVariant, onAddToCart, cartQty, lang, theme }) => {
  const [imgError, setImgError] = useState(false);
  const activeVariants = product.variants || [];
  const currentVariantId = selectedVariantId || activeVariants[0]?.id;
  const currentVariant = activeVariants.find((v) => v.id === currentVariantId) || activeVariants[0];
  const totalStock = activeVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  const display = theme.productDisplay;
  const isGrocery = theme.industryProfile === 'grocery';

  return (
    <div
      id={`product-${product.id}`}
      className={`group flex flex-col h-full transition-all duration-500 bg-white border border-[var(--border-hairline)] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1`}
      style={{ borderRadius: 'var(--card-radius)' }}
    >
      {/* Aspect Ratio Box */}
      <div className="relative w-full aspect-[var(--card-aspect-ratio)] overflow-hidden bg-[var(--surface-subtle)]">
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className={`w-full h-full transition-transform duration-700 group-hover:scale-110`}
            style={{ 
              objectFit: 'var(--card-image-fit)' as any, 
              padding: 'var(--card-image-padding)' 
            }}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--surface-subtle)]">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-2 border border-white/5 shadow-inner">
               <span className="text-sm font-black opacity-20 tracking-tighter uppercase italic">{product.name.substring(0, 2)}</span>
            </div>
            <ShoppingBasket className="w-6 h-6 mb-2 opacity-10" />
            {display.showSkuOnCard && (
               <span className="text-[9px] font-bold tracking-[0.2em] opacity-20 uppercase">{product.sku}</span>
            )}
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {display.showDiscountBadge && product.discount && (
            <span className="px-2.5 py-1 bg-rose-600 text-white text-[10px] font-black uppercase tracking-tight rounded-sm">
              {product.discount}
            </span>
          )}
          {totalStock <= 0 && (
            <span className="px-2.5 py-1 bg-black/80 text-white text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
              {lang === 'my' ? 'ပစ္စည်းကုန်' : 'Sold Out'}
            </span>
          )}
          {totalStock > 0 && totalStock <= 5 && display.showStockBadge && (
            <span className="px-2.5 py-1 bg-amber-500/90 text-black text-[10px] font-black uppercase tracking-tight rounded-sm">
              {lang === 'my' ? `လက်ကျန် ${totalStock}` : `${totalStock} Left`}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="text-[13px] font-bold text-[var(--text-primary)] leading-[1.5] pb-[0.1em] line-clamp-2 uppercase tracking-tight">
              {product.name}
            </h3>
          </div>
          {display.showSkuOnCard && (
            <div className="text-[9px] font-medium text-[var(--text-secondary)] opacity-40 uppercase tracking-widest mb-1.5">
               SKU: {product.sku}
            </div>
          )}
          <div className="flex items-baseline gap-2 mb-3">
             <span className="text-sm font-extrabold text-[var(--brand-primary)] tabular-nums">
               {product.price.toLocaleString()} MMK
             </span>
          </div>
          
          {/* Grocery Inline Stepper or Fashion Color Swatches would go here */}
          {isGrocery && totalStock > 0 && (
            <div className="mt-auto pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between">
               {cartQty > 0 ? (
                 <div className="flex items-center gap-4 bg-[var(--surface-subtle)] px-3 py-1.5 rounded-full border border-[var(--border-hairline)]">
                    <button onClick={() => onAddToCart(-1)} className="p-1 hover:text-[var(--brand-primary)] transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                    <span className="text-xs font-black tabular-nums">{cartQty}</span>
                    <button onClick={() => onAddToCart(1)} className="p-1 hover:text-[var(--brand-primary)] transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                 </div>
               ) : (
                 <button 
                   onClick={() => onAddToCart(1)}
                   className="w-full py-2 bg-[var(--brand-primary)] text-[var(--brand-on-primary)] text-[10px] font-black uppercase tracking-widest rounded-full hover:brightness-110 transition-all flex items-center justify-center gap-2"
                 >
                    <Plus className="w-3.5 h-3.5" /> {lang === 'my' ? 'ခြင်းတောင်းထဲသို့' : 'Add to Cart'}
                 </button>
               )}
            </div>
          )}

          {!isGrocery && display.showBuyButtonOnCard !== false && (
             <div className="mt-auto pt-3">
                <button 
                   onClick={() => onAddToCart(1)}
                   disabled={totalStock <= 0}
                   className="w-full py-2.5 border-2 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-[var(--brand-on-primary)] text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                   style={{ borderRadius: 'var(--card-radius)' }}
                >
                   {lang === 'my' ? 'ခြင်းတောင်းထဲသို့' : 'Add to Cart'}
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CustomerStorefrontView: React.FC<CustomerStorefrontViewProps> = ({
  slug,
  onNavigateToMerchant,
  onNavigateToMarketplace,
  initialProductId,
  previewTheme,
  previewStore,
  previewProducts,
  isPreviewMode,
  viewport = 'auto'
}) => {
  const [store, setStore] = useState<StoreSettings | null>(previewStore || null);
  const [products, setProducts] = useState<Product[]>(previewProducts || []);
  const [theme, setTheme] = useState<StorefrontThemeConfig>(previewTheme || DEFAULT_THEME);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(!previewStore);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lang, setLang] = useState<'my' | 'en'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeCategory, setActiveSection] = useState('all');
  const [hasCreatedOrder, setHasCreatedOrder] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Forced Viewport Helpers
  const isMobileView = viewport === 'mobile';
  const isTabletView = viewport === 'tablet';
  const isDesktopView = viewport === 'desktop';
  const isForced = viewport !== 'auto';

  const gridCols = useMemo(() => {
    if (isMobileView) return 2;
    if (isTabletView) return 3;
    if (isDesktopView) return theme.productDisplay.gridColumns;
    return null; // Let Tailwind responsive classes handle it
  }, [viewport, theme.productDisplay.gridColumns, isMobileView, isTabletView, isDesktopView]);

  // Theme variable injection (safe deep merge so partial theme configs never crash)
  const activeTheme = useMemo(
    () => mergeThemeWithDefaults(previewTheme || theme),
    [previewTheme, theme]
  );

  const themeVars = useMemo(() => {
    const b = activeTheme.brand;
    const d = activeTheme.productDisplay;

    let aspect = '1 / 1';
    if (d.imageAspectRatio === 'portrait' || activeTheme.industryProfile === 'fashion' || activeTheme.industryProfile === 'cosmetics') aspect = '4 / 5';
    if (d.imageAspectRatio === 'landscape' || activeTheme.industryProfile === 'home') aspect = '4 / 3';

    const s = activeTheme.background.surfaceTheme || 'light';
    const surfaceCanvas = s === 'dark' ? '#0B0B0E' : (s === 'ivory' ? '#FAF8F5' : '#FFFFFF');
    const surfaceElevated = s === 'dark' ? '#141419' : '#FFFFFF';
    const surfaceSubtle = s === 'dark' ? '#1C1C24' : (s === 'ivory' ? '#F3EFEA' : '#F6F6F4');
    const textPrimary = s === 'dark' ? '#F8FAFC' : '#121212';
    const textSecondary = s === 'dark' ? '#94A3B8' : '#555555';
    const borderHairline = s === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    return {
      '--surface-canvas': surfaceCanvas,
      '--surface-elevated': surfaceElevated,
      '--surface-subtle': surfaceSubtle,
      '--text-primary': textPrimary,
      '--text-secondary': textSecondary,
      '--brand-primary': b.primaryColor || '#121212',
      '--brand-on-primary': activeTheme.buttons.buttonPrimaryText || '#FFFFFF',
      '--border-hairline': borderHairline,
      '--card-aspect-ratio': aspect,
      '--card-image-fit': d.imageFit || 'cover',
      '--card-image-padding': `${d.imagePadding || 0}px`,
      '--card-radius': d.cardRadius === 'none' ? '0px' : d.cardRadius === 'xl' ? '12px' : d.cardRadius === '3xl' ? '24px' : '16px',
      '--font-heading': activeTheme.typography.headingFont || 'Plus Jakarta Sans',
      '--font-body': activeTheme.typography.bodyFont || 'Plus Jakarta Sans',
    } as React.CSSProperties;
  }, [activeTheme]);

  useEffect(() => {
    if (previewStore) setStore(previewStore);
  }, [previewStore]);

  useEffect(() => {
    if (previewProducts) setProducts(previewProducts);
  }, [previewProducts]);

  useEffect(() => {
    if (previewTheme) setTheme(previewTheme);
  }, [previewTheme]);

  const fetchStoreData = useCallback(async () => {
    // If in preview mode with store and products already supplied, no network call required
    if (isPreviewMode && previewStore && previewProducts && previewProducts.length > 0) {
      setLoading(false);
      setNotFound(false);
      return;
    }
    try {
      setLoading(true);
      setFetchError(null);
      const targetSlug = slug || 'yangon-style';
      const res = await fetch(`/api/public/store/${encodeURIComponent(targetSlug)}`);
      if (res.status === 404) {
        if (!isPreviewMode) setNotFound(true);
        return;
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Failed to load store (${res.status})`);
      }
      const data = await res.json();
      if (!data?.merchant) {
        if (!isPreviewMode) setNotFound(true);
        return;
      }
      const m = data.merchant;
      const s = m.store || {};
      const formattedStore: StoreSettings = {
        slug: s.slug || targetSlug,
        storeName: s.storeName || m.shopName || 'ShopSone Store',
        description: s.description || m.description || '',
        tagline: s.tagline || m.tagline || '',
        logoUrl: s.logoUrl || m.logoUrl || '',
        coverUrl: s.coverUrl || '',
        deliveryInfo: s.deliveryInfo || m.deliveryInfo || 'Yangon city-wide delivery within 2-3 days.',
        paymentInstructions: s.paymentInstructions || m.paymentInstructions || '',
        isPublished: s.isPublished !== false,
        themeConfig: s.themeConfig || (m as any).themeConfig,
        draftThemeConfig: s.draftThemeConfig
      };
      setStore(prev => previewStore || formattedStore);
      setProducts(prev => (previewProducts && previewProducts.length > 0) ? previewProducts : (data.products || []));
      if (!previewTheme && formattedStore.themeConfig) {
        setTheme(mergeThemeWithDefaults(formattedStore.themeConfig));
      }
      setNotFound(false);
    } catch (err: any) {
      setFetchError(err?.message || 'Unable to load storefront.');
    } finally {
      setLoading(false);
    }
  }, [slug, isPreviewMode, previewStore, previewProducts, previewTheme]);

  useEffect(() => { fetchStoreData(); }, [fetchStoreData]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const addToCart = (product: Product, variantId?: string, qty = 1) => {
    const variants = product.variants || [];
    const vId = variantId || variants[0]?.id || 'default';
    const variant = variants.find(v => v.id === vId) || variants[0];
    if (!variant) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.variantId === vId);
      if (existing) {
        const newQty = Math.max(0, existing.qty + qty);
        if (newQty === 0) return prev.filter(item => item !== existing);
        return prev.map(item => item === existing ? { ...item, qty: newQty } : item);
      }
      if (qty <= 0) return prev;
      return [...prev, {
        productId: product.id,
        variantId: vId,
        name: product.name,
        variantName: `${variant.color || 'Standard'} / ${variant.size || 'Free'}`,
        price: Number(product.price) || 0,
        qty: 1,
        maxStock: Number(variant.stock) || 0,
        imageUrl: product.imageUrl
      }];
    });
  };

  const categories = useMemo(() => {
    const cats = products.map(p => p.category).filter((c): c is string => Boolean(c));
    return ['all', ...Array.from(new Set(cats))];
  }, [products]);

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q);
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const announcementText = useMemo(() => {
    if (activeTheme.header?.announcementText && activeTheme.header.announcementText.trim()) {
      return activeTheme.header.announcementText.trim();
    }
    if (store?.deliveryInfo && store.deliveryInfo.trim()) {
      const firstLine = store.deliveryInfo.split('\n')[0].trim();
      if (firstLine.length > 0 && firstLine.length <= 70) {
        return firstLine;
      }
    }
    if (store?.tagline && store.tagline.trim()) {
      return store.tagline.trim();
    }
    return lang === 'my'
      ? 'တစ်နိုင်ငံလုံး အိမ်အရောက် ပို့ဆောင်ပေးပါသည်'
      : 'Complimentary Express Delivery Across Myanmar';
  }, [activeTheme.header?.announcementText, store?.deliveryInfo, store?.tagline, lang]);

  if (loading && !isPreviewMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0C0C0F] text-slate-200 gap-3">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-xs text-slate-400 font-mono">
          {lang === 'my' ? 'စတိုးဆိုင် ဖွင့်နေပါသည်...' : 'Loading storefront...'}
        </p>
      </div>
    );
  }

  if (fetchError && !isPreviewMode) {
    return (
      <div className="min-h-screen bg-[#0C0C0F] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#141419] border border-rose-500/25 rounded-3xl p-8 shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">
              {lang === 'my' ? 'စတိုးဆိုင် ဖွင့်ရာတွင် အမှားဖြစ်နေပါသည်' : 'Unable to Open Storefront'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">{fetchError}</p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={fetchStoreData}
              className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{lang === 'my' ? 'ထပ်မံကြိုးစားမည်' : 'Retry'}</span>
            </button>
            {onNavigateToMerchant && (
              <button
                type="button"
                onClick={onNavigateToMerchant}
                className="py-2.5 px-4 bg-white/5 border border-white/10 text-slate-300 font-bold text-xs rounded-xl hover:bg-white/10 transition-all cursor-pointer"
              >
                {lang === 'my' ? 'ပင်မစာမျက်နှာ' : 'Back'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (notFound && !isPreviewMode) {
    return (
      <div className="min-h-screen bg-[#0C0C0F] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#141419] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-mono tracking-widest text-amber-400 uppercase font-bold">404 NOT FOUND</span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {lang === 'my' ? 'စတိုးဆိုင် ရှာမတွေ့ပါ' : 'Storefront Not Found'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'my'
                ? `"${slug}" အမည်ရှိ စတိုးဆိုင်ကို ရှာမတွေ့နိုင်ပါ။ လိပ်စာမှန်ကန်မှု ရှိမရှိ စစ်ဆေးပါ သို့မဟုတ် ShopSone Marketplace သို့ သွားရောက်ကြည့်ရှုပါ။`
                : `The storefront "${slug}" could not be found or has not been published yet. Please check the URL or browse other stores on ShopSone.`}
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {onNavigateToMarketplace && (
              <button
                onClick={onNavigateToMarketplace}
                className="flex-1 py-3 px-4 bg-white text-black font-bold text-xs rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{lang === 'my' ? 'ဆိုင်စုံ Marketplace သို့' : 'Explore Marketplace'}</span>
              </button>
            )}
            {onNavigateToMerchant && (
              <button
                onClick={onNavigateToMerchant}
                className="py-3 px-4 bg-white/5 border border-white/10 text-slate-300 font-bold text-xs rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{lang === 'my' ? 'ပင်မစာမျက်နှာ' : 'Home'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={themeVars} className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-secondary)] font-sans selection:bg-[var(--brand-primary)] selection:text-[var(--brand-on-primary)] overflow-x-hidden">
      {/* Compact Storefront / Merchant Navigation Bar when viewed directly */}
      {!isPreviewMode && (onNavigateToMerchant || onNavigateToMarketplace) && (
        <div className="bg-slate-950 text-slate-200 border-b border-white/10 px-4 py-2 text-[11px] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Store className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="font-semibold truncate text-white">
              {store?.storeName || slug}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onNavigateToMarketplace && (
              <button
                type="button"
                onClick={onNavigateToMarketplace}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold cursor-pointer transition-colors"
              >
                {lang === 'my' ? 'ဆိုင်စုံ (Marketplace)' : 'Marketplace'}
              </button>
            )}
            {onNavigateToMerchant && (
              <button
                type="button"
                onClick={onNavigateToMerchant}
                className="px-2.5 py-1 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white font-semibold cursor-pointer transition-colors"
              >
                {lang === 'my' ? 'Merchant Panel သို့' : 'Merchant Panel'}
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* TIER 1: Announcement Bar - Ultra-Clean Single-Line Ribbon */}
      {activeTheme.header?.showAnnouncement !== false && announcementText && (
        <div className="bg-[#121212] text-white h-[34px] min-h-[34px] px-3 sm:px-4 flex items-center justify-center border-b border-white/[0.06] select-none overflow-hidden">
          <div className="max-w-7xl w-full mx-auto flex items-center justify-center">
            <div className="flex items-center justify-center gap-2 max-w-full min-w-0">
              <Truck className="w-3.5 h-3.5 shrink-0 text-white/70" />
              <span className="text-[11px] sm:text-[11.5px] font-medium tracking-[0.03em] uppercase text-white/95 whitespace-nowrap overflow-hidden text-ellipsis block py-0.5 max-w-[85vw] sm:max-w-none">
                {announcementText}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TIER 2: Main Glassmorphic Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b border-[var(--border-hairline)] bg-[color-mix(in_srgb,var(--surface-canvas)_85%,transparent)] transition-all duration-300`}>
        <div className={`max-w-7xl mx-auto px-4 ${isMobileView ? 'h-16' : 'sm:px-6 lg:px-8 h-16 sm:h-[76px]'} flex items-center justify-between gap-4`}>
           
           {/* Left Zone: Search Trigger */}
           <div className="flex-1 flex items-center">
              <button 
                onClick={() => setIsSearchOpen(true)}
                className={`group flex items-center gap-3 h-11 px-4 rounded-full bg-[var(--surface-subtle)] hover:bg-[var(--border-hairline)] transition-all border border-transparent hover:border-[var(--border-hairline)] ${isMobileView ? 'w-11 px-0 justify-center' : 'max-w-[240px]'}`}
              >
                 <Search className="w-4 h-4 text-[var(--text-primary)] opacity-40 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                 {!isMobileView && (
                   <span className={`${isForced ? '' : 'hidden md:inline'} text-[13px] text-[var(--text-secondary)] opacity-60`}>
                     {lang === 'my' ? 'ပစ္စည်းရှာရန်...' : 'Search items...'}
                   </span>
                 )}
              </button>
           </div>

           {/* Center Zone: Brand Wordmark - Strict Layout */}
           <div className="flex-1 flex flex-col items-center min-w-0 px-2">
              {activeTheme.brand.logoUrl ? (
                <img src={activeTheme.brand.logoUrl} alt="Logo" className={isMobileView ? "h-7 object-contain" : "h-8 sm:h-9 object-contain"} />
              ) : (
                <div className="flex flex-col items-center text-center w-full min-w-0">
                  <h1 className={`font-black text-[var(--text-primary)] uppercase tracking-tighter leading-[1.3] py-0.5 truncate w-full ${isMobileView ? 'text-[13px]' : 'text-sm sm:text-xl'}`}>
                    {store?.storeName || 'ShopSone'}
                  </h1>
                  {!isMobileView && (
                    <div className="flex items-center gap-1 opacity-60">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-[8px] font-bold tracking-widest text-[var(--text-secondary)] uppercase whitespace-nowrap">Official Verified</span>
                    </div>
                  )}
                </div>
              )}
           </div>

           {/* Right Action Zone - Compact */}
           <div className="flex-1 flex items-center justify-end gap-1 sm:gap-2 shrink-0">
              <button 
                className={`${isMobileView ? 'hidden' : (isForced ? 'flex' : 'hidden sm:flex')} items-center gap-1.5 h-8 px-3 rounded-full border border-[var(--border-hairline)] bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all text-[9px] font-black uppercase tracking-wider text-[var(--text-primary)]`}
                onClick={() => {}}
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>AI</span>
              </button>
 
              <button 
                onClick={() => setIsCartOpen(true)}
                className={`relative ${isMobileView ? 'p-2' : 'p-2.5'} text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] rounded-full transition-all group`}
              >
                <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                {cart.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-[var(--brand-primary)] text-[var(--brand-on-primary)] text-[8px] font-black rounded-full flex items-center justify-center border border-[var(--surface-canvas)] px-1 tabular-nums">
                    {cart.reduce((s, i) => s + i.qty, 0)}
                  </span>
                )}
              </button>
           </div>
        </div>
      </header>

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-[var(--surface-canvas)] animate-in fade-in duration-300">
           <div className={`max-w-4xl mx-auto px-6 ${isMobileView ? 'pt-10' : 'pt-12 sm:pt-20'}`}>
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-xl font-black uppercase tracking-tight text-[var(--text-primary)]">Spotlight Search</h2>
                 <button onClick={() => setIsSearchOpen(false)} className="p-2 hover:bg-[var(--surface-subtle)] rounded-full transition-all">
                    <X className="w-6 h-6 text-[var(--text-primary)]" />
                 </button>
              </div>
              <div className="relative group">
                 <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 opacity-20 group-focus-within:opacity-100 transition-opacity" />
                 <input 
                   ref={searchInputRef}
                   type="text" 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   placeholder={lang === 'my' ? 'ဘာရှာဖွေချင်ပါသလဲ...' : 'Search for products, brands, colors...'}
                   className={`w-full pl-12 py-6 bg-transparent border-b-2 border-[var(--border-hairline)] focus:border-[var(--brand-primary)] ${isMobileView ? 'text-lg' : 'text-2xl'} font-bold text-[var(--text-primary)] placeholder:text-slate-300 focus:outline-none transition-colors`}
                 />
              </div>

              <div className="mt-12 space-y-6">
                 <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Quick Browse Categories</h3>
                    <div className="flex flex-wrap gap-2">
                       {categories.map(cat => (
                          <button 
                            key={cat}
                            onClick={() => { setActiveSection(cat); setIsSearchOpen(false); }}
                            className="px-5 py-2.5 rounded-full border border-[var(--border-hairline)] text-[13px] font-bold hover:bg-[var(--brand-primary)] hover:text-[var(--brand-on-primary)] transition-all"
                          >
                             {cat === 'all' ? (lang === 'my' ? 'အားလုံး' : 'All Products') : cat}
                          </button>
                       ))}
                    </div>
                 </div>
                 
                 {searchQuery && (
                    <div className="pt-6">
                       <p className="text-sm font-medium">Found {filteredProducts.length} results matching "{searchQuery}"</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* TIER 3: Category Pill Rail & Filter Bar */}
      <div className={`sticky ${isMobileView ? 'top-16' : 'top-16 sm:top-[76px]'} z-40 bg-[var(--surface-canvas)]/90 backdrop-blur-md border-b border-[var(--border-hairline)]`}>
        <div className={`max-w-7xl mx-auto px-4 flex items-center justify-between ${isMobileView ? '' : 'sm:px-6 lg:px-8'}`}>
           <div className="flex-1 overflow-x-auto no-scrollbar py-3 pr-8 flex items-center gap-2">
              {categories.map(cat => (
                 <button 
                   key={cat}
                   onClick={() => setActiveSection(cat)}
                   className={`px-5 h-[38px] rounded-full text-[13px] font-bold whitespace-nowrap transition-all flex items-center justify-center ${
                     activeCategory === cat 
                       ? 'bg-[var(--brand-primary)] text-[var(--brand-on-primary)] shadow-lg shadow-[var(--brand-primary)]/10' 
                       : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-transparent hover:border-[var(--border-hairline)]'
                   }`}
                 >
                   {cat === 'all' ? (lang === 'my' ? 'အားလုံး' : 'All') : cat}
                 </button>
              ))}
           </div>
           <button className="h-[38px] px-4 rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)] flex items-center gap-2 hover:bg-[var(--brand-primary)] hover:text-[var(--brand-on-primary)] transition-all shrink-0">
              <Sliders className="w-3.5 h-3.5" />
              <span className={`${isMobileView ? 'hidden' : (isForced ? 'inline' : 'hidden sm:inline')} text-[11px] font-black uppercase tracking-wider`}>Sort / Filter</span>
           </button>
        </div>
      </div>

      <main>
        {/* Editorial Hero Section - Adaptive */}
        {activeTheme.homepage.heroStyle !== 'hidden' && (
          <section className="bg-[var(--surface-subtle)] border-b border-[var(--border-hairline)]">
             <div className={`max-w-7xl mx-auto px-4 ${activeTheme.homepage.heroStyle === 'compact' ? 'py-10' : 'sm:px-6 lg:px-8 py-16 sm:py-24'}`}>
                <div className={`max-w-3xl space-y-4 ${isMobileView || activeTheme.homepage.heroStyle === 'compact' ? 'text-center items-center flex flex-col' : ''}`}>
                   <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] opacity-60">
                      <div className="w-8 h-[1px] bg-[var(--brand-primary)] opacity-40" />
                      <span>{store?.brandName || 'Official Boutique'}</span>
                   </div>
                   <h1 className={`font-black text-[var(--text-primary)] leading-[1.3] tracking-tight uppercase ${activeTheme.homepage.heroStyle === 'compact' ? 'text-2xl sm:text-4xl' : 'text-3xl sm:text-6xl lg:text-7xl'}`}>
                      {store?.storeName || 'ShopsOne'} 
                      {activeTheme.homepage.heroStyle !== 'compact' && (
                        <>
                          <br />
                          <span className="opacity-30 italic font-medium lowercase tracking-normal font-serif px-2">Editorial</span>
                        </>
                      )}
                   </h1>
                   <p className={`font-medium text-[var(--text-secondary)] leading-relaxed max-w-xl opacity-70 ${activeTheme.homepage.heroStyle === 'compact' ? 'text-xs' : 'text-sm sm:text-lg'}`}>
                      {store?.description || activeTheme.brand.description}
                   </p>
                   
                   <div className={`pt-4 flex flex-wrap gap-2 ${isMobileView || activeTheme.homepage.heroStyle === 'compact' ? 'justify-center' : ''} overflow-x-auto no-scrollbar max-w-full`}>
                      {[
                        { icon: CheckCircle2, text: lang === 'my' ? 'အိမ်အရောက်ငွေ' : 'C.O.D' },
                        { icon: ShieldCheck, text: lang === 'my' ? 'ယုံကြည်ရသော' : 'Verified' },
                        { icon: Zap, text: lang === 'my' ? 'အမြန်ပို့' : 'Express' }
                      ].map((pill, i) => (
                         <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/40 backdrop-blur-md rounded-full border border-white/20 shadow-sm shrink-0">
                            <pill.icon className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] font-bold uppercase tracking-tight text-[var(--text-primary)] opacity-80">{pill.text}</span>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </section>
        )}

        {/* Product Grid Section */}
        <section className={`max-w-7xl mx-auto px-4 ${isMobileView ? 'py-8' : 'sm:px-6 lg:px-8 py-12 sm:py-20'}`}>
           <div className={`flex items-end justify-between ${isMobileView ? 'mb-6' : 'mb-12'}`}>
              <div className="space-y-2">
                 <h2 className={`font-black text-[var(--text-primary)] uppercase tracking-tight ${isMobileView ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>
                    {activeCategory === 'all' ? (lang === 'my' ? 'ပစ္စည်းအားလုံး' : 'Collection') : activeCategory}
                 </h2>
                 <p className="text-xs sm:text-sm font-bold opacity-40 uppercase tracking-widest">{filteredProducts.length} Items Available</p>
              </div>
           </div>

           <div className={`grid ${isMobileView ? 'gap-4 grid-cols-2' : (isForced ? `gap-8 ${FORCED_GRID_COLS_CLASS[gridCols || 3] || 'grid-cols-3'}` : `gap-4 sm:gap-8 grid-cols-2 md:grid-cols-3 ${RESPONSIVE_LG_GRID_COLS_CLASS[activeTheme.productDisplay.gridColumns] || 'lg:grid-cols-3'}`)}`}>
              {filteredProducts.map(product => (
                <StorefrontProductCard 
                  key={product.id}
                  product={product}
                  isHighlighted={false}
                  lang={lang}
                  theme={activeTheme}
                  cartQty={cart.find(i => i.productId === product.id)?.qty || 0}
                  onAddToCart={(q) => addToCart(product, undefined, q)}
                  onSelectVariant={() => {}}
                />
              ))}
           </div>

           {filteredProducts.length === 0 && (
              <div className="py-32 text-center space-y-4">
                 <ShoppingBasket className="w-16 h-16 mx-auto opacity-10" />
                 <p className="text-lg font-bold opacity-30 uppercase tracking-widest">No matching items found</p>
                 <button 
                   onClick={() => { setSearchQuery(''); setActiveSection('all'); }}
                   className="text-xs font-black uppercase underline tracking-[0.2em]"
                 >
                   Clear all filters
                 </button>
              </div>
           )}
        </section>
      </main>

      {/* Cart Slider */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
           <div className="relative w-full max-w-md bg-[var(--surface-canvas)] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b border-[var(--border-hairline)] flex items-center justify-between">
                 <h2 className="text-lg font-black uppercase tracking-widest text-[var(--text-primary)]">Your Bag</h2>
                 <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-[var(--surface-subtle)] rounded-full transition-colors">
                    <Plus className="w-6 h-6 rotate-45" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-10">
                       <ShoppingBasket className="w-16 h-16 mb-4" />
                       <p className="text-sm font-bold uppercase tracking-widest">Your bag is empty</p>
                    </div>
                 ) : (
                   cart.map((item, i) => (
                     <div key={i} className="flex gap-4">
                        <div className="w-20 h-24 bg-[var(--surface-subtle)] rounded-lg overflow-hidden shrink-0">
                           <img src={item.imageUrl || ''} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between gap-2">
                              <h4 className="text-xs font-black uppercase text-[var(--text-primary)] truncate">{item.name}</h4>
                              <span className="text-xs font-black tabular-nums">{item.price.toLocaleString()} MMK</span>
                           </div>
                           <p className="text-[10px] opacity-60 mt-1">{item.variantName}</p>
                           <div className="mt-4 flex items-center gap-3">
                              <button onClick={() => addToCart({id: item.productId} as any, item.variantId, -1)} className="p-1 border border-[var(--border-hairline)] rounded hover:bg-[var(--surface-subtle)]"><Minus className="w-3 h-3" /></button>
                              <span className="text-xs font-black tabular-nums">{item.qty}</span>
                              <button onClick={() => addToCart({id: item.productId} as any, item.variantId, 1)} className="p-1 border border-[var(--border-hairline)] rounded hover:bg-[var(--surface-subtle)]"><Plus className="w-3 h-3" /></button>
                           </div>
                        </div>
                     </div>
                   ))
                 )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-[var(--border-hairline)] bg-[var(--surface-subtle)] space-y-4">
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-widest opacity-60">Total</span>
                      <span className="text-xl font-black text-[var(--text-primary)] tabular-nums">{cart.reduce((s, i) => s + i.price * i.qty, 0).toLocaleString()} MMK</span>
                   </div>
                   <button 
                     onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
                     className="w-full py-4 bg-[var(--brand-primary)] text-[var(--brand-on-primary)] text-xs font-black uppercase tracking-[0.2em] rounded-full shadow-xl hover:brightness-110 active:scale-95 transition-all"
                   >
                     Checkout Now
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

      {isCheckoutOpen && (
        <CheckoutWorkflowModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          store={store}
          products={products}
          lang={lang}
          cart={cart}
          onOrderCreated={setHasCreatedOrder as any}
          onNavigateToSupport={() => {}}
        />
      )}
    </div>
  );
};
