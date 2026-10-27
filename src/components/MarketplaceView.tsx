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

          // If store matches, keep all products matching category; otherwise keep only matching products
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
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] font-sans pb-24">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#CBD5E1] px-4 py-3.5 shadow-xs">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold text-[#0F172A] tracking-tight">
              ShopSone <span className="font-semibold text-[#2563EB]">(ဆိုင်စုံ)</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Merchant Login Access */}
            {onNavigateToMerchant && (
              <button
                type="button"
                onClick={onNavigateToMerchant}
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5 text-white" />
                <span>{lang === 'my' ? 'ကုန်သည် ဝင်ရန်' : 'Merchant Portal'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Marketplace Lookup Section */}
      <CustomerCodeLookup 
        lang={lang} 
        onCheckStatus={(code) => {
          setInitialSupportCode(code);
          setIsSupportOpen(true);
        }}
        onContactSupport={() => setIsSupportOpen(true)}
      />

      {/* Hero & Search Banner */}
      <section className="bg-gradient-to-b from-white to-[#F8FAFC] border-b border-[#CBD5E1] px-4 py-8">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] text-[#1E40AF] text-xs font-medium">
            <ShoppingBag className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>
              {lang === 'my'
                ? `ဖွင့်လှစ်ထားသော စတိုး ${stores.length} ဆိုင် • ကုန်ပစ္စည်း ${stores.reduce((sum, s) => sum + s.productCount, 0)} ခု`
                : `${stores.length} Published Store${stores.length === 1 ? '' : 's'} • ${stores.reduce((sum, s) => sum + s.productCount, 0)} Active Products`}
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight max-w-xl mx-auto leading-tight">
              ShopSone <span className="text-[#2563EB]">(ဆိုင်စုံ)</span>
            </h1>
            <p className="text-sm sm:text-base font-semibold text-[#475569]">
              {lang === 'my'
                ? 'ဆိုင်စုံ၊ ပစ္စည်းစုံ၊ တစ်နေရာတည်း'
                : 'All Stores, All Products, in One Place'}
            </p>
          </div>

          <p className="text-xs sm:text-sm text-[#64748B] max-w-lg mx-auto">
            {lang === 'my'
              ? 'မြန်မာ အွန်လိုင်းစတိုးများမှ ကုန်ပစ္စည်းများကို စုံလင်စွာရှာဖွေပြီး တိုက်ရိုက်စိတ်ချစွာ ဝယ်ယူပါ'
              : 'Discover published Myanmar shops, browse live inventory, and purchase directly'}
          </p>

          {/* Search Input Bar */}
          <div className="pt-2 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'my'
                    ? 'စတိုးအမည် သို့မဟုတ် ကုန်ပစ္စည်းအမည် ရှာဖွေပါ...'
                    : 'Search by store name, product or keyword...'
                }
                className="w-full bg-white border border-[#CBD5E1] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 rounded-2xl pl-10 pr-24 py-3 text-xs sm:text-sm text-[#0F172A] placeholder-[#64748B] outline-none shadow-sm transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] text-xs font-semibold cursor-pointer transition-colors"
                >
                  {lang === 'my' ? 'ဖျက်မည်' : 'Clear'}
                </button>
              )}
            </div>
          </div>

          {/* Real Categories Filter (Only shown if real categories exist) */}
          {realCategories.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                {lang === 'my' ? 'အားလုံး' : 'All Categories'}
              </button>
              {realCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    selectedCategory === cat
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="w-8 h-8 text-[#2563EB] animate-spin" />
            <p className="text-xs text-[#475569] font-medium">
              {lang === 'my' ? 'ဆိုင်စုံ (ShopSone) စတိုးများကို ရယူနေပါသည်...' : 'Loading ShopSone stores...'}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="max-w-md mx-auto bg-white border border-[#FCA5A5] rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <AlertCircle className="w-12 h-12 text-[#B91C1C] mx-auto" />
            <h2 className="text-base font-bold text-[#0F172A]">
              {lang === 'my' ? 'ဆိုင်စုံ (ShopSone) ရယူရာတွင် အခက်အခဲရှိနေပါသည်' : 'Failed to Load ShopSone'}
            </h2>
            <p className="text-xs text-[#475569]">{error}</p>
            <button
              type="button"
              onClick={fetchMarketplace}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-xs"
            >
              {lang === 'my' ? 'ပြန်လည်ကြိုးစားမည်' : 'Retry'}
            </button>
          </div>
        )}

        {/* Empty Search State */}
        {!loading && !error && stores.length > 0 && filteredStores.length === 0 && (
          <div className="max-w-md mx-auto bg-white border border-[#CBD5E1] rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <Search className="w-12 h-12 text-[#64748B] mx-auto" />
            <h2 className="text-base font-bold text-[#0F172A]">
              {lang === 'my' ? 'ရှာဖွေတွေ့ရှိမှု မရှိပါ' : 'No Stores or Products Found'}
            </h2>
            <p className="text-xs text-[#475569]">
              {lang === 'my'
                ? `"${searchQuery}" နှင့် ကိုက်ညီသော စတိုး သို့မဟုတ် ကုန်ပစ္စည်း မရှိသေးပါ။`
                : `We could not find any stores or products matching "${searchQuery}".`}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-xs"
            >
              {lang === 'my' ? 'ရှာဖွေမှု အားလုံးကြည့်မည်' : 'View All Stores'}
            </button>
          </div>
        )}

        {/* Zero Published Stores State */}
        {!loading && !error && stores.length === 0 && (
          <div className="max-w-md mx-auto bg-white border border-[#CBD5E1] rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <Store className="w-12 h-12 text-[#64748B] mx-auto" />
            <h2 className="text-base font-bold text-[#0F172A]">
              {lang === 'my' ? 'လတ်တလော ဖွင့်လှစ်ထားသော စတိုးများ မရှိသေးပါ' : 'No Stores Available Yet'}
            </h2>
            <p className="text-xs text-[#475569]">
              {lang === 'my'
                ? 'မကြာမီ စတိုးများ ဖွင့်လှစ်လာပါမည်။ ကုန်သည်ဖြစ်ပါက Myanmar AI Seller စနစ်တွင် မိမိစတိုးကို ဖွင့်လှစ်နိုင်ပါသည်။'
                : 'Stores are being set up. If you are a merchant, publish your store from the merchant portal.'}
            </p>
            {onNavigateToMerchant && (
              <button
                type="button"
                onClick={onNavigateToMerchant}
                className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                {lang === 'my' ? 'ကုန်သည် အကောင့်သို့ သွားမည်' : 'Go to Merchant Portal'}
              </button>
            )}
          </div>
        )}

        {/* Stores List */}
        {!loading && !error && filteredStores.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span>
                {lang === 'my'
                  ? `စတိုး ${filteredStores.length} ဆိုင် (ပစ္စည်း ${totalMatchingProducts} ခု)`
                  : `Showing ${filteredStores.length} store${filteredStores.length === 1 ? '' : 's'} (${totalMatchingProducts} products)`}
              </span>
            </div>

            {filteredStores.map((store) => {
              const storeUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/store/${store.slug}`
                : `/store/${store.slug}`;
              const isCopied = copiedSlug === store.slug;

              return (
                <article
                  key={store.slug}
                  className="bg-white border border-[#CBD5E1] rounded-3xl overflow-hidden shadow-sm hover:border-[#2563EB]/40 hover:shadow-md transition-all"
                >
                  {/* Store Header Banner */}
                  <div className="p-5 sm:p-6 border-b border-[#CBD5E1] bg-[#F8FAFC]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Store Identity */}
                      <div className="flex items-start gap-4">
                        {store.logoUrl ? (
                          <img
                            src={store.logoUrl}
                            alt={store.storeName}
                            className="w-14 h-14 rounded-2xl object-cover border border-[#CBD5E1] shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#2563EB] font-bold text-lg shrink-0">
                            {store.storeName.substring(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base sm:lg font-bold text-[#0F172A]">
                              {store.storeName}
                            </h2>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EFF6FF] border border-[#DBEAFE] text-[#1E40AF] text-[10px] font-semibold">
                              <ShieldCheck className="w-3 h-3 text-[#2563EB]" />
                              <span>{lang === 'my' ? 'ဖွင့်လှစ်ပြီး' : 'Published'}</span>
                            </span>
                            <span className="text-[11px] font-mono text-[#64748B]">
                              /store/{store.slug}
                            </span>
                          </div>

                          <p className="text-xs text-[#475569] max-w-xl line-clamp-2 leading-relaxed">
                            {store.description}
                          </p>

                          {store.deliveryInfo && (
                            <div className="flex items-center gap-1.5 text-[11px] text-[#475569] pt-0.5">
                              <Truck className="w-3.5 h-3.5 text-[#2563EB]" />
                              <span>{store.deliveryInfo}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Store Action Links */}
                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        {/* Copy Link Button */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyStoreLink(store.slug, e)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                            isCopied
                              ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#15803D]'
                              : 'bg-white hover:bg-[#F8FAFC] border-[#CBD5E1] text-[#475569] hover:text-[#0F172A]'
                          }`}
                          title={storeUrl}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#15803D]" />
                              <span>{lang === 'my' ? 'ကူးယူပြီး' : 'Copied'}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#2563EB]" />
                              <span>{lang === 'my' ? 'လင့်ခ်ကူးရန်' : 'Copy Link'}</span>
                            </>
                          )}
                        </button>

                        {/* Visit Store Button */}
                        <button
                          type="button"
                          onClick={() => onSelectStore(store.slug)}
                          className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <span>{lang === 'my' ? 'စတိုးသို့ သွားမည်' : 'Visit Store'}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Store Products Preview Grid */}
                  <div className="p-5 sm:p-6 bg-white">
                    <div className="flex items-center justify-between mb-3 text-xs">
                      <span className="font-bold text-[#475569] uppercase tracking-wider text-[11px]">
                        {lang === 'my'
                          ? `ရရှိနိုင်သော ကုန်ပစ္စည်းများ (${store.filteredProducts.length})`
                          : `Available Products (${store.filteredProducts.length})`}
                      </span>
                      {store.filteredProducts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onSelectStore(store.slug)}
                          className="text-[11px] text-[#2563EB] hover:text-[#1D4ED8] hover:underline font-semibold cursor-pointer flex items-center gap-1"
                        >
                          <span>{lang === 'my' ? 'စတိုးအတွင်း အကုန်ကြည့်မည်' : 'View Full Catalog'}</span>
                          <ExternalLink className="w-3 h-3 text-[#2563EB]" />
                        </button>
                      )}
                    </div>

                    {store.filteredProducts.length === 0 ? (
                      <p className="text-xs text-[#64748B] py-4 text-center">
                        {lang === 'my'
                          ? 'ဤစတိုးတွင် ရွေးချယ်ထားသော အုပ်စုနှင့် ကိုက်ညီသော ပစ္စည်း မရှိသေးပါ။'
                          : 'No products in this store match the current filter.'}
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {store.filteredProducts.map((product) => {
                          const totalStock = (product.variants || []).reduce(
                            (acc, v) => acc + (Number(v.stock) || 0),
                            0
                          );
                          const inStock = totalStock > 0;

                          return (
                            <div
                              key={product.id}
                              onClick={() => onSelectStore(store.slug, product.id)}
                              className="group bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#2563EB]/40 rounded-2xl p-3 flex flex-col justify-between transition-all cursor-pointer relative shadow-xs hover:shadow-sm"
                            >
                              <div className="space-y-2">
                                {/* Thumbnail Image */}
                                <div className="aspect-square rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] overflow-hidden flex items-center justify-center relative">
                                  {product.imageUrl ? (
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <Package className="w-8 h-8 text-[#64748B]/40" />
                                  )}

                                  {/* Stock status badge */}
                                  <div className="absolute top-2 left-2">
                                    {inStock ? (
                                      <span className="px-1.5 py-0.5 rounded-md bg-[#15803D] text-white font-bold text-[9px] uppercase tracking-wider shadow-xs">
                                        {lang === 'my' ? 'ပစ္စည်းရှိ' : 'In Stock'}
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded-md bg-[#B91C1C] text-white font-bold text-[9px] uppercase tracking-wider shadow-xs">
                                        {lang === 'my' ? 'ပစ္စည်းပြတ်' : 'Sold Out'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Discount badge if present */}
                                  {product.discount && (
                                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD] font-bold text-[9px]">
                                      {product.discount}
                                    </div>
                                  )}
                                </div>

                                {/* Product Info */}
                                <div>
                                  <h3 className="text-xs font-bold text-[#0F172A] line-clamp-2 leading-snug group-hover:text-[#2563EB] transition-colors">
                                    {product.name}
                                  </h3>
                                  <p className="text-[11px] text-[#475569] line-clamp-1 mt-0.5">
                                    {product.description || (lang === 'my' ? 'အရည်အသွေးမြင့် ကုန်ပစ္စည်း' : 'Quality Item')}
                                  </p>
                                </div>
                              </div>

                              {/* Price & Action */}
                              <div className="pt-3 border-t border-[#CBD5E1]/60 mt-2 flex items-center justify-between gap-1">
                                <div>
                                  <span className="text-xs sm:text-sm font-bold text-[#1E40AF] font-mono">
                                    {product.price.toLocaleString()} {product.currency || 'MMK'}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectStore(store.slug, product.id);
                                  }}
                                  disabled={!inStock}
                                  className="px-2.5 py-1 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                >
                                  <span>{lang === 'my' ? 'ဝယ်မည်' : 'Buy'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Attribution */}
      <footer className="mt-12 py-8 border-t border-[#CBD5E1] bg-white text-center space-y-2 max-w-6xl mx-auto px-4 rounded-2xl shadow-xs">
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#475569]">
          <span className="font-bold text-[#0F172A]">ShopSone (ဆိုင်စုံ)</span>
          <span>•</span>
          <span className="text-[#2563EB] font-semibold">ဆိုင်စုံ၊ ပစ္စည်းစုံ၊ တစ်နေရာတည်း</span>
        </div>
        <p className="text-[11px] text-[#64748B]">
          Powered by <span className="text-[#1E40AF] font-semibold">Myanmar AI Seller</span>
        </p>
      </footer>

      <OrderSupportModal 
        isOpen={isSupportOpen} 
        onClose={() => {
          setIsSupportOpen(false);
          setInitialSupportCode(undefined);
        }} 
        lang={lang}
        initialCode={initialSupportCode}
      />
    </div>
  );
};
