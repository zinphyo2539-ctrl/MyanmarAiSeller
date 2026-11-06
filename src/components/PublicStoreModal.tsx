import React, { useState } from 'react';
import {
  X,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowRight,
  ExternalLink,
  Store,
  CreditCard
} from 'lucide-react';
import { Product, StoreSettings, ProductVariant } from '../types';

interface PublicStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreSettings | null;
  products: Product[];
  lang: 'my' | 'en';
  onOrderCreated: () => void;
}

interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  variant: string;
  price: number;
  qty: number;
}

export const PublicStoreModal: React.FC<PublicStoreModalProps> = ({
  isOpen,
  onClose,
  store,
  products,
  lang,
  onOrderCreated
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  if (!isOpen) return null;

  const activeProducts = products.filter((p) => p.status === 'active' || !p.status);

  const handleAddToCart = (product: Product, variant: ProductVariant) => {
    if (variant.stock <= 0) return;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id && item.variantId === variant.id
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        if (updated[existingIndex].qty < variant.stock) {
          updated[existingIndex].qty += 1;
        }
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            variant: `${variant.color} / ${variant.size}`,
            price: product.price,
            qty: 1
          }
        ];
      }
    });
  };

  const handleRemoveFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim()) {
      setOrderError(lang === 'my' ? 'အချက်အလက်များ အားလုံးဖြည့်သွင်းပါ' : 'Please fill all required fields');
      return;
    }

    setSubmitting(true);
    setOrderError(null);

    try {
      const slug = store?.slug || 'yangon-style';
      const res = await fetch(`/api/public/store/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          shippingAddress: shippingAddress.trim(),
          paymentMethod: 'KBZPay',
          items: cart
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      setCreatedOrder(data.order);
      setCheckoutStep('success');
      setCart([]);
      onOrderCreated();
    } catch (err: any) {
      setOrderError(err.message || 'Error occurred during checkout');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto transition-all duration-300">
      <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl w-full max-w-2xl p-5 sm:p-6 space-y-4 my-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)] text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider font-mono">
              {lang === 'my' ? 'Public စတိုး စမ်းသပ်ခန်း' : 'Public Storefront Simulation'}
            </span>
            <h3 className="text-base font-bold text-white">
              {store?.storeName || 'Yangon Style Store'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {checkoutStep === 'cart' && (
          <div className="space-y-4 text-xs">
            {/* Products grid */}
            <div className="space-y-2">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block font-mono">
                {lang === 'my' ? 'ရောင်းချနေသော ကုန်ပစ္စည်းများ' : 'Available Products in Catalog'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                {activeProducts.map((prod) => (
                  <div key={prod.id} className="bg-white/[0.03] border border-white/10 p-3.5 rounded-2xl flex flex-col justify-between space-y-2 shadow-sm">
                    <div>
                      <h4 className="font-bold text-white">{prod.name}</h4>
                      <p className="font-mono text-purple-300 font-bold mt-0.5 tabular-nums">
                        {prod.price.toLocaleString()} MMK
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-mono">Variants:</span>
                      <div className="flex flex-wrap gap-1">
                        {(prod.variants || []).map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            disabled={v.stock <= 0}
                            onClick={() => handleAddToCart(prod, v)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-mono border cursor-pointer transition-colors ${
                              v.stock <= 0
                                ? 'bg-white/[0.02] border-white/5 text-slate-600 opacity-40 cursor-not-allowed line-through'
                                : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-slate-300 hover:text-white'
                            }`}
                          >
                            {v.color}/{v.size} ({v.stock})
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart summary */}
            <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between font-bold text-white">
                <span>{lang === 'my' ? 'ခြင်းတောင်းထဲရှိ ပစ္စည်းများ' : 'Shopping Cart'} ({cart.length})</span>
                <span className="font-mono text-purple-300 tabular-nums">{totalAmount.toLocaleString()} MMK</span>
              </div>

              {cart.length === 0 ? (
                <p className="text-center text-slate-500 py-3">
                  {lang === 'my' ? 'ခြင်းတောင်းထဲတွင် ပစ္စည်းမရှိသေးပါ' : 'Your cart is empty. Add a product above.'}
                </p>
              ) : (
                <div className="space-y-1.5 divide-y divide-white/10">
                  {cart.map((item, idx) => (
                    <div key={idx} className="pt-2 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-white">{item.name}</span>{' '}
                        <span className="text-slate-400">({item.variant}) x{item.qty}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-purple-300 tabular-nums">{(item.price * item.qty).toLocaleString()} MMK</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(idx)}
                          className="text-slate-400 hover:text-rose-400 cursor-pointer p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
              </button>
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setCheckoutStep('checkout')}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/30 active:scale-95 transition-all"
              >
                <span>{lang === 'my' ? 'အော်ဒါတင်မည်' : 'Proceed to Checkout'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {checkoutStep === 'checkout' && (
          <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
            {orderError && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {orderError}
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                {lang === 'my' ? 'ဖောက်သည် အမည်' : 'Customer Name'} *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Daw Mya"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                {lang === 'my' ? 'ဖုန်းနံပါတ်' : 'Phone Number'} *
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="09123456789"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                {lang === 'my' ? 'ပို့ဆောင်ရမည့် လိပ်စာ' : 'Delivery Address'} *
              </label>
              <textarea
                rows={2}
                required
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Township, City"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="bg-white/[0.03] p-3.5 rounded-2xl border border-white/10 flex items-center justify-between font-bold">
              <span className="text-slate-300">{lang === 'my' ? 'ပေးချေရမည့် စုစုပေါင်း' : 'Total Payment'}:</span>
              <span className="font-mono text-purple-300 text-sm tabular-nums">{totalAmount.toLocaleString()} MMK</span>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setCheckoutStep('cart')}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 font-semibold rounded-xl cursor-pointer transition-colors"
              >
                {lang === 'my' ? 'နောက်သို့' : 'Back to Cart'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer shadow-lg shadow-purple-600/30 active:scale-95 transition-all"
              >
                {submitting ? (lang === 'my' ? 'စစ်ဆေးတင်သွင်းနေသည်...' : 'Placing Order...') : (lang === 'my' ? 'အော်ဒါ အပြီးသတ်တင်မည်' : 'Place Order')}
              </button>
            </div>
          </form>
        )}

        {checkoutStep === 'success' && (
          <div className="text-center py-6 space-y-3 text-xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h4 className="text-base font-bold text-white">
              {lang === 'my' ? 'အော်ဒါတင်သွင်းမှု အောင်မြင်ပါသည်' : 'Order Placed Successfully!'}
            </h4>
            <p className="text-slate-400">
              Order ID:{' '}
              <span className="font-mono text-purple-300 font-bold">{createdOrder?.id}</span>
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
              {lang === 'my'
                ? 'အော်ဒါသည် Profile > Orders & Payments ထဲသို့ ရောက်ရှိသွားပြီဖြစ်ပြီး တာဝန်ရှိသူမှ ငွေလက်ခံအတည်ပြုပေးရပါမည်။'
                : 'This order is now in Orders & Payments awaiting human payment confirmation.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setCheckoutStep('cart');
                onClose();
              }}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-full cursor-pointer mt-2 shadow-lg shadow-purple-600/30"
            >
              {lang === 'my' ? 'ပိတ်မည်' : 'Done'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
