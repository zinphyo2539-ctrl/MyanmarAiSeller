import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Store,
  Search,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Truck,
  Package,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Tag,
  LogIn,
  MessageSquare,
  Sparkles,
  Compass,
  X
} from 'lucide-react';
import { MarketplaceStore, Product } from '../types';
import { CustomerCodeLookup } from './CustomerCodeLookup';
import { OrderSupportModal } from './OrderSupportModal';

interface MarketplaceViewProps {
  onSelectStore: (slug: string, productId?: string) => void;
  onNavigateToMerchant?: () => void;
  initialSearchQuery?: string;
}

const MarketplaceProductCard: React.FC<{
  product: Product;
  storeSlug: string;
  lang: 'my' | 'en';
  onSelect: (slug: string, productId?: string) => void;
}> = ({ product, storeSlug, lang, onSelect }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const totalStock = (product.variants || []).reduce(
    (acc, v) => acc + (Number(v.stock) || 0),
    0
  );
  const inStock = totalStock > 0;

  return (
    <div
      onClick={() => onSelect(storeSlug, product.id)}
      className="group bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-purple-500/40 hover:bg-white/[0.06] rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer relative shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-purple-500/10"
    >
      <div className="space-y-3">
        {/* Thumbnail Image */}
        <div className="aspect-square rounded-xl bg-slate-900/60 border border-white/10 overflow-hidden flex items-center justify-center relative">
          {product.imageUrl && !imageFailed ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-purple-950/30 p-3 text-center">
              <ShoppingBag className="w-8 h-8 text-purple-400/60 mb-1" />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider truncate max-w-full px-1">
                {product.sku || 'ITEM'}
              </span>
            </div>
          )}

          {/* Stock status badge - Glass Pill */}
          <div className="absolute top-2.5 left-2.5 z-10">
            {inStock ? (
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
        </div>

        {/* Product Info */}
        <div>
          <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-purple-300 transition-colors">
            {product.name}
          </h3>
          <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 leading-relaxed">
            {product.description || (lang === 'my' ? 'အရည်အသွေးမြင့် ကုန်ပစ္စည်း' : 'Quality Item')}
          </p>
        </div>
      </div>

      {/* Price & Action */}
      <div className="pt-3 border-t border-white/10 mt-3 flex items-center justify-between gap-1">
        <div>
          <span className="text-xs sm:text-sm font-bold text-purple-300 font-mono tabular-nums">
            {product.price.toLocaleString()} {product.currency || 'MMK'}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(storeSlug, product.id);
          }}
          disabled={!inStock}
          className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-[11px] rounded-full transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-purple-600/25 active:scale-95"
        >
          <span>{lang === 'my' ? 'ဝယ်မည်' : 'Buy'}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  onSelectStore,
  onNavigateToMerchant,
  initialSearchQuery = ''
}) => {
  const [lang, setLang] = useState<'my' | 'en'>('my');
  const [stores, setStores] = useState<MarketplaceStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [initialSupportCode, setInitialSupportCode] = useState<string | undefined>(undefined);

  // Fetch marketplace data from authoritative public API
  const fetchMarketplace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/public/marketplace');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load marketplace stores');
      }
      const data = await res.json();
      setStores(data.stores || []);
    } catch (err: any) {
      console.error('Error fetching marketplace:', err);
      setError(err.message || 'Network error while loading marketplace');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketplace();
  }, [fetchMarketplace]);

  // Extract unique categories from real product data
  const realCategories = useMemo(() => {
    const cats = new Set<string>();
    stores.forEach((s) => {
      s.products.forEach((p) => {
        if (p.category && typeof p.category === 'string' && p.category.trim().length > 0) {
          cats.add(p.category.trim());
        }
      });
    });
    return Array.from(cats);
  }, [stores]);

  // Filter stores and their products based on search query and category
  const filteredStores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return stores
      .map((store) => {
        // Filter products of this store by category first
        let matchingProducts = store.products;
        if (selectedCategory !== 'all') {
          matchingProducts = matchingProducts.filter(
            (p) => (p.category || '').toLowerCase() === selectedCategory.toLowerCase()
          );
        }

        // Filter by text search
        if (q) {
          const storeMatches =
            store.storeName.toLowerCase().includes(q) ||
            store.description.toLowerCase().includes(q) ||
            store.slug.toLowerCase().includes(q) ||
            (store.brandName || '').toLowerCase().includes(q);

          const productMatches = matchingProducts.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              (p.description || '').toLowerCase().includes(q) ||
              (p.sku || '').toLowerCase().includes(q)
          );

          if (!storeMatches && productMatches.length === 0) {
            return null;
          }

          return {
            ...store,
            filteredProducts: storeMatches ? matchingProducts : productMatches
          };
        }

        return {
          ...store,
          filteredProducts: matchingProducts
        };
      })
      .filter((s): s is (MarketplaceStore & { filteredProducts: Product[] }) => s !== null);
  }, [stores, searchQuery, selectedCategory]);

  const totalMatchingProducts = useMemo(() => {
    return filteredStores.reduce((acc, s) => acc + s.filteredProducts.length, 0);
  }, [filteredStores]);

  const handleCopyStoreLink = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-28 relative overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* Background Glowing Ambiance Orbs (Loopstack Style) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-purple-600/25 via-indigo-600/25 to-pink-500/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-10 left-10 w-80 h-80 bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* Glassmorphic Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-2xl border-b border-white/10 px-4 py-4 shadow-lg shadow-black/40">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider text-white">
                ShopSone <span className="text-purple-400 font-light">(ဆိုင်စုံ)</span>
              </span>
              <span className="hidden sm:block text-[10px] text-slate-400 font-mono tracking-tight leading-none mt-0.5">
                Next-Gen AI Social Commerce
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setLang(lang === 'my' ? 'en' : 'my')}
              className="px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white backdrop-blur-md transition-all cursor-pointer font-mono uppercase"
            >
              {lang}
            </button>

            {onNavigateToMerchant && (
              <button
                type="button"
                onClick={onNavigateToMerchant}
                className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:border-purple-400/40"
              >
                <LogIn className="w-3.5 h-3.5 text-purple-300" />
                <span>{lang === 'my' ? 'ကုန်သည် ဝင်ရန်' : 'Merchant Portal'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Customer Code Lookup Strip */}
      <CustomerCodeLookup 
        lang={lang} 
        onCheckStatus={(code) => {
          setInitialSupportCode(code);
          setIsSupportOpen(true);
        }}
        onContactSupport={() => setIsSupportOpen(true)}
      />

      {/* Next-Gen Hero Section (Loopstack & Vercel Style) */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-20 text-center flex flex-col items-center">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-medium text-purple-300 mb-6 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Next-Gen AI Social Commerce Platform</span>
        </div>

        {/* High-End Serif / Bold Typography */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1]">
          Discover Fashion & <br />
          <span className="bg-gradient-to-r from-purple-400 via-fuchsia-300 to-indigo-400 bg-clip-text text-transparent">
            AI-Crafted Elegance.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          {lang === 'my'
            ? 'မြန်မာနိုင်ငံ၏ အဆန်းသစ်ဆုံး AI စွမ်းပကားသုံး အွန်လိုင်းဆိုင်များနှင့် ဖက်ရှင်ပစ္စည်းများကို တစ်နေရာတည်းတွင် ခမ်းနားစွာ ရှာဖွေဝယ်ယူလိုက်ပါ။'
            : 'Explore verified Myanmar social merchants, live inventories, and automated AI order fulfillment in one seamless showcase.'}
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#explore-products"
            className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 hover:shadow-purple-600/50 transition-all flex items-center gap-3 group"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{lang === 'my' ? 'ကုန်ပစ္စည်းများ ကြည့်မည်' : 'Explore Catalog'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          
          <button
            onClick={() => setIsSupportOpen(true)}
            className="px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold text-sm backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span>{lang === 'my' ? 'Customer Service ဆက်သွယ်ရန်' : 'Customer Service'}</span>
          </button>
        </div>

        {/* Floating Glass Showcase Card (Loopstack Vibe) */}
        {stores.length > 0 && (
          <div className="mt-14 w-full rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/15 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative group overflow-hidden text-left">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
              <div className="text-left space-y-1">
                <div className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Featured Store</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">
                  {stores[0].storeName}
                </h3>
                <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                  {stores[0].description || 'Instant AI customer service & fast nationwide delivery.'}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 font-mono">
                  <span>{stores[0].productCount} items cataloged</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">Active Now</span>
                </div>
              </div>
              
              <button
                onClick={() => onSelectStore(stores[0].slug)}
                className="px-7 py-3.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all shrink-0 cursor-pointer flex items-center gap-2 group-hover:scale-105"
              >
                <span>{lang === 'my' ? 'ဆိုင်သို့ သွားမည်' : 'Visit Store'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Catalog Search & Filter Controls */}
      <div id="explore-products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Floating Glass Search Pill */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-3 sm:p-4 shadow-[0_15px_35px_rgba(0,0,0,0.6)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-purple-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'my' ? 'စတိုး သို့မဟုတ် ပစ္စည်းအမည် ရှာဖွေပါ...' : 'Search stores or products...'}
              className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 scrollbar-hide">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              {lang === 'my' ? 'အားလုံး' : 'All Categories'}
            </button>
            {realCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20 space-y-4">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
            <p className="text-sm text-slate-400 font-mono">
              {lang === 'my' ? 'စတိုးများကို ရယူနေပါသည်...' : 'Loading stores and catalog...'}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-8 text-center bg-white/[0.03] backdrop-blur-xl border border-rose-500/30 rounded-3xl max-w-md mx-auto space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <p className="text-sm text-rose-300">{error}</p>
            <button
              onClick={fetchMarketplace}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold"
            >
              {lang === 'my' ? 'ပြန်လည်ကြိုးစားရန်' : 'Try Again'}
            </button>
          </div>
        )}

        {/* Stores and Products Grid */}
        {!loading && !error && filteredStores.length === 0 && (
          <div className="text-center py-16 bg-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-3">
            <Package className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-base font-bold text-white">
              {lang === 'my' ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော ကုန်ပစ္စည်းမရှိပါ' : 'No items found matching your criteria'}
            </h4>
            <p className="text-xs text-slate-400">
              {lang === 'my' ? 'အခြားအမည်ဖြင့် ပြန်လည်ရှာဖွေကြည့်ပါ' : 'Try adjusting your search terms or category filter.'}
            </p>
          </div>
        )}

        {!loading && !error && filteredStores.map((store) => (
          <div
            key={store.slug}
            className="bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
          >
            {/* Store Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold text-white">
                    {store.storeName}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                  {store.description || 'Quality social merchant catalog.'}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={(e) => handleCopyStoreLink(store.slug, e)}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Copy Store Link"
                >
                  {copiedSlug === store.slug ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{lang === 'my' ? 'ကူးပြီး' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'လင့်ခ်ကူး' : 'Share'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectStore(store.slug)}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-purple-600/30 hover:shadow-purple-600/50"
                >
                  <span>{lang === 'my' ? 'စတိုးသို့ ဝင်မည်' : 'Enter Store'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Products Grid - Bento Style */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {store.filteredProducts.map((product) => (
                <MarketplaceProductCard
                  key={product.id}
                  product={product}
                  storeSlug={store.slug}
                  lang={lang}
                  onSelect={onSelectStore}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Order Support Modal */}
      <OrderSupportModal
        isOpen={isSupportOpen}
        onClose={() => {
          setIsSupportOpen(false);
          setInitialSupportCode(undefined);
        }}
        initialCode={initialSupportCode}
        lang={lang}
      />
    </div>
  );
};
