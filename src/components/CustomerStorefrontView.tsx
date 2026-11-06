import React, { useState, useEffect, useCallback } from 'react';
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
  Sparkles
} from 'lucide-react';
import { OrderSupportModal } from './OrderSupportModal';
import { CheckoutWorkflowModal } from './CheckoutWorkflowModal';
import { CustomerCodeLookup } from './CustomerCodeLookup';
import { Product, ProductVariant, StoreSettings } from '../types';

interface CustomerStorefrontViewProps {
  slug: string;
  onNavigateToMerchant?: () => void;
  onNavigateToMarketplace?: () => void;
  initialProductId?: string | null;
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

const StorefrontProductCard: React.FC<{
  product: Product;
  isHighlighted: boolean;
  selectedVariantId?: string;
  onSelectVariant: (variantId: string) => void;
  onAddToCart: () => void;
  lang: 'my' | 'en';
}> = ({ product, isHighlighted, selectedVariantId, onSelectVariant, onAddToCart, lang }) => {
  const [imgError, setImgError] = useState(false);
  const activeVariants = product.variants || [];
  const currentVariantId = selectedVariantId || activeVariants[0]?.id;
  const currentVariant = activeVariants.find((v) => v.id === currentVariantId) || activeVariants[0];
  const isOutOfStock = !currentVariant || currentVariant.stock <= 0;
  const totalStock = activeVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  return (
    <div
      id={`product-${product.id}`}
      className={`bg-white/[0.03] backdrop-blur-xl border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 group shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${
        isHighlighted
          ? 'border-purple-500 ring-2 ring-purple-500/30 shadow-purple-500/20 scale-[1.01]'
          : 'border-white/10 hover:border-purple-500/40 hover:bg-white/[0.06]'
      }`}
    >
      {/* Product Image & Badges */}
      <div className="relative aspect-square w-full bg-slate-900/60 overflow-hidden flex items-center justify-center border-b border-white/10">
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center bg-gradient-to-br from-slate-900 to-purple-950/30">
            <Package className="w-10 h-10 text-purple-400/60 mb-1" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              {product.sku || 'CATALOG ITEM'}
            </span>
          </div>
        )}

        {/* Stock status pill - Emerald glass pill */}
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

        {/* Discount badge if present */}
        {product.discount && (
          <div className="absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 rounded-md bg-purple-600/90 text-white font-bold text-[10px] shadow-xs">
            {product.discount}
          </div>
        )}

        {totalStock > 0 && (
          <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-emerald-400 font-mono text-[10px] shadow-xs tabular-nums">
            {totalStock} {lang === 'my' ? 'ခုကျန်' : 'in stock'}
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-white leading-snug group-hover:text-purple-300 transition-colors">
              {product.name}
            </h3>
            <span className="text-sm font-bold font-mono text-purple-300 shrink-0 tabular-nums">
              {product.price.toLocaleString()} MMK
            </span>
          </div>

          {product.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
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
                <span className="font-mono tabular-nums text-purple-300">
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
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent font-bold shadow-xs'
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
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.98] ${
            isOutOfStock
              ? 'bg-white/[0.03] border border-white/10 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/25 hover:shadow-purple-600/40'
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
  initialProductId
}) => {
  const [lang, setLang] = useState<'my' | 'en'>('my');
  const [copiedStoreLink, setCopiedStoreLink] = useState(false);
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Load public store data from authoritative API
  const fetchStoreData = useCallback(async () => {
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
  }, [slug]);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData]);

  // Copy Store Link to Clipboard
  const handleCopyStoreLink = () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedStoreLink(true);
      setTimeout(() => setCopiedStoreLink(false), 2500);
    } catch {}
  };

  // Add Item to Cart
  const handleAddToCart = (product: Product) => {
    const activeVariants = product.variants || [];
    const chosenVariantId = selectedVariants[product.id] || activeVariants[0]?.id;
    const variant = activeVariants.find((v) => v.id === chosenVariantId) || activeVariants[0];

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

  const onOrderCreated = (order: any) => {
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 space-y-4 font-sans">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-sm text-slate-400 font-medium font-mono">
          {lang === 'my' ? 'စတိုးအချက်အလက်များ ဆွဲတင်နေသည်...' : 'Loading Storefront...'}
        </p>
      </div>
    );
  }

  // 404 / Unpublished State
  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
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
                ? `"${slug}" အမည်ရှိ စတိုးကို မတွေ့ရှိရပါ။ စတိုးလိပ်စာမှန်ကန်မှု ရှိမရှိ သို့မဟုတ် ကုန်သည်မှ ဖွင့်လှစ်ထားခြင်း ရှိမရှိ စစ်ဆေးပါ။`
                : `The storefront for "${slug}" is either unavailable or has not been published yet by the merchant.`}
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={fetchStoreData}
              className="w-full py-2.5 px-4 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-white rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-purple-400" />
              <span>{lang === 'my' ? 'ပြန်လည်စစ်ဆေးမည်' : 'Retry'}</span>
            </button>
            {onNavigateToMerchant && (
              <button
                type="button"
                onClick={onNavigateToMerchant}
                className="w-full py-2 text-xs text-slate-400 hover:text-purple-300 transition-colors cursor-pointer"
              >
                {lang === 'my' ? 'ကုန်သည် Dashboard သို့ သွားမည်' : 'Go to Merchant Workspace'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Network or API Error
  if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">
            {lang === 'my' ? 'ချိတ်ဆက်မှု အခက်အခဲ ဖြစ်ပေါ်နေပါသည်' : 'Connection Error'}
          </h2>
          <p className="text-xs text-slate-400">{fetchError}</p>
          <button
            type="button"
            onClick={fetchStoreData}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            {lang === 'my' ? 'ပြန်လည်ကြိုးစားမည်' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-32 relative overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* Background Glowing Ambiance Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-purple-600/20 via-indigo-600/20 to-pink-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-10 left-10 w-80 h-80 bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Banner / Store Header */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-2xl border-b border-white/10 px-4 py-3.5 shadow-lg shadow-black/40">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {store?.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.storeName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-2xl object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md shadow-purple-500/20">
                {store?.storeName?.substring(0, 2).toUpperCase() || 'YS'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white truncate">
                  {store?.storeName || 'Yangon Style Store'}
                </h1>
                <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold backdrop-blur-md">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>{lang === 'my' ? 'ဖွင့်လှစ်ပြီး' : 'Verified'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                {store?.description || (lang === 'my' ? 'အရည်အသွေးမြင့် ကုန်ပစ္စည်းများ စိတ်ချစွာ ဝယ်ယူနိုင်ပါသည်' : 'Premium Social Store in Myanmar')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Back to Marketplace */}
            {onNavigateToMarketplace && (
              <button
                type="button"
                onClick={onNavigateToMarketplace}
                className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title={lang === 'my' ? 'ဆိုင်စုံ (ShopSone) သို့ သွားမည်' : 'ShopSone Marketplace'}
              >
                <Store className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">{lang === 'my' ? 'ဆိုင်စုံ' : 'ShopSone'}</span>
              </button>
            )}

            {/* Copy Direct Store Link */}
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
                  <Copy className="w-3.5 h-3.5 text-purple-400" />
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

            {/* Header Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={lang === 'my' ? 'ခြင်းတောင်း' : 'Cart'}
            >
              <ShoppingCart className="w-4 h-4 text-purple-400" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold font-mono text-[10px] flex items-center justify-center shadow-lg shadow-purple-600/40 animate-pulse">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Customer Code Lookup Section */}
      <CustomerCodeLookup 
        lang={lang} 
        onCheckStatus={(code) => {
          setInitialSupportCode(code);
          setIsSupportOpen(true);
        }}
        onContactSupport={() => setIsSupportOpen(true)}
      />

      {/* Hero Announcement & Store Badges */}
      <section className="bg-white/[0.02] border-b border-white/10 px-4 py-5 backdrop-blur-xl">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Delivery Info */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-start gap-3 shadow-[0_10px_25px_rgba(0,0,0,0.4)]">
              <span className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400 shrink-0">
                <Truck className="w-4 h-4" />
              </span>
              <div>
                <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">
                  {lang === 'my' ? 'ပို့ဆောင်ရေး စည်းမျဉ်း' : 'Delivery Information'}
                </span>
                <p className="text-slate-200 mt-1 text-xs leading-relaxed">
                  {store?.deliveryInfo || (lang === 'my' ? 'ရန်ကုန်မြို့တွင်း အိမ်အရောက်ငွေချေ စနစ်ရရှိနိုင်ပါသည်။ နယ်မြို့များ ဂိတ်ချပေးပါသည်။' : 'Door-to-door delivery in Yangon. Express bus delivery for other townships.')}
                </p>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-start gap-3 shadow-[0_10px_25px_rgba(0,0,0,0.4)]">
              <span className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 shrink-0">
                <CreditCard className="w-4 h-4" />
              </span>
              <div>
                <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">
                  {lang === 'my' ? 'ငွေပေးချေမှု နည်းလမ်းများ' : 'Accepted Payments'}
                </span>
                <p className="text-slate-200 mt-1 text-xs leading-relaxed">
                  {store?.paymentInstructions || 'KBZPay, WavePay, AYA Pay, Cash on Delivery'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-purple-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'my' ? 'ပစ္စည်းရှာဖွေရန်...' : 'Search products in catalog...'}
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-purple-500/80 focus:bg-white/[0.08] focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStockOnly(!stockOnly)}
              className={`px-4 py-2.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                stockOnly
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md shadow-purple-600/30'
                  : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white hover:bg-white/[0.08]'
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar (Glassmorphic) */}
      {totalCartCount > 0 && (
        <aside aria-label="Cart Overview" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-full p-3 sm:p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-lg shadow-purple-600/30 font-mono">
                {totalCartCount}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">
                  {lang === 'my' ? 'စုစုပေါင်း ကျသင့်ငွေ' : 'Total Amount'}
                </span>
                <span className="text-sm font-bold font-mono text-purple-300 tabular-nums">
                  {totalCartAmount.toLocaleString()} MMK
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="py-2.5 px-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-full flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95 transition-all"
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
      <footer className="mt-16 py-8 border-t border-white/10 text-center text-xs text-slate-500 space-y-2">
        <p>
          {store?.storeName} · {lang === 'my' ? 'တရားဝင် အတည်ပြုပြီး စတိုး' : 'Official Verified Storefront'}
        </p>
        <div className="flex items-center justify-center gap-3 text-[11px]">
          <button
            type="button"
            onClick={() => setIsSupportOpen(true)}
            className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
          >
            {lang === 'my' ? 'အော်ဒါ အကူအညီ' : 'Order Support'}
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={onNavigateToMerchant}
            className="text-slate-400 hover:text-white underline cursor-pointer"
          >
            {lang === 'my' ? 'ကုန်သည် အကောင့်ဝင်ရန်' : 'Merchant Login'}
          </button>
        </div>
      </footer>
    </div>
  );
};
