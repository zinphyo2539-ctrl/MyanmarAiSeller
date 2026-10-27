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
  Search
} from 'lucide-react';
import { OrderSupportModal } from './OrderSupportModal';
import { CheckoutWorkflowModal } from './CheckoutWorkflowModal';
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
          // Prefer variant in stock if available
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

  // Auto-scroll / highlight initial product from Marketplace direct link
  useEffect(() => {
    if (initialProductId && products.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`product-${initialProductId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [initialProductId, products]);

  const handleCopyStoreLink = () => {
    try {
      const url = `${window.location.origin}/store/${slug}`;
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

  // Handle Cart Operations
  const handleAddToCart = (product: Product) => {
    const variantId = selectedVariants[product.id] || (product.variants?.[0]?.id);
    const variant = product.variants?.find((v) => v.id === variantId);
    if (!variant || variant.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id && item.variantId === variant.id);
      if (existing) {
        if (existing.qty >= variant.stock) return prev;
        return prev.map((item) =>
          item.productId === product.id && item.variantId === variant.id
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }

      const newItem: CartItem = {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        variantName: `${variant.color} / ${variant.size}`,
        price: product.price,
        qty: 1,
        maxStock: variant.stock,
        imageUrl: product.imageUrl
      };
      return [...prev, newItem];
    });

    setIsCartOpen(true);
  };

  const handleUpdateQty = (productId: string, variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId && item.variantId === variantId) {
            const newQty = item.qty + delta;
            if (newQty <= 0) return null;
            if (newQty > item.maxStock) return item;
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (productId: string, variantId: string) => {
    setCart((prev) => prev.filter((item) => !(item.productId === productId && item.variantId === variantId)));
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalCartAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const onOrderCreated = (order: any) => {
    setHasCreatedOrder(true);
    // Refresh catalog to reflect updated stock authoritatively
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

  // Render: Loading State
  if (loading && !store) {
    return (
      <div data-theme="storefront" className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col items-center justify-center p-6 space-y-4 font-sans">
        <RefreshCw className="w-8 h-8 text-[#C9A227] animate-spin" />
        <p className="text-sm text-[#B9B5A7] font-medium">
          {lang === 'my' ? 'စတိုးအချက်အလက်များ ဆွဲတင်နေသည်...' : 'Loading Storefront...'}
        </p>
      </div>
    );
  }

  // Render: 404 / Unpublished State
  if (notFound) {
    return (
      <div data-theme="storefront" className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-[var(--surface-card)] border border-[var(--border-base)] rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 bg-[var(--surface-elevated)] border border-red-500/40 rounded-2xl flex items-center justify-center mx-auto text-red-500">
            <Store className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-main)]">
              {lang === 'my' ? 'စတိုး မတွေ့ရှိပါ သို့မဟုတ် မဖွင့်သေးပါ' : 'Store Not Found or Unpublished'}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              {lang === 'my'
                ? `"${slug}" အမည်ရှိ စတိုးကို မတွေ့ရှိရပါ။ စတိုးလိပ်စာမှန်ကန်မှု ရှိမရှိ သို့မဟုတ် ကုန်သည်မှ ဖွင့်လှစ်ထားခြင်း ရှိမရှိ စစ်ဆေးပါ။`
                : `The storefront for "${slug}" is either unavailable or has not been published yet by the merchant.`}
            </p>
          </div>

          <div className="pt-3 border-t border-[var(--border-base)] flex flex-col gap-2.5">
            <button
              type="button"
              onClick={fetchStoreData}
              className="w-full py-2.5 px-4 bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] border border-[var(--border-base)] text-xs font-semibold text-[var(--text-main)] rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-[var(--action-primary)]" />
              <span>{lang === 'my' ? 'ပြန်လည်စစ်ဆေးမည်' : 'Retry'}</span>
            </button>
            {onNavigateToMerchant && (
              <button
                type="button"
                onClick={onNavigateToMerchant}
                className="w-full py-2 text-xs text-[var(--text-muted)] hover:text-[var(--action-primary)] transition-colors cursor-pointer"
              >
                {lang === 'my' ? 'ကုန်သည် Dashboard သို့ သွားမည်' : 'Go to Merchant Workspace'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render: Network or API Error
  if (fetchError) {
    return (
      <div data-theme="storefront" className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-[var(--surface-card)] border border-[var(--border-base)] rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-[var(--text-main)]">
            {lang === 'my' ? 'ချိတ်ဆက်မှု အခက်အခဲ ဖြစ်ပေါ်နေပါသည်' : 'Connection Error'}
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">{fetchError}</p>
          <button
            type="button"
            onClick={fetchStoreData}
            className="px-5 py-2.5 bg-[var(--action-primary)] hover:bg-[var(--action-hover)] text-neutral-950 font-bold text-xs rounded-xl cursor-pointer"
          >
            {lang === 'my' ? 'ပြန်လည်ကြိုးစားမည်' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-theme="storefront" className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] font-sans pb-28">
      {/* Top Banner / Store Header */}
      <header className="sticky top-0 z-30 bg-[#0B0B09]/95 backdrop-blur-md border-b border-[#393426] px-4 py-3.5">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {store?.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.storeName}
                className="w-10 h-10 rounded-2xl object-cover border border-[#C9A227]/40 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-[#1E1D14] border border-[#C9A227]/50 flex items-center justify-center text-[#C9A227] font-bold text-sm shrink-0">
                {store?.storeName?.substring(0, 2).toUpperCase() || 'YS'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-bold text-[#F5F2E8] truncate">
                  {store?.storeName || 'Yangon Style Store'}
                </h1>
                <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#65B985]/15 border border-[#65B985]/30 text-[#65B985] text-[10px] font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{lang === 'my' ? 'ဖွင့်လှစ်ပြီး' : 'Published'}</span>
                </span>
              </div>
              <p className="text-[11px] text-[#817D70] truncate max-w-xs sm:max-w-md">
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
                className="px-2.5 py-1.5 rounded-xl bg-[#181810] hover:bg-[#1E1D14] border border-[#2563EB]/40 hover:border-[#2563EB] text-xs font-semibold text-[#F5F2E8] hover:text-[#93C5FD] flex items-center gap-1.5 transition-colors cursor-pointer"
                title={lang === 'my' ? 'ဆိုင်စုံ (ShopSone) သို့ သွားမည်' : 'ShopSone Marketplace'}
              >
                <Store className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span className="hidden sm:inline">{lang === 'my' ? 'ဆိုင်စုံ' : 'ShopSone'}</span>
              </button>
            )}

            {/* Copy Direct Store Link */}
            <button
              type="button"
              onClick={handleCopyStoreLink}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                copiedStoreLink
                  ? 'bg-[#65B985]/20 border-[#65B985] text-[#65B985]'
                  : 'bg-[#181810] hover:bg-[#1E1D14] border-[#393426] text-[#B9B5A7] hover:text-[#F5F2E8]'
              }`}
              title={lang === 'my' ? 'စတိုးလင့်ခ် ကူးယူမည်' : 'Copy Store Link'}
            >
              {copiedStoreLink ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#65B985]" />
                  <span className="hidden sm:inline">{lang === 'my' ? 'ကူးပြီး' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span className="hidden sm:inline">{lang === 'my' ? 'လင့်ခ်ကူးရန်' : 'Copy Link'}</span>
                </>
              )}
            </button>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLang(lang === 'my' ? 'en' : 'my')}
              className="px-2.5 py-1 rounded-lg bg-[#181810] border border-[#393426] text-xs font-semibold text-[#C9A227] hover:bg-[#1E1D14] transition-colors cursor-pointer"
            >
              {lang === 'my' ? 'EN' : 'မြန်မာ'}
            </button>

            {/* Header Cart Button */}
            <button
              type="button"
              onClick={() => {
                setIsCartOpen(true);
              }}
              className="relative p-2.5 rounded-xl bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#F5F2E8] hover:text-[#C9A227] transition-colors cursor-pointer"
              title={lang === 'my' ? 'ခြင်းတောင်း' : 'Cart'}
            >
              <ShoppingCart className="w-4 h-4" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#C9A227] text-[#0B0B09] font-bold font-mono text-[10px] flex items-center justify-center shadow-md animate-pulse">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Announcement & Store Badges */}
      <section className="bg-gradient-to-b from-[#181810] to-[#0B0B09] border-b border-[#393426] px-4 py-5">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Delivery Info */}
            <div className="bg-[#11110D]/80 border border-[#393426] rounded-xl p-3 flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#817D70] font-semibold text-[10px] uppercase block">
                  {lang === 'my' ? 'ပို့ဆောင်ရေး စည်းမျဉ်း' : 'Delivery Information'}
                </span>
                <p className="text-[#F5F2E8] mt-0.5 text-[11px] leading-relaxed">
                  {store?.deliveryInfo || (lang === 'my' ? 'ရန်ကုန်မြို့တွင်း အိမ်အရောက်ငွေချေ စနစ်ရရှိနိုင်ပါသည်။ နယ်မြို့များ ဂိတ်ချပေးပါသည်။' : 'Door-to-door delivery in Yangon. Express bus delivery for other townships.')}
                </p>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-[#11110D]/80 border border-[#393426] rounded-xl p-3 flex items-start gap-2.5">
              <CreditCard className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#817D70] font-semibold text-[10px] uppercase block">
                  {lang === 'my' ? 'ငွေပေးချေမှု နည်းလမ်းများ' : 'Accepted Payments'}
                </span>
                <p className="text-[#F5F2E8] mt-0.5 text-[11px] leading-relaxed">
                  {store?.paymentInstructions || 'KBZPay, WavePay, AYA Pay, Cash on Delivery'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#817D70] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'my' ? 'ပစ္စည်းရှာဖွေရန်...' : 'Search products in catalog...'}
              className="w-full bg-[#181810] border border-[#393426] rounded-xl pl-9 pr-4 py-2 text-xs text-[#F5F2E8] placeholder-[#817D70] focus:border-[#C9A227] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStockOnly(!stockOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                stockOnly
                  ? 'bg-[#C9A227] text-[#0B0B09] border-[#C9A227]'
                  : 'bg-[#181810] text-[#B9B5A7] border-[#393426] hover:text-[#F5F2E8]'
              }`}
            >
              {lang === 'my' ? 'လက်ကျန်ရှိသော ပစ္စည်းများသာ' : 'In Stock Only'}
            </button>
          </div>
        </div>

        {/* Catalog Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-[#181810] border border-[#393426] rounded-3xl p-10 text-center space-y-3">
            <Package className="w-12 h-12 text-[#776324] mx-auto" />
            <h3 className="text-base font-bold text-[#F5F2E8]">
              {lang === 'my' ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော ကုန်ပစ္စည်း မရှိပါ' : 'No matching products found'}
            </h3>
            <p className="text-xs text-[#817D70]">
              {lang === 'my'
                ? 'ရှာဖွေမှု စကားလုံးကို ပြောင်းလဲစစ်ဆေးကြည့်ပါ'
                : 'Try adjusting your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              const activeVariants = product.variants || [];
              const selectedVariantId = selectedVariants[product.id] || activeVariants[0]?.id;
              const currentVariant = activeVariants.find((v) => v.id === selectedVariantId) || activeVariants[0];
              const isOutOfStock = !currentVariant || currentVariant.stock <= 0;
              const totalStock = activeVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

              return (
                <div
                  key={product.id}
                  id={`product-${product.id}`}
                  className={`bg-[#1A1A1A] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-xl group ${
                    product.id === initialProductId
                      ? 'border-[#C9A227] ring-2 ring-[#C9A227]/50 shadow-2xl scale-[1.01]'
                      : 'border-white/[0.08] hover:border-[#C9A227]/40'
                  }`}
                >
                  {/* Product Image & Badges */}
                  <div className="relative aspect-square w-full bg-[#11110D] overflow-hidden flex items-center justify-center">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback to placeholder if image link breaks
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#817D70] p-4 text-center bg-[#1E1D14]">
                        <Package className="w-10 h-10 text-[#776324] mb-1" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#B9B5A7]">
                          {product.sku || 'CATALOG ITEM'}
                        </span>
                      </div>
                    )}

                    {product.discount && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-amber-500 text-neutral-950 font-bold text-[10px] flex items-center gap-1 shadow-lg">
                        <Tag className="w-3 h-3" />
                        <span>{product.discount}</span>
                      </div>
                    )}

                    {totalStock === 0 ? (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-[10px] shadow-lg">
                        {lang === 'my' ? 'ပစ္စည်းပြတ်' : 'Sold Out'}
                      </div>
                    ) : (
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-neutral-900/80 backdrop-blur-md border border-white/10 text-emerald-400 font-mono text-[10px] shadow-lg">
                        {totalStock} {lang === 'my' ? 'ခုကျန်' : 'in stock'}
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-4.5 flex-1 flex flex-col justify-between space-y-3.5">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-[#F8FAFC] leading-snug">
                          {product.name}
                        </h3>
                        <span className="text-sm font-bold font-mono text-amber-400 shrink-0">
                          {product.price.toLocaleString()} MMK
                        </span>
                      </div>

                      {product.description && (
                        <p className="text-xs text-[#A1A1AA] mt-1.5 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>

                    {/* Variant Selector */}
                    {activeVariants.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                        <div className="flex items-center justify-between text-[10px] text-[#A1A1AA]">
                          <span className="font-semibold uppercase tracking-wider">
                            {lang === 'my' ? 'အရွယ်အစား / အရောင်' : 'Select Option'}
                          </span>
                          {currentVariant && (
                            <span className="font-mono">
                              {currentVariant.stock > 0
                                ? `${currentVariant.stock} ${lang === 'my' ? 'ခုကျန်' : 'avail'}`
                                : (lang === 'my' ? 'ကုန်နေပါသည်' : 'out of stock')}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {activeVariants.map((v) => {
                            const isSelected = v.id === selectedVariantId;
                            const isZero = v.stock <= 0;
                            return (
                              <button
                                key={v.id}
                                type="button"
                                disabled={isZero}
                                onClick={() =>
                                  setSelectedVariants((prev) => ({
                                    ...prev,
                                    [product.id]: v.id
                                  }))
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold shadow-sm'
                                    : isZero
                                    ? 'bg-neutral-900 border-white/5 text-neutral-600 opacity-40 cursor-not-allowed line-through'
                                    : 'bg-neutral-800 hover:bg-neutral-700 border-white/10 text-neutral-200'
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
                      onClick={() => handleAddToCart(product)}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isOutOfStock
                          ? 'bg-neutral-800 border border-white/5 text-neutral-500 opacity-50 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-lg active:scale-[0.98]'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>
                        {isOutOfStock
                          ? (lang === 'my' ? 'ပစ္စည်း ကုန်နေပါသည်' : 'Out of Stock')
                          : (lang === 'my' ? 'ခြင်းတောင်းထဲထည့်မည်' : 'Add to Cart')}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky Mobile Bottom Cart Bar */}
      {totalCartCount > 0 && (
        <aside aria-label="Cart Overview" className="fixed bottom-0 left-0 right-0 z-40 bg-[#181810]/95 backdrop-blur-md border-t border-[#393426] p-3 shadow-2xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C9A227] text-[#0B0B09] flex items-center justify-center font-bold text-sm shrink-0">
                {totalCartCount}
              </div>
              <div>
                <span className="text-[10px] text-[#817D70] uppercase font-semibold block">
                  {lang === 'my' ? 'စုစုပေါင်း ကျသင့်ငွေ' : 'Total Amount'}
                </span>
                <span className="text-sm font-bold font-mono text-[#F5F2E8]">
                  {totalCartAmount.toLocaleString()} MMK
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCartOpen(true);
              }}
              className="py-2.5 px-5 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <span>{lang === 'my' ? 'ခြင်းတောင်းကြည့်မည် / အော်ဒါတင်မည်' : 'View Cart & Checkout'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

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
      {/* Discreet Public Storefront Footer */}
      <footer className="mt-12 py-8 border-t border-[#393426] text-center text-xs text-[#817D70] space-y-2">
        <p>
          {store?.storeName} · {lang === 'my' ? 'တရားဝင် အတည်ပြုပြီး စတိုး' : 'Official Verified Storefront'}
        </p>
        <div className="flex items-center justify-center gap-3 text-[11px]">
          <button
            type="button"
            onClick={() => setIsSupportOpen(true)}
            className="text-[#C9A227] hover:text-[#F5F2E8] underline cursor-pointer"
          >
            {lang === 'my' ? 'အော်ဒါ အကူအညီ' : 'Order Support'}
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={onNavigateToMerchant}
            className="text-[#817D70] hover:text-[#C9A227] underline cursor-pointer"
          >
            {lang === 'my' ? 'ကုန်သည် အကောင့်ဝင်ရန်' : 'Merchant Login'}
          </button>
        </div>
      </footer>



      <OrderSupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} lang={lang} />
    </div>
  );
};
