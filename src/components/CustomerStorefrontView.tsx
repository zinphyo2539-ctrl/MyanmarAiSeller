import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ExternalLink
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
  brand: {
    logoUrl: '',
    faviconUrl: '',
    storeName: 'Official Store',
    tagline: 'Premium Commerce & Fashion',
    description: 'Welcome to our official branded storefront.',
    primaryColor: '#C9A227',
    secondaryColor: '#393426',
    accentColor: '#E0BD55',
    headingTextColor: '#FFFFFF',
    bodyTextColor: '#B9B5A7',
    surfaceColor: '#181810',
    surfaceBorderColor: 'rgba(255, 255, 255, 0.08)'
  },
  background: {
    storeBgImage: '',
    storeBgColor: '#0B0B09',
    heroBgImage: '',
    bannerBgImage: '',
    bgPosition: 'center',
    bgSize: 'cover',
    bgRepeat: 'no-repeat',
    overlayColor: '#0B0B09',
    overlayOpacity: 40
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
    headerBgColor: 'rgba(11, 11, 9, 0.85)',
    headerTextColor: '#FFFFFF',
    showNavigation: true,
    showSearch: true,
    showCart: true,
    stickyHeader: true
  },
  homepage: {
    sections: [
      { id: 'hero', enabled: true, title: 'Welcome to our Official Storefront', subtitle: 'Curated premium collection' },
      { id: 'customer_lookup', enabled: true, title: 'Order & Support Lookup', subtitle: 'Track your order status with your support code' },
      { id: 'delivery_payment', enabled: true, title: 'Delivery & Payment Policies', subtitle: 'Fast and reliable delivery across Myanmar' },
      { id: 'featured_products', enabled: true, title: 'Our Catalog', subtitle: 'Explore all available items' }
    ]
  },
  productDisplay: {
    gridColumns: 3,
    cardRadius: '2xl',
    cardShadow: 'lg',
    imageAspectRatio: 'square',
    imageFit: 'cover',
    showDiscountBadge: true,
    showStockBadge: true,
    buttonStyle: 'gradient'
  },
  buttons: {
    buttonPrimaryBg: '#C9A227',
    buttonPrimaryText: '#0B0B09',
    buttonRadius: 'full'
  },
  footer: {
    footerBgColor: '#0B0B09',
    footerTextColor: '#8C887B',
    showContact: true,
    showSocial: true,
    socialLinks: {
      facebook: '',
      viber: '',
      telegram: '',
      tiktok: '',
      phone: ''
    },
    copyrightText: 'Official Verified Storefront. All rights reserved.'
  }
};

const StorefrontProductCard: React.FC<{
  product: Product;
  isHighlighted: boolean;
  selectedVariantId?: string;
  onSelectVariant: (variantId: string) => void;
  onAddToCart: () => void;
  lang: 'my' | 'en';
  theme: StorefrontThemeConfig;
}> = ({ product, isHighlighted, selectedVariantId, onSelectVariant, onAddToCart, lang, theme }) => {
  const [imgError, setImgError] = useState(false);
  const activeVariants = product.variants || [];
  const currentVariantId = selectedVariantId || activeVariants[0]?.id;
  const currentVariant = activeVariants.find((v) => v.id === currentVariantId) || activeVariants[0];
  const isOutOfStock = !currentVariant || currentVariant.stock <= 0;
  const totalStock = activeVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  const display = theme.productDisplay;
  const brand = theme.brand;

  // Aspect ratio class
  const aspectClass =
    display.imageAspectRatio === 'portrait'
      ? 'aspect-[3/4]'
      : display.imageAspectRatio === 'landscape'
      ? 'aspect-video'
      : 'aspect-square';

  // Corner radius style
  const radiusClass =
    display.cardRadius === 'none'
      ? 'rounded-none'
      : display.cardRadius === 'md'
      ? 'rounded-md'
      : display.cardRadius === 'xl'
      ? 'rounded-xl'
      : display.cardRadius === '3xl'
      ? 'rounded-3xl'
      : 'rounded-2xl';

  return (
    <div
      id={`product-${product.id}`}
      style={{
        backgroundColor: brand.surfaceColor || '#181810',
        borderColor: isHighlighted ? brand.primaryColor : brand.surfaceBorderColor || 'rgba(255,255,255,0.08)'
      }}
      className={`border overflow-hidden flex flex-col justify-between transition-all duration-300 group shadow-xl ${radiusClass} ${
        isHighlighted
          ? 'ring-2 shadow-2xl scale-[1.01]'
          : 'hover:border-opacity-60'
      }`}
    >
      {/* Product Image & Badges */}
      <div className={`relative w-full overflow-hidden flex items-center justify-center border-b border-white/10 ${aspectClass}`}>
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${
              display.imageFit === 'contain' ? 'object-contain p-2' : 'object-cover'
            }`}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center bg-black/40">
            <Package className="w-10 h-10 text-slate-400 mb-1" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              {product.sku || 'CATALOG ITEM'}
            </span>
          </div>
        )}

        {/* Stock status pill */}
        {display.showStockBadge && (
          <div className="absolute top-2.5 left-2.5 z-10">
            {totalStock > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md font-bold text-[9px] uppercase tracking-wider shadow-xs">
                {lang === 'my' ? 'ပစ္စည်းရှိ' : 'In Stock'}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 backdrop-blur-md font-bold text-[9px] uppercase tracking-wider shadow-xs">
                {lang === 'my' ? 'ပစ္စည်းပြတ်' : 'Sold Out'}
              </span>
            )}
          </div>
        )}

        {/* Discount badge if present */}
        {display.showDiscountBadge && product.discount && (
          <div
            style={{ backgroundColor: brand.accentColor || '#C9A227' }}
            className="absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 rounded-md text-neutral-950 font-bold text-[10px] shadow-sm"
          >
            {product.discount}
          </div>
        )}

        {display.showStockBadge && totalStock > 0 && (
          <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-emerald-400 font-mono text-[10px] shadow-xs tabular-nums">
            {totalStock} {lang === 'my' ? 'ခုကျန်' : 'in stock'}
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3
              style={{
                color: brand.headingTextColor || '#FFFFFF',
                fontFamily: theme.typography.headingFont
              }}
              className="text-sm font-bold leading-snug transition-colors line-clamp-2"
            >
              {product.name}
            </h3>
            <span
              style={{ color: brand.primaryColor || '#C9A227' }}
              className="text-sm font-bold font-mono shrink-0 tabular-nums"
            >
              {product.price.toLocaleString()} MMK
            </span>
          </div>

          {product.description && (
            <p
              style={{ color: brand.bodyTextColor || '#B9B5A7' }}
              className="text-xs mt-1 line-clamp-2 leading-relaxed"
            >
              {product.description}
            </p>
          )}
        </div>

        {/* Variant Selector */}
        {activeVariants.length > 0 && (
          <div className="space-y-1.5 pt-2.5 border-t border-white/10">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-semibold uppercase tracking-wider">
                {lang === 'my' ? 'အရွယ်အစား / အရောင်' : 'Select Option'}
              </span>
              {currentVariant && (
                <span
                  style={{ color: brand.primaryColor || '#C9A227' }}
                  className="font-mono tabular-nums"
                >
                  {currentVariant.stock > 0
                    ? `${currentVariant.stock} ${lang === 'my' ? 'ခုကျန်' : 'avail'}`
                    : lang === 'my'
                    ? 'ကုန်နေပါသည်'
                    : 'out of stock'}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {activeVariants.map((v) => {
                const isSelected = v.id === currentVariantId;
                const isZero = v.stock <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={isZero}
                    onClick={() => onSelectVariant(v.id)}
                    style={
                      isSelected
                        ? {
                            backgroundColor: brand.primaryColor,
                            color: '#0B0B09',
                            borderColor: brand.primaryColor
                          }
                        : {}
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                      isSelected
                        ? 'font-bold shadow-sm'
                        : isZero
                        ? 'bg-white/[0.02] border-white/5 text-slate-600 opacity-40 cursor-not-allowed line-through'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    {v.color} / {v.size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        <button
          type="button"
          disabled={isOutOfStock}
          onClick={onAddToCart}
          style={
            !isOutOfStock
              ? display.buttonStyle === 'solid'
                ? { backgroundColor: brand.primaryColor, color: '#0B0B09' }
                : display.buttonStyle === 'outline'
                ? {
                    border: `1.5px solid ${brand.primaryColor}`,
                    color: brand.primaryColor,
                    backgroundColor: 'transparent'
                  }
                : {
                    background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor || brand.primaryColor})`,
                    color: '#0B0B09'
                  }
              : {}
          }
          className={`w-full py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.98] ${
            display.buttonStyle === 'pill' ? 'rounded-full' : 'rounded-xl'
          } ${
            isOutOfStock
              ? 'bg-white/[0.03] border border-white/10 text-slate-500 cursor-not-allowed'
              : 'hover:brightness-110'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>
            {isOutOfStock
              ? lang === 'my'
                ? 'ပစ္စည်း ကုန်နေပါသည်'
                : 'Out of Stock'
              : lang === 'my'
              ? 'ခြင်းတောင်းထဲထည့်မည်'
              : 'Add to Cart'}
          </span>
        </button>
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
  isPreviewMode = false
}) => {
  const [lang, setLang] = useState<'my' | 'en'>('my');
  const [copiedStoreLink, setCopiedStoreLink] = useState(false);
  const [store, setStore] = useState<StoreSettings | null>(previewStore || null);
  const [products, setProducts] = useState<Product[]>(previewProducts || []);
  const [loading, setLoading] = useState(!previewStore);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [stockOnly, setStockOnly] = useState(false);

  // Variant selection map: productId -> selected variantId
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [initialSupportCode, setInitialSupportCode] = useState<string | undefined>(undefined);
  const [hasCreatedOrder, setHasCreatedOrder] = useState(false);

  // Load public store data from authoritative API if not in preview mode
  const fetchStoreData = useCallback(async () => {
    if (previewStore) {
      setStore(previewStore);
      if (previewProducts) setProducts(previewProducts);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setFetchError(null);

    try {
      const res = await fetch(`/api/public/store/${encodeURIComponent(slug)}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load store data');
      }

      const data = await res.json();
      setStore(data.store);
      const activeProducts: Product[] = data.products || [];
      setProducts(activeProducts);

      // Pre-select first available variant for each product
      const initialVariants: Record<string, string> = {};
      activeProducts.forEach((p) => {
        if (p.variants && p.variants.length > 0) {
          const inStockVariant = p.variants.find((v) => v.stock > 0);
          initialVariants[p.id] = (inStockVariant || p.variants[0]).id;
        }
      });
      setSelectedVariants(initialVariants);
    } catch (err: any) {
      setFetchError(err.message || 'Network error occurred while fetching storefront.');
    } finally {
      setLoading(false);
    }
  }, [slug, previewStore, previewProducts]);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData]);

  // Dynamic Theme resolution
  const theme: StorefrontThemeConfig = useMemo(() => {
    if (previewTheme) return previewTheme;
    if (store?.themeConfig) return store.themeConfig;
    return {
      ...DEFAULT_THEME,
      brand: {
        ...DEFAULT_THEME.brand,
        storeName: store?.storeName || 'Official Store',
        description: store?.description || DEFAULT_THEME.brand.description,
        logoUrl: store?.logoUrl || ''
      }
    };
  }, [previewTheme, store]);

  // Copy Store Link to Clipboard
  const handleCopyStoreLink = () => {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopiedStoreLink(true);
      setTimeout(() => setCopiedStoreLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Cart Management
  const handleAddToCart = (product: Product) => {
    const activeVariants = product.variants || [];
    const variantId = selectedVariants[product.id] || activeVariants[0]?.id;
    const variant = activeVariants.find((v) => v.id === variantId) || activeVariants[0];

    if (!variant || variant.stock <= 0) return;

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.productId === product.id && i.variantId === variant.id
      );

      if (existingIdx >= 0) {
        const existingItem = prev[existingIdx];
        if (existingItem.qty >= variant.stock) return prev;
        const updated = [...prev];
        updated[existingIdx] = {
          ...existingItem,
          qty: existingItem.qty + 1
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            variantName: `${variant.color} / ${variant.size}`,
            price: product.price,
            qty: 1,
            maxStock: variant.stock,
            imageUrl: product.imageUrl
          }
        ];
      }
    });
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalCartAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const onOrderCreated = () => {
    setHasCreatedOrder(true);
    fetchStoreData();
  };

  // Filter Products
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchDesc) return false;
    }
    if (stockOnly) {
      const hasStock = p.variants?.some((v) => v.stock > 0);
      if (!hasStock) return false;
    }
    return true;
  });

  // Loading State
  if (loading && !store) {
    return (
      <div className="min-h-screen bg-[#0B0B09] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4 font-sans">
        <RefreshCw className="w-8 h-8 text-[#C9A227] animate-spin" />
        <p className="text-sm text-slate-400 font-medium font-mono">
          {lang === 'my' ? 'စတိုးအချက်အလက်များ ဆွဲတင်နေသည်...' : 'Loading Storefront...'}
        </p>
      </div>
    );
  }

  // 404 / Unpublished State
  if (notFound && !isPreviewMode) {
    return (
      <div className="min-h-screen bg-[#0B0B09] text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 bg-white/[0.05] border border-rose-500/40 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
            <Store className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              {lang === 'my' ? 'စတိုး မတွေ့ရှိပါ သို့မဟုတ် မဖွင့်သေးပါ' : 'Store Not Found or Unpublished'}
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {lang === 'my'
                ? `"${slug}" အမည်ရှိ စတိုးကို မတွေ့ရှိရပါ။ စတိုးလိပ်စာမှန်ကန်မှု ရှိမရှိ စစ်ဆေးပါ။`
                : `The storefront for "${slug}" is either unavailable or has not been published yet by the merchant.`}
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={fetchStoreData}
              className="w-full py-2.5 px-4 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-white rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-[#C9A227]" />
              <span>{lang === 'my' ? 'ပြန်လည်စစ်ဆေးမည်' : 'Retry'}</span>
            </button>
            {onNavigateToMerchant && (
              <button
                type="button"
                onClick={onNavigateToMerchant}
                className="w-full py-2 text-xs text-slate-400 hover:text-[#C9A227] transition-colors cursor-pointer"
              >
                {lang === 'my' ? 'ကုန်သည် Dashboard သို့ သွားမည်' : 'Go to Merchant Workspace'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Network Error State
  if (fetchError && !isPreviewMode) {
    return (
      <div className="min-h-screen bg-[#0B0B09] text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">
            {lang === 'my' ? 'ချိတ်ဆက်မှု အခက်အခဲ ဖြစ်ပေါ်နေပါသည်' : 'Connection Error'}
          </h2>
          <p className="text-xs text-slate-400">{fetchError}</p>
          <button
            type="button"
            onClick={fetchStoreData}
            className="px-6 py-2.5 bg-gradient-to-r from-[#C9A227] to-[#E0BD55] text-neutral-950 font-bold text-xs rounded-xl cursor-pointer"
          >
            {lang === 'my' ? 'ပြန်လည်ကြိုးစားမည်' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  // Resolve active section map
  const sectionEnabled = (id: string) => {
    const sec = theme.homepage.sections.find((s) => s.id === id);
    return sec ? sec.enabled : true;
  };

  // Dynamic grid column class
  const gridColClass =
    theme.productDisplay.gridColumns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : theme.productDisplay.gridColumns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const brand = theme.brand;
  const background = theme.background;
  const typography = theme.typography;
  const header = theme.header;
  const footer = theme.footer;

  return (
    <div
      style={{
        backgroundColor: background.storeBgColor || '#0B0B09',
        backgroundImage: background.storeBgImage ? `url(${background.storeBgImage})` : undefined,
        backgroundPosition: background.bgPosition || 'center',
        backgroundSize: background.bgSize || 'cover',
        backgroundRepeat: background.bgRepeat || 'no-repeat',
        fontFamily: typography.bodyFont || 'Plus Jakarta Sans',
        color: brand.bodyTextColor || '#B9B5A7'
      }}
      className="min-h-screen pb-32 relative overflow-hidden transition-colors selection:bg-[#C9A227] selection:text-neutral-950"
    >
      {/* Contrast Overlay Scrim */}
      <div
        style={{
          backgroundColor: background.overlayColor || '#0B0B09',
          opacity: (background.overlayOpacity ?? 40) / 100
        }}
        className="absolute inset-0 pointer-events-none z-0"
      />

      {/* Top Banner / Store Header */}
      <header
        style={{
          backgroundColor: header.headerBgColor || 'rgba(11, 11, 9, 0.85)',
          color: header.headerTextColor || '#FFFFFF'
        }}
        className={`${
          header.stickyHeader ? 'sticky top-0' : 'relative'
        } z-30 backdrop-blur-2xl border-b border-white/10 px-4 py-3.5 shadow-lg shadow-black/40`}
      >
        <div
          className={`max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 ${
            header.logoPosition === 'center' ? 'flex-col sm:flex-row' : ''
          }`}
        >
          {/* Logo & Store Title */}
          <div
            className={`flex items-center gap-3 min-w-0 ${
              header.logoPosition === 'center' ? 'justify-center text-center' : ''
            }`}
          >
            {brand.logoUrl || store?.logoUrl ? (
              <img
                src={brand.logoUrl || store?.logoUrl}
                alt={brand.storeName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-2xl object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div
                style={{
                  backgroundColor: brand.primaryColor || '#C9A227',
                  color: '#0B0B09'
                }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-md"
              >
                {(brand.storeName || 'YS').substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  style={{
                    color: brand.headingTextColor || '#FFFFFF',
                    fontFamily: typography.headingFont
                  }}
                  className="text-sm sm:text-base font-bold truncate"
                >
                  {brand.storeName || store?.storeName || 'Official Store'}
                </h1>
                <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold backdrop-blur-md">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>{lang === 'my' ? 'ဖွင့်လှစ်ပြီး' : 'Verified'}</span>
                </span>
              </div>
              <p className="text-[11px] truncate max-w-xs sm:max-w-md opacity-80">
                {brand.tagline || brand.description || store?.description || 'Premium Social Store'}
              </p>
            </div>
          </div>

          {/* Right Header Navigation & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Back to Marketplace */}
            {header.showNavigation && onNavigateToMarketplace && (
              <button
                type="button"
                onClick={onNavigateToMarketplace}
                className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title={lang === 'my' ? 'ဆိုင်စုံ (ShopSone) သို့ သွားမည်' : 'ShopSone Marketplace'}
              >
                <Store className="w-3.5 h-3.5 text-[#C9A227]" />
                <span className="hidden sm:inline">{lang === 'my' ? 'ဆိုင်စုံ' : 'ShopSone'}</span>
              </button>
            )}

            {/* Share / Copy Direct Link */}
            <button
              type="button"
              onClick={handleCopyStoreLink}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                copiedStoreLink
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-slate-300 hover:text-white'
              }`}
              title={lang === 'my' ? 'စတိုးလင့်ခ် ကူးယူမည်' : 'Copy Store Link'}
            >
              {copiedStoreLink ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">{lang === 'my' ? 'ကူးပြီး' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span className="hidden sm:inline">{lang === 'my' ? 'လင့်ခ်ကူးရန်' : 'Share'}</span>
                </>
              )}
            </button>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLang(lang === 'my' ? 'en' : 'my')}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer font-mono uppercase"
            >
              {lang}
            </button>

            {/* Cart Button */}
            {header.showCart && (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={lang === 'my' ? 'ခြင်းတောင်း' : 'Cart'}
              >
                <ShoppingCart className="w-4 h-4 text-[#C9A227]" />
                {totalCartCount > 0 && (
                  <span
                    style={{ backgroundColor: brand.primaryColor, color: '#0B0B09' }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full font-bold font-mono text-[10px] flex items-center justify-center shadow-lg animate-pulse"
                  >
                    {totalCartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Sections (Rendered in Ordered Sequence) */}
      <div className="relative z-10 space-y-6">
        {theme.homepage.sections.map((section) => {
          if (!section.enabled) return null;

          // 1. HERO SECTION
          if (section.id === 'hero') {
            return (
              <section key="hero" className="border-b border-white/10 px-4 py-8 backdrop-blur-md">
                <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
                  <span
                    style={{ color: brand.primaryColor }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-white/10 bg-white/[0.04] backdrop-blur-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{brand.tagline || 'Official Verified Storefront'}</span>
                  </span>
                  <h2
                    style={{
                      color: brand.headingTextColor,
                      fontFamily: typography.headingFont
                    }}
                    className="text-2xl sm:text-3xl font-extrabold max-w-2xl mx-auto tracking-tight"
                  >
                    {section.title || brand.storeName || 'Welcome to our Official Storefront'}
                  </h2>
                  <p
                    style={{ color: brand.bodyTextColor }}
                    className="text-xs sm:text-sm max-w-xl mx-auto leading-relaxed"
                  >
                    {section.subtitle || brand.description || 'Discover our curated selection of verified fashion and products.'}
                  </p>
                </div>
              </section>
            );
          }

          // 2. CUSTOMER SUPPORT CODE LOOKUP
          if (section.id === 'customer_lookup') {
            return (
              <div key="customer_lookup">
                <CustomerCodeLookup
                  lang={lang}
                  onCheckStatus={(code) => {
                    setInitialSupportCode(code);
                    setIsSupportOpen(true);
                  }}
                  onContactSupport={() => setIsSupportOpen(true)}
                />
              </div>
            );
          }

          // 3. DELIVERY & PAYMENT POLICIES
          if (section.id === 'delivery_payment') {
            return (
              <section key="delivery_payment" className="px-4 py-2">
                <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Delivery Info */}
                    <div
                      style={{
                        backgroundColor: brand.surfaceColor,
                        borderColor: brand.surfaceBorderColor
                      }}
                      className="border rounded-2xl p-4 flex items-start gap-3 shadow-lg"
                    >
                      <span
                        style={{ color: brand.primaryColor }}
                        className="p-2 rounded-xl bg-white/[0.05] border border-white/10 shrink-0"
                      >
                        <Truck className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">
                          {lang === 'my' ? 'ပို့ဆောင်ရေး စည်းမျဉ်း' : 'Delivery Information'}
                        </span>
                        <p style={{ color: brand.bodyTextColor }} className="mt-1 text-xs leading-relaxed">
                          {store?.deliveryInfo ||
                            (lang === 'my'
                              ? 'ရန်ကုန်မြို့တွင်း အိမ်အရောက်ငွေချေ စနစ်ရရှိနိုင်ပါသည်။ နယ်မြို့များ ဂိတ်ချပေးပါသည်။'
                              : 'Door-to-door delivery in Yangon. Express bus delivery for other townships.')}
                        </p>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div
                      style={{
                        backgroundColor: brand.surfaceColor,
                        borderColor: brand.surfaceBorderColor
                      }}
                      className="border rounded-2xl p-4 flex items-start gap-3 shadow-lg"
                    >
                      <span className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">
                          {lang === 'my' ? 'ငွေပေးချေမှု နည်းလမ်းများ' : 'Accepted Payments'}
                        </span>
                        <p style={{ color: brand.bodyTextColor }} className="mt-1 text-xs leading-relaxed">
                          {store?.paymentInstructions || 'KBZPay, WavePay, AYA Pay, Cash on Delivery'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          // 4. FEATURED PRODUCTS CATALOG
          if (section.id === 'featured_products') {
            return (
              <main key="featured_products" className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <Search
                      style={{ color: brand.primaryColor }}
                      className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={lang === 'my' ? 'ပစ္စည်းရှာဖွေရန်...' : 'Search products in catalog...'}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStockOnly(!stockOnly)}
                      style={
                        stockOnly
                          ? { backgroundColor: brand.primaryColor, color: '#0B0B09' }
                          : {}
                      }
                      className={`px-4 py-2.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        stockOnly
                          ? 'border-transparent shadow-md font-bold'
                          : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {lang === 'my' ? 'လက်ကျန်ရှိသော ပစ္စည်းများသာ' : 'In Stock Only'}
                    </button>
                  </div>
                </div>

                {/* Catalog Grid */}
                {filteredProducts.length === 0 ? (
                  <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-12 text-center space-y-3 shadow-2xl">
                    <Package className="w-12 h-12 text-slate-500 mx-auto" />
                    <h3 className="text-base font-bold text-white">
                      {lang === 'my' ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော ကုန်ပစ္စည်း မရှိပါ' : 'No matching products found'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {lang === 'my'
                        ? 'ရှာဖွေမှု စကားလုံးကို ပြောင်းလဲစစ်ဆေးကြည့်ပါ'
                        : 'Try adjusting your search criteria.'}
                    </p>
                  </div>
                ) : (
                  <div className={`grid ${gridColClass} gap-5`}>
                    {filteredProducts.map((product) => {
                      const activeVariants = product.variants || [];
                      const selectedVariantId = selectedVariants[product.id] || activeVariants[0]?.id;

                      return (
                        <StorefrontProductCard
                          key={product.id}
                          product={product}
                          isHighlighted={product.id === initialProductId}
                          selectedVariantId={selectedVariantId}
                          onSelectVariant={(variantId) =>
                            setSelectedVariants((prev) => ({
                              ...prev,
                              [product.id]: variantId
                            }))
                          }
                          onAddToCart={() => handleAddToCart(product)}
                          lang={lang}
                          theme={theme}
                        />
                      );
                    })}
                  </div>
                )}
              </main>
            );
          }

          // 5. INTRO & BRAND STORY
          if (section.id === 'intro') {
            return (
              <section key="intro" className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div
                  style={{
                    backgroundColor: brand.surfaceColor,
                    borderColor: brand.surfaceBorderColor
                  }}
                  className="border rounded-2xl p-6 shadow-lg text-center space-y-2"
                >
                  <h3
                    style={{
                      color: brand.headingTextColor,
                      fontFamily: typography.headingFont
                    }}
                    className="text-base font-bold"
                  >
                    {section.title || `About ${brand.storeName}`}
                  </h3>
                  <p style={{ color: brand.bodyTextColor }} className="text-xs max-w-xl mx-auto leading-relaxed">
                    {section.subtitle || brand.description}
                  </p>
                </div>
              </section>
            );
          }

          // 6. CONTACT & SOCIAL SECTION
          if (section.id === 'contact') {
            const links = footer.socialLinks || {};
            return (
              <section key="contact" className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div
                  style={{
                    backgroundColor: brand.surfaceColor,
                    borderColor: brand.surfaceBorderColor
                  }}
                  className="border rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div>
                    <h4
                      style={{
                        color: brand.headingTextColor,
                        fontFamily: typography.headingFont
                      }}
                      className="text-sm font-bold"
                    >
                      {lang === 'my' ? 'စတိုးနှင့် တိုက်ရိုက်ဆက်သွယ်ရန်' : 'Connect with Us'}
                    </h4>
                    <p style={{ color: brand.bodyTextColor }} className="text-xs">
                      {lang === 'my' ? 'မေးမြန်းလိုသည်များရှိပါက ဆက်သွယ်နိုင်ပါသည်' : 'Have inquiries or need bulk purchase? Reach out anytime.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {links.facebook && (
                      <a
                        href={links.facebook}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-white font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#C9A227]" />
                        <span>Facebook</span>
                      </a>
                    )}
                    {links.viber && (
                      <a
                        href={links.viber}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-white font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-purple-400" />
                        <span>Viber</span>
                      </a>
                    )}
                    {links.telegram && (
                      <a
                        href={links.telegram}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-white font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                        <span>Telegram</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsSupportOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#C9A227] hover:brightness-110 text-neutral-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'အကူအညီရယူမည်' : 'Order Support'}</span>
                    </button>
                  </div>
                </div>
              </section>
            );
          }

          return null;
        })}
      </div>

      {/* Floating Bottom Cart Bar */}
      {totalCartCount > 0 && (
        <aside aria-label="Cart Overview" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-full p-3 sm:p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: brand.primaryColor, color: '#0B0B09' }}
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-lg font-mono"
              >
                {totalCartCount}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">
                  {lang === 'my' ? 'စုစုပေါင်း ကျသင့်ငွေ' : 'Total Amount'}
                </span>
                <span
                  style={{ color: brand.primaryColor }}
                  className="text-sm font-bold font-mono tabular-nums"
                >
                  {totalCartAmount.toLocaleString()} MMK
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              style={{
                backgroundColor: brand.primaryColor,
                color: '#0B0B09'
              }}
              className="py-2.5 px-6 font-bold text-xs rounded-full flex items-center gap-2 shadow-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all"
            >
              <span>{lang === 'my' ? 'အော်ဒါတင်မည်' : 'Checkout'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Checkout Workflow Modal */}
      <CheckoutWorkflowModal
        isOpen={isCartOpen}
        onClose={() => {
          setIsCartOpen(false);
          if (hasCreatedOrder) {
            setCart([]);
            setHasCreatedOrder(false);
          }
        }}
        store={store}
        products={products}
        lang={lang}
        cart={cart}
        onOrderCreated={onOrderCreated}
        onNavigateToSupport={() => {
          setIsCartOpen(false);
          setIsSupportOpen(true);
        }}
      />

      {/* Order Support Modal */}
      <OrderSupportModal
        isOpen={isSupportOpen}
        onClose={() => {
          setIsSupportOpen(false);
          setInitialSupportCode(undefined);
        }}
        lang={lang}
        initialCode={initialSupportCode}
      />

      {/* Storefront Footer */}
      <footer
        style={{
          backgroundColor: footer.footerBgColor || '#0B0B09',
          color: footer.footerTextColor || '#8C887B'
        }}
        className="mt-16 py-8 border-t border-white/10 text-center text-xs space-y-2 relative z-10"
      >
        <p>
          {brand.storeName} · {footer.copyrightText || (lang === 'my' ? 'တရားဝင် အတည်ပြုပြီး စတိုး' : 'Official Verified Storefront')}
        </p>
        <div className="flex items-center justify-center gap-3 text-[11px]">
          <button
            type="button"
            onClick={() => setIsSupportOpen(true)}
            style={{ color: brand.primaryColor }}
            className="hover:underline cursor-pointer"
          >
            {lang === 'my' ? 'အော်ဒါ အကူအညီ' : 'Order Support'}
          </button>
          <span>·</span>
          {onNavigateToMerchant && (
            <button
              type="button"
              onClick={onNavigateToMerchant}
              className="hover:text-white underline cursor-pointer"
            >
              {lang === 'my' ? 'ကုန်သည် အကောင့်ဝင်ရန်' : 'Merchant Login'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
