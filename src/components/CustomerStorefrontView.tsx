import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Package,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  Plus,
  Minus,
  Copy,
  Store,
  Truck,
  CreditCard,
  ChevronRight,
  RefreshCw,
  Phone,
  MapPin,
  User as UserIcon,
  Tag,
  Search,
  ExternalLink,
  Lock,
  Upload,
  QrCode,
  Eye,
  Check,
  Image as ImageIcon,
  FileText,
  Clock
} from 'lucide-react';
import { OrderSupportModal } from './OrderSupportModal';
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
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'success'>('cart');

  // Customer Checkout Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'KBZPay' | 'WavePay' | 'AYA Pay' | 'COD'>('KBZPay');
  const [customerNotes, setCustomerNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Payment Slip Upload & Status State
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);
  const [transactionRefInput, setTransactionRefInput] = useState('');
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [slipUploadError, setSlipUploadError] = useState<string | null>(null);
  const [slipUploadSuccess, setSlipUploadSuccess] = useState(false);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState<string>('PENDING');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copiedAccountName, setCopiedAccountName] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [previewQrModalUrl, setPreviewQrModalUrl] = useState<string | null>(null);

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
    setCheckoutStep('cart');
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

  // Submit Order to Server
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim() || cart.length === 0 || submittingOrder) {
      return;
    }

    setSubmittingOrder(true);
    setOrderError(null);

    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress: shippingAddress.trim() + (customerNotes.trim() ? ` (Note: ${customerNotes.trim()})` : ''),
        paymentMethod,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          variant: item.variantName,
          price: item.price,
          qty: item.qty
        }))
      };

      const res = await fetch(`/api/public/store/${encodeURIComponent(slug)}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      setCreatedOrder(data.order);
      setCurrentPaymentStatus(data.order?.paymentStatus || 'PENDING');
      setRejectionReason(data.order?.rejectionReason || null);
      setSlipFile(null);
      setSlipPreviewUrl(null);
      setTransactionRefInput('');
      setSlipUploadSuccess(false);
      setSlipUploadError(null);
      setCheckoutStep('success');
      setCart([]);
      // Refresh catalog to reflect updated stock authoritatively
      fetchStoreData();
    } catch (err: any) {
      setOrderError(err.message || 'An error occurred while submitting your order. Please try again.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handleCopyText = (text: string, type: 'name' | 'phone') => {
    navigator.clipboard.writeText(text);
    if (type === 'name') {
      setCopiedAccountName(true);
      setTimeout(() => setCopiedAccountName(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleSelectSlipFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setSlipUploadError(lang === 'my' ? 'JPG, PNG သို့မဟုတ် WebP ပုံရိပ်များသာ လက်ခံပါသည်' : 'Only JPEG, PNG, or WebP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSlipUploadError(lang === 'my' ? 'ဖိုင်ဆိုဒ် 5MB ထက် မကျော်ရပါ' : 'File size must not exceed 5MB.');
      return;
    }
    setSlipFile(file);
    setSlipUploadError(null);
    const objectUrl = URL.createObjectURL(file);
    setSlipPreviewUrl(objectUrl);
  };

  const handleUploadPaymentSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdOrder?.id || !slipFile || uploadingSlip) return;

    setUploadingSlip(true);
    setSlipUploadError(null);
    setSlipUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('slipImage', slipFile);
      if (createdOrder.supportCode) {
        formData.append('supportCode', createdOrder.supportCode);
      }
      if (transactionRefInput.trim()) {
        formData.append('transactionRef', transactionRefInput.trim());
      }

      let res: Response;
      try {
        res = await fetch(`/api/public/orders/${encodeURIComponent(createdOrder.id)}/payment-slip`, {
          method: 'POST',
          body: formData
        });
      } catch (fetchErr: any) {
        // Network connection error (e.g. offline, connection dropped, or Myanmar ISP blocking Render without VPN)
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        const netMsg = isOffline
          ? (lang === 'my'
              ? 'အင်တာနက်ချိတ်ဆက်မှု မရှိပါ (Offline)။ ကျေးဇူးပြု၍ အင်တာနက်လိုင်း စစ်ဆေးပေးပါ။'
              : 'You are currently offline. Please check your internet connection.')
          : (lang === 'my'
              ? 'ဆာဗာနှင့် ကွန်ရက်ချိတ်ဆက်မှု မအောင်မြင်ပါ (Network connection failed)။ KPay ငွေလွှဲပြီးပါက ပြေစာတင်ရန် VPN ပြန်လည်ဖွင့်ပေးပါ သို့မဟုတ် အင်တာနက်လိုင်း စစ်ဆေးပေးပါ။'
              : 'Network connection failed. If you turned off VPN for KBZPay, please re-enable VPN or check your connection to submit the slip.');
        throw new Error(netMsg);
      }

      // Safe Content-Type inspection to prevent "Unexpected token '<', <!doctype" syntax crash
      const contentType = res.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      } else {
        // Non-JSON response (e.g. 502 Bad Gateway or 504 Gateway Timeout HTML page from upstream proxy)
        const textSnippet = await res.text().catch(() => '');
        console.warn('[PaymentSlip] Non-JSON response received from server/proxy:', res.status, textSnippet.slice(0, 100));
      }

      if (!res.ok) {
        if (data && data.error) {
          throw new Error(data.error);
        }
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          throw new Error(
            lang === 'my'
              ? `ဆာဗာလိုင်း မအားလပ်သေးပါ သို့မဟုတ် ပြန်လည်စတင်နေပါသည် (HTTP ${res.status})။ ခေတ္တစောင့်ပြီး ထပ်မံကြိုးစားပါ။`
              : `The server is temporarily unavailable or restarting (HTTP ${res.status}). Please wait a moment and try again.`
          );
        }
        if (res.status === 413) {
          throw new Error(
            lang === 'my'
              ? 'ဖိုင်အရွယ်အစား ကြီးလွန်းပါသည်။ 5MB အောက် ပုံကိုသာ ရွေးချယ်ပေးပါ။'
              : 'File size too large. Please select an image under 5 MiB.'
          );
        }
        throw new Error(
          lang === 'my'
            ? `ငွေလွှဲပြေစာ တင်သွင်းမှု မအောင်မြင်ပါ (HTTP ${res.status})။`
            : `Failed to upload payment slip (HTTP ${res.status}).`
        );
      }

      if (!data) {
        throw new Error(
          lang === 'my'
            ? 'ဆာဗာမှ တုံ့ပြန်မှု မမှန်ကန်ပါ။ ခေတ္တစောင့်ပြီး ထပ်မံကြိုးစားပါ။'
            : 'Invalid server response. Please try again.'
        );
      }

      setSlipUploadSuccess(true);
      setCurrentPaymentStatus(data.paymentStatus || 'SLIP_SUBMITTED');
      setRejectionReason(null);
      if (data.order) {
        setCreatedOrder(data.order);
      }
    } catch (err: any) {
      setSlipUploadError(err.message || 'Payment slip submission failed');
    } finally {
      setUploadingSlip(false);
    }
  };

  const handleRefreshPaymentStatus = async () => {
    if (!createdOrder?.id || checkingStatus) return;
    setCheckingStatus(true);
    try {
      const url = createdOrder.supportCode
        ? `/api/public/orders/${encodeURIComponent(createdOrder.id)}/payment-status?code=${encodeURIComponent(createdOrder.supportCode)}&supportCode=${encodeURIComponent(createdOrder.supportCode)}`
        : `/api/public/orders/${encodeURIComponent(createdOrder.id)}/payment-status`;
      const res = await fetch(url);
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          setCurrentPaymentStatus(data.paymentStatus);
          setRejectionReason(data.rejectionReason || null);
          if (data.order) {
            setCreatedOrder(data.order);
          }
        }
      }
    } catch {
      // Ignore network hiccup
    } finally {
      setCheckingStatus(false);
    }
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
  if (loading) {
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
                setCheckoutStep('cart');
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
                setCheckoutStep('cart');
              }}
              className="py-2.5 px-5 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <span>{lang === 'my' ? 'ခြင်းတောင်းကြည့်မည် / အော်ဒါတင်မည်' : 'View Cart & Checkout'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Cart & Checkout Modal Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#181810] border border-[#393426] rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-4 my-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#393426] pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#C9A227]" />
                <h3 className="text-base font-bold text-[#F5F2E8]">
                  {checkoutStep === 'cart'
                    ? (lang === 'my' ? 'ဝယ်ယူမည့် ပစ္စည်းများ' : 'Shopping Cart')
                    : checkoutStep === 'details'
                    ? (lang === 'my' ? 'ပို့ဆောင်မည့် လိပ်စာနှင့် ငွေချေစနစ်' : 'Checkout Details')
                    : (lang === 'my' ? 'အော်ဒါတင်သွင်းမှု အောင်မြင်ပါသည်' : 'Order Confirmed')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1 hover:bg-[#252419] rounded-lg text-[#817D70] hover:text-[#F5F2E8] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Cart Review */}
            {checkoutStep === 'cart' && (
              <div className="space-y-4 text-xs">
                {cart.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <ShoppingCart className="w-10 h-10 text-[#776324] mx-auto" />
                    <p className="text-sm font-semibold text-[#F5F2E8]">
                      {lang === 'my' ? 'ခြင်းတောင်းထဲတွင် ပစ္စည်းမရှိသေးပါ' : 'Your cart is empty'}
                    </p>
                    <p className="text-[#817D70]">
                      {lang === 'my' ? 'စတိုးမှ ပစ္စည်းများကို ရွေးချယ်ထည့်သွင်းပါ' : 'Browse products and add to cart'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 divide-y divide-[#393426]/60">
                      {cart.map((item) => (
                        <div key={`${item.productId}-${item.variantId}`} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-[#F5F2E8] truncate">{item.name}</h4>
                            <p className="text-[11px] text-[#817D70] font-mono">
                              {item.variantName} · {item.price.toLocaleString()} MMK
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center bg-[#11110D] border border-[#393426] rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.productId, item.variantId, -1)}
                                className="p-1.5 hover:bg-[#252419] text-[#B9B5A7] hover:text-[#F5F2E8]"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-mono font-bold text-xs text-[#F5F2E8]">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                disabled={item.qty >= item.maxStock}
                                onClick={() => handleUpdateQty(item.productId, item.variantId, 1)}
                                className="p-1.5 hover:bg-[#252419] text-[#B9B5A7] hover:text-[#F5F2E8] disabled:opacity-30"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.productId, item.variantId)}
                              className="p-1.5 text-[#817D70] hover:text-[#E06B61] transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-[#11110D] p-3.5 rounded-xl border border-[#393426] flex items-center justify-between font-bold text-sm">
                      <span className="text-[#B9B5A7]">{lang === 'my' ? 'စုစုပေါင်း' : 'Subtotal'}:</span>
                      <span className="font-mono text-[#C9A227]">{totalCartAmount.toLocaleString()} MMK</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#393426]">
                      <button
                        type="button"
                        onClick={() => setIsCartOpen(false)}
                        className="px-4 py-2.5 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#B9B5A7] font-semibold rounded-xl cursor-pointer"
                      >
                        {lang === 'my' ? 'ဝယ်ယူမှု ဆက်လုပ်မည်' : 'Continue Shopping'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckoutStep('details')}
                        className="px-5 py-2.5 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <span>{lang === 'my' ? 'လိပ်စာထည့်သွင်းမည်' : 'Proceed to Checkout'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Checkout Form */}
            {checkoutStep === 'details' && (
              <form onSubmit={handleSubmitOrder} className="space-y-4 text-xs">
                {orderError && (
                  <div className="p-3 bg-[#E06B61]/15 border border-[#E06B61]/40 rounded-xl text-xs text-[#E06B61] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{orderError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-[#B9B5A7] font-semibold mb-1">
                    {lang === 'my' ? 'သင့်အမည်' : 'Customer Full Name'} *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-[#817D70] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Daw Mya / Ko Min"
                      className="w-full bg-[#11110D] border border-[#393426] rounded-xl pl-9 pr-3 py-2 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#B9B5A7] font-semibold mb-1">
                    {lang === 'my' ? 'ဖုန်းနံပါတ်' : 'Phone Number'} *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#817D70] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="09123456789"
                      className="w-full bg-[#11110D] border border-[#393426] rounded-xl pl-9 pr-3 py-2 text-[#F5F2E8] font-mono focus:border-[#C9A227] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#B9B5A7] font-semibold mb-1">
                    {lang === 'my' ? 'ပို့ဆောင်ရမည့် လိပ်စာ (မြို့နယ်၊ လမ်း၊ တိုက်နံပါတ်)' : 'Delivery Address'} *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#817D70] absolute left-3 top-3" />
                    <textarea
                      rows={2}
                      required
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder={lang === 'my' ? 'အမှတ် (၁၂)၊ ကုန်သည်လမ်း၊ ကျောက်တံတား၊ ရန်ကုန်' : 'Building No., Street, Township, City'}
                      className="w-full bg-[#11110D] border border-[#393426] rounded-xl pl-9 pr-3 py-2 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#B9B5A7] font-semibold mb-1">
                    {lang === 'my' ? 'ငွေပေးချေမည့် နည်းလမ်း' : 'Payment Method'} *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['KBZPay', 'WavePay', 'AYA Pay', 'COD'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`p-2.5 rounded-xl border text-left font-semibold text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          paymentMethod === method
                            ? 'bg-[#C9A227] text-[#0B0B09] border-[#C9A227]'
                            : 'bg-[#11110D] text-[#F5F2E8] border-[#393426] hover:bg-[#1E1D14]'
                        }`}
                      >
                        <span>{method === 'COD' ? (lang === 'my' ? 'အိမ်ရောက်ငွေချေ (COD)' : 'Cash on Delivery') : method}</span>
                        {paymentMethod === method && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Merchant Verified KPay Payment Instructions Preview */}
                {paymentMethod === 'KBZPay' ? (
                  store?.paymentSettings?.kpayAccountName || store?.paymentSettings?.kpayPhone ? (
                    <div className="p-3.5 bg-[#181810] rounded-xl border border-[#C9A227]/40 text-[11px] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#C9A227] font-bold flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{lang === 'my' ? 'KBZPay ဖြင့် ငွေပေးချေရန် လမ်းညွှန်' : 'KBZPay Payment Details'}</span>
                        </span>
                        <span className="text-[10px] text-[#65B985] bg-[#65B985]/15 border border-[#65B985]/30 px-2 py-0.5 rounded-full font-bold">
                          {lang === 'my' ? 'ဆိုင်ရှင် အတည်ပြုပြီး' : 'Verified'}
                        </span>
                      </div>

                      <div className="bg-[#11110D] p-2.5 rounded-lg border border-[#393426] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[#817D70]">{lang === 'my' ? 'အကောင့်အမည်' : 'Account Name'}:</span>
                          <span className="font-bold text-[#F5F2E8]">{store.paymentSettings.kpayAccountName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#817D70]">{lang === 'my' ? 'ဖုန်းနံပါတ်' : 'Phone Number'}:</span>
                          <span className="font-mono font-bold text-[#C9A227]">{store.paymentSettings.kpayPhone}</span>
                        </div>
                      </div>

                      {store.paymentSettings.paymentRules && (
                        <div className="text-[10px] text-[#B9B5A7] whitespace-pre-line leading-relaxed bg-[#11110D]/50 p-2 rounded border border-[#393426]/50">
                          <span className="text-[#E0BD55] font-semibold block mb-0.5">
                            {lang === 'my' ? 'ငွေလွှဲစည်းမျဉ်းများ' : 'Transfer Rules'}:
                          </span>
                          {store.paymentSettings.paymentRules}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-[11px] text-amber-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>{lang === 'my' ? 'ဆိုင်ရှင် KPay အချက်အလက် မသတ်မှတ်ရသေးပါ' : 'KPay details pending merchant setup'}</span>
                      </div>
                      <p className="text-[#817D70]">
                        {lang === 'my'
                          ? 'ဤစတိုးသည် KPay ဆက်တင် မထည့်သွင်းရသေးပါ။ အော်ဒါတင်ပြီးနောက် ဆိုင်ရှင်ထံ ဆက်သွယ်၍ အတည်ပြုပေးပါရန်။'
                          : 'Merchant has not completed KPay configuration. Please confirm with merchant after order placement.'}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="p-3 bg-[#11110D] rounded-xl border border-[#393426] text-[11px] space-y-1">
                    <span className="text-[#C9A227] font-bold block">
                      {lang === 'my' ? 'စတိုး၏ ငွေပေးချေမှု လမ်းညွှန်' : 'Payment Instructions'}:
                    </span>
                    <p className="text-[#B9B5A7] leading-relaxed">
                      {store?.paymentInstructions || (paymentMethod === 'COD' ? (lang === 'my' ? 'ပစ္စည်းရောက်မှ ငွေချေပေးပါ' : 'Pay in cash upon delivery') : 'Transfer payment to merchant account.')}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-[#B9B5A7] font-semibold mb-1">
                    {lang === 'my' ? 'မှတ်ချက် (ရွေးချယ်နိုင်သည်)' : 'Order Notes (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder={lang === 'my' ? 'ဥပမာ- ရုံးချိန်အတွင်း ပို့ပေးပါ' : 'e.g. Please deliver before 5 PM'}
                    className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
                  />
                </div>

                <div className="bg-[#11110D] p-3.5 rounded-xl border border-[#393426] flex items-center justify-between font-bold text-sm">
                  <span className="text-[#B9B5A7]">{lang === 'my' ? 'ပေးချေရမည့် စုစုပေါင်း' : 'Total Amount'}:</span>
                  <span className="font-mono text-[#C9A227]">{totalCartAmount.toLocaleString()} MMK</span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#393426]">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('cart')}
                    className="px-4 py-2.5 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#B9B5A7] font-semibold rounded-xl cursor-pointer"
                  >
                    {lang === 'my' ? 'နောက်သို့' : 'Back to Cart'}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingOrder}
                    className="px-5 py-2.5 bg-[#C9A227] hover:bg-[#A88419] disabled:opacity-50 text-[#0B0B09] font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    {submittingOrder ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{lang === 'my' ? 'အော်ဒါ ပို့နေပါသည်...' : 'Placing Order...'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{lang === 'my' ? 'အော်ဒါ အပြီးသတ်တင်မည်' : 'Confirm Order'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Success Screen with KPay Transfer Info & Payment Slip Upload */}
            {checkoutStep === 'success' && (
              <div className="text-center py-4 space-y-5 text-xs">
                {/* Success Banner */}
                <div className="space-y-2">
                  <div className="w-14 h-14 bg-[#65B985]/15 border border-[#65B985]/40 rounded-full flex items-center justify-center mx-auto text-[#65B985]">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#F5F2E8]">
                      {lang === 'my' ? 'အော်ဒါ တင်သွင်းမှု အောင်မြင်ပါသည်!' : 'Order Placed Successfully!'}
                    </h4>
                    <p className="text-xs text-[#817D70]">
                      {lang === 'my' ? 'ကုန်သည်ထံသို့ အော်ဒါအချက်အလက်များ တိုက်ရိုက်ရောက်ရှိသွားပါပြီ' : 'Your order has been recorded directly in the merchant workspace.'}
                    </p>
                  </div>
                </div>

                {/* Order Summary & Support Code */}
                <div className="bg-[#11110D] border border-[#393426] p-4 rounded-2xl text-left space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#817D70] font-semibold">{lang === 'my' ? 'အော်ဒါ နံပါတ်' : 'Order ID'}:</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-[#C9A227]">
                      <span>{createdOrder?.id}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyOrderId(createdOrder?.id)}
                        className="p-1 hover:bg-[#1E1D14] rounded text-[#817D70] hover:text-[#F5F2E8] cursor-pointer"
                        title={lang === 'my' ? 'ကူးယူရန်' : 'Copy'}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {createdOrder?.supportCode && (
                    <div className="flex items-center justify-between pt-2 border-t border-[#393426]/50">
                      <span className="text-[#817D70] font-semibold">{lang === 'my' ? 'Support Code' : 'Support Code'}:</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-[#65B985]">
                        <span>{createdOrder.supportCode}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyOrderId(createdOrder.supportCode)}
                          className="p-1 hover:bg-[#1E1D14] rounded text-[#817D70] hover:text-[#F5F2E8] cursor-pointer"
                          title={lang === 'my' ? 'ကူးယူရန်' : 'Copy'}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {copiedOrderId && (
                    <span className="text-[10px] text-[#65B985] block text-right font-medium">
                      {lang === 'my' ? 'ကူးယူပြီးပါပြီ' : 'Copied to clipboard!'}
                    </span>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#393426]/50">
                    <span className="text-[#817D70]">{lang === 'my' ? 'ကျသင့်ငွေ စုစုပေါင်း' : 'Total Amount'}:</span>
                    <span className="font-mono font-bold text-sm text-[#F5F2E8]">
                      {createdOrder?.totalAmount?.toLocaleString()} MMK
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#817D70]">{lang === 'my' ? 'ငွေပေးချေမှု နည်းလမ်း' : 'Payment Method'}:</span>
                    <span className="text-[#F5F2E8] font-semibold">{createdOrder?.paymentMethod}</span>
                  </div>
                </div>

                {/* KBZPay Payment Info & Transfer Box */}
                {createdOrder?.paymentMethod !== 'COD' && (
                  <div className="space-y-4 text-left">
                    {/* Merchant KPay Details */}
                    {store?.paymentSettings?.kpayAccountName || store?.paymentSettings?.kpayPhone ? (
                      <div className="bg-[#181810] border border-[#C9A227]/40 rounded-2xl p-4 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#C9A227] flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4" />
                            <span>{lang === 'my' ? 'KBZPay ဖြင့် ငွေလွှဲပေးချေရန် အချက်အလက်' : 'KBZPay Transfer Information'}</span>
                          </span>
                          <span className="text-[10px] bg-[#65B985]/15 border border-[#65B985]/30 text-[#65B985] px-2 py-0.5 rounded-full font-bold">
                            Official Merchant
                          </span>
                        </div>

                        {/* QR Code if present */}
                        {store.paymentSettings.kpayQrUrl && (
                          <div className="flex flex-col items-center justify-center p-3 bg-[#11110D] border border-[#393426] rounded-xl space-y-2">
                            <div className="relative group w-40 h-40 bg-white p-2 rounded-xl flex items-center justify-center shadow-md">
                              <img
                                src={store.paymentSettings.kpayQrUrl}
                                alt="Merchant KBZPay QR"
                                className="w-full h-full object-contain rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => setPreviewQrModalUrl(store.paymentSettings!.kpayQrUrl!)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white cursor-pointer"
                                title="Enlarge QR"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </div>
                            <span className="text-[10px] text-[#817D70]">
                              {lang === 'my' ? 'KBZPay App ဖြင့် Scan ဖတ်၍ တိုက်ရိုက် ငွေလွှဲနိုင်ပါသည်' : 'Scan with KBZPay app to transfer directly'}
                            </span>
                          </div>
                        )}

                        {/* Account Name & Phone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="bg-[#11110D] border border-[#393426] rounded-xl p-3 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-[#817D70] block">{lang === 'my' ? 'အကောင့်ပိုင်ရှင် အမည်' : 'Account Name'}</span>
                              <span className="font-bold text-[#F5F2E8]">{store.paymentSettings.kpayAccountName}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText(store.paymentSettings!.kpayAccountName, 'name')}
                              className="p-1.5 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] rounded-lg text-[#B9B5A7] hover:text-[#F5F2E8] cursor-pointer"
                              title="Copy Name"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="bg-[#11110D] border border-[#393426] rounded-xl p-3 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-[#817D70] block">{lang === 'my' ? 'KPay ဖုန်းနံပါတ်' : 'Phone Number'}</span>
                              <span className="font-mono font-bold text-[#C9A227]">{store.paymentSettings.kpayPhone}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText(store.paymentSettings!.kpayPhone, 'phone')}
                              className="p-1.5 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] rounded-lg text-[#B9B5A7] hover:text-[#F5F2E8] cursor-pointer"
                              title="Copy Phone"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {copiedAccountName && (
                          <p className="text-[10px] text-[#65B985] font-semibold text-right">အကောင့်အမည် ကူးယူပြီးပါပြီ</p>
                        )}
                        {copiedPhone && (
                          <p className="text-[10px] text-[#65B985] font-semibold text-right">ဖုန်းနံပါတ် ကူးယူပြီးပါပြီ</p>
                        )}

                        {/* Rules */}
                        {store.paymentSettings.paymentRules && (
                          <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3 text-[11px] text-amber-200 space-y-1">
                            <span className="font-bold flex items-center gap-1 text-amber-300">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                              <span>{lang === 'my' ? 'ငွေလွှဲစည်းမျဉ်းများနှင့် သတိပြုရန်များ' : 'Important Transfer Rules'}</span>
                            </span>
                            <div className="whitespace-pre-line leading-relaxed text-[#B9B5A7] text-[11px]">
                              {store.paymentSettings.paymentRules}
                            </div>
                          </div>
                        )}

                        {store.paymentSettings.customInstructions && (
                          <p className="text-[11px] text-[#817D70] italic">
                            "{store.paymentSettings.customInstructions}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-2xl text-xs text-amber-300 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span>{lang === 'my' ? 'ဆိုင်ရှင် KPay အချက်အလက် မသတ်မှတ်ရသေးပါ' : 'KPay setup not yet completed by merchant'}</span>
                        </div>
                        <p className="text-[#817D70]">
                          {lang === 'my'
                            ? 'ဤဆိုင်သည် တရားဝင် KPay အချက်အလက်များ မသတ်မှတ်ရသေးပါ။ မလွှဲမီ ဆိုင်ရှင်ထံ ဆက်သွယ်အတည်ပြုပါရန်။'
                            : 'This store has not verified its KPay transfer details. Please contact the merchant directly before sending money.'}
                        </p>
                      </div>
                    )}

                    {/* Payment Slip Submission Box */}
                    <div className="bg-[#181810] border border-[#393426] rounded-2xl p-4 space-y-3.5">
                      <div className="flex items-center justify-between border-b border-[#393426] pb-2.5">
                        <span className="text-xs font-bold text-[#F5F2E8] flex items-center gap-1.5">
                          <Upload className="w-4 h-4 text-[#C9A227]" />
                          <span>{lang === 'my' ? 'ငွေလွှဲပြေစာ (Payment Slip) တင်သွင်းရန်' : 'Submit Payment Slip'}</span>
                        </span>

                        <button
                          type="button"
                          onClick={handleRefreshPaymentStatus}
                          disabled={checkingStatus}
                          className="text-[10px] text-[#C9A227] hover:text-[#E0BD55] flex items-center gap-1 cursor-pointer font-semibold"
                          title="Refresh status"
                        >
                          <RefreshCw className={`w-3 h-3 ${checkingStatus ? 'animate-spin' : ''}`} />
                          <span>{lang === 'my' ? 'စစ်ဆေးမည်' : 'Check Status'}</span>
                        </button>
                      </div>

                      {/* Current Status Display */}
                      {currentPaymentStatus === 'CONFIRMED' ? (
                        <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl text-center space-y-1">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                          <h5 className="font-bold text-emerald-300 text-sm">
                            {lang === 'my' ? 'ငွေပေးချေမှု အတည်ပြုပြီးပါပြီ!' : 'Payment Confirmed!'}
                          </h5>
                          <p className="text-[11px] text-emerald-200/80">
                            {lang === 'my' ? 'ဆိုင်ရှင်မှ ငွေလက်ခံရရှိမှုကို စစ်ဆေးအတည်ပြုပြီးပါပြီ။' : 'Merchant has verified and approved your payment.'}
                          </p>
                        </div>
                      ) : currentPaymentStatus === 'SLIP_SUBMITTED' ? (
                        <div className="p-4 bg-blue-950/30 border border-blue-800/50 rounded-xl space-y-2">
                          <div className="flex items-center gap-2 text-blue-300 font-bold text-xs">
                            <Clock className="w-4 h-4 text-blue-400" />
                            <span>{lang === 'my' ? 'ငွေလွှဲပြေစာ တင်သွင်းထားပြီးပါပြီ (စစ်ဆေးဆဲ)' : 'Slip Submitted (Pending Review)'}</span>
                          </div>
                          <p className="text-[11px] text-blue-200/80">
                            {lang === 'my'
                              ? 'ဆိုင်ရှင်မှ ငွေဝင်ရောက်မှုကို စစ်ဆေးနေပါပြီ။ စစ်ဆေးအတည်ပြုပြီးပါက အော်ဒါ စတင်ပို့ဆောင်ပါမည်။'
                              : 'The merchant is verifying your transaction. You will be updated once confirmed.'}
                          </p>
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setCurrentPaymentStatus('PENDING')}
                              className="text-[11px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                            >
                              {lang === 'my' ? 'ပြေစာ အသစ် ထပ်မံတင်မည်' : 'Upload replacement slip'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleUploadPaymentSlip} className="space-y-3">
                          {/* Rejection Alert if previously rejected */}
                          {currentPaymentStatus === 'REJECTED' && (
                            <div className="p-3 bg-rose-950/30 border border-rose-800/60 rounded-xl space-y-1 text-rose-200">
                              <div className="flex items-center gap-1.5 font-bold text-rose-300 text-xs">
                                <AlertCircle className="w-4 h-4 text-rose-400" />
                                <span>{lang === 'my' ? 'ငွေလွှဲပြေစာ ငြင်းပယ်ခံရသည်' : 'Payment Slip Rejected'}</span>
                              </div>
                              <p className="text-[11px] leading-relaxed">
                                <span className="font-semibold text-rose-300">{lang === 'my' ? 'အကြောင်းပြချက်' : 'Reason'}: </span>
                                "{rejectionReason || createdOrder?.rejectionReason || 'Please upload a valid and clear transfer slip.'}"
                              </p>
                              <span className="text-[10px] text-rose-400 block pt-0.5">
                                {lang === 'my' ? 'ကျေးဇူးပြု၍ ပြေစာအသစ် သို့မဟုတ် မှန်ကန်သော ပြေစာကို အောက်တွင် ပြန်လည်တင်သွင်းပေးပါ။' : 'Please upload a clear, valid slip below to resubmit.'}
                              </span>
                            </div>
                          )}

                          {slipUploadError && (
                            <div className="p-2.5 bg-rose-950/20 border border-rose-800/40 rounded-xl text-rose-300 text-xs flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>{slipUploadError}</span>
                            </div>
                          )}

                          {/* File Input & Preview */}
                          <div className="space-y-2">
                            <label className="block text-[#B9B5A7] font-semibold">
                              {lang === 'my' ? 'ငွေလွှဲပြေစာ Screenshot/ပုံ ရွေးချယ်ပါ *' : 'Payment Slip Screenshot *'}
                            </label>

                            <div className="flex items-center gap-3">
                              {slipPreviewUrl ? (
                                <div className="relative group w-20 h-20 bg-neutral-900 border border-[#393426] rounded-xl overflow-hidden shrink-0">
                                  <img src={slipPreviewUrl} alt="Slip Preview" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSlipFile(null);
                                      setSlipPreviewUrl(null);
                                    }}
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-rose-400 cursor-pointer"
                                    title="Remove file"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="w-20 h-20 bg-[#11110D] border-2 border-dashed border-[#393426] rounded-xl flex flex-col items-center justify-center text-[#817D70] shrink-0">
                                  <ImageIcon className="w-6 h-6" />
                                </div>
                              )}

                              <div className="flex-1 space-y-1">
                                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#F5F2E8] rounded-xl cursor-pointer font-semibold text-xs transition-colors">
                                  <Upload className="w-3.5 h-3.5 text-[#C9A227]" />
                                  <span>{slipFile ? (lang === 'my' ? 'ပုံအသစ်ရွေးရန်' : 'Change Image') : (lang === 'my' ? 'ဖိုင်ရွေးမည် (JPG/PNG)' : 'Choose File')}</span>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleSelectSlipFile}
                                    className="hidden"
                                    disabled={uploadingSlip}
                                  />
                                </label>
                                <p className="text-[10px] text-[#817D70]">
                                  {slipFile ? slipFile.name : (lang === 'my' ? 'အများဆုံး 5MB (JPG, PNG, WebP)' : 'Max 5MB (JPG, PNG, WebP)')}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Transaction Ref No */}
                          <div>
                            <label className="block text-[#B9B5A7] font-semibold mb-1">
                              {lang === 'my' ? 'KBZPay Transaction ID / Ref No (ရွေးချယ်နိုင်သည်)' : 'Transaction ID / Ref No (Optional)'}
                            </label>
                            <input
                              type="text"
                              value={transactionRefInput}
                              onChange={(e) => setTransactionRefInput(e.target.value)}
                              placeholder="e.g. 024419284192..."
                              className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] font-mono focus:border-[#C9A227] focus:outline-none"
                            />
                          </div>

                          {/* Submit Slip Button */}
                          <button
                            type="submit"
                            disabled={!slipFile || uploadingSlip}
                            className="w-full py-2.5 px-4 bg-[#C9A227] hover:bg-[#A88419] disabled:opacity-50 text-[#0B0B09] font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
                          >
                            {uploadingSlip ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>{lang === 'my' ? 'စလစ် တင်သွင်းနေပါသည်...' : 'Uploading Slip...'}</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span>{lang === 'my' ? 'စလစ် ပေးပို့စစ်ဆေးမည်' : 'Submit Slip for Verification'}</span>
                              </>
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {/* Support and Continue Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSupportOpen(true)}
                    className="flex-1 py-3 px-4 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#C9A227] hover:text-[#F5F2E8] font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    {lang === 'my' ? 'အော်ဒါ အကူအညီ ရယူရန် (Support)' : 'Contact Order Support'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartOpen(false);
                      setCheckoutStep('cart');
                    }}
                    className="flex-1 py-3 px-4 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-bold rounded-xl cursor-pointer shadow-md transition-colors"
                  >
                    {lang === 'my' ? 'ဈေးဝယ်မှု ဆက်လက်ပြုလုပ်မည်' : 'Continue Shopping'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}



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

      {previewQrModalUrl && (
        <div
          onClick={() => setPreviewQrModalUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-sm w-full bg-white rounded-2xl p-4 shadow-2xl flex flex-col items-center space-y-3"
          >
            <div className="flex items-center justify-between w-full border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-800 text-xs">KBZPay QR Code</span>
              <button
                type="button"
                onClick={() => setPreviewQrModalUrl(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewQrModalUrl}
              alt="KBZPay QR"
              className="w-64 h-64 object-contain rounded-xl"
            />
            <p className="text-[11px] text-slate-500 text-center">
              {lang === 'my' ? 'KBZPay App ဖွင့်ပြီး ဤ QR ကုဒ်ကို Scan ဖတ်ပါ' : 'Open KBZPay app and scan this QR code'}
            </p>
          </div>
        </div>
      )}

      <OrderSupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} lang={lang} />
    </div>
  );
};
