import React, { useState } from 'react';
import { X, ShoppingCart, CheckCircle2, AlertCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { StoreSettings, Product } from '../types';

interface PublicStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreSettings | null;
  products: Product[];
  lang: 'my' | 'en';
  onOrderCreated: () => void;
}

export const PublicStoreModal: React.FC<PublicStoreModalProps> = ({
  isOpen,
  onClose,
  store,
  products,
  lang,
  onOrderCreated
}) => {
  const [cart, setCart] = useState<Array<{
    productId: string;
    variantId: string;
    name: string;
    variant: string;
    price: number;
    qty: number;
    maxStock: number;
  }>>([]);

  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  if (!isOpen) return null;

  const activeProducts = products.filter(p => p.status === 'active');
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleAddToCart = (product: Product, variant: any) => {
    if (variant.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id && i.variantId === variant.id);
      if (existing) {
        if (existing.qty >= variant.stock) return prev;
        return prev.map(i => i === existing ? { ...i, qty: i.qty + 1 } : i);
      }
      return [
        ...prev,
        {
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          variant: `${variant.color} / ${variant.size}`,
          price: product.price,
          qty: 1,
          maxStock: variant.stock
        }
      ];
    });
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim() || cart.length === 0 || submitting) return;
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
          items: cart.map(i => ({
            productId: i.productId,
            name: i.name,
            variant: i.variant,
            price: i.price,
            qty: i.qty
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      setCreatedOrder(data.order);
      setCheckoutStep('success');
      setCart([]);
      onOrderCreated();
    } catch (err: any) {
      setOrderError(err.message || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#181810] border border-[#393426] rounded-2xl w-full max-w-2xl p-5 space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-[#393426] pb-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#C9A227]">
              {lang === 'my' ? 'Public စတိုး စမ်းသပ်ခန်း' : 'Public Storefront Simulation'}
            </span>
            <h3 className="text-base font-bold text-[#F5F2E8]">
              {store?.storeName || 'Yangon Style Store'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[#252419] rounded-lg text-[#817D70] hover:text-[#F5F2E8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {checkoutStep === 'cart' && (
          <div className="space-y-4 text-xs">
            {/* Products grid */}
            <div className="space-y-2">
              <span className="text-[#817D70] font-semibold uppercase text-[10px] block">
                {lang === 'my' ? 'ရောင်းချနေသော ကုန်ပစ္စည်းများ' : 'Available Products in Catalog'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                {activeProducts.map((prod) => (
                  <div key={prod.id} className="bg-[#11110D] border border-[#393426] p-3 rounded-xl flex flex-col justify-between space-y-2">
                    <div>
                      <h4 className="font-bold text-[#F5F2E8]">{prod.name}</h4>
                      <p className="font-mono text-[#C9A227] font-bold mt-0.5">
                        {prod.price.toLocaleString()} MMK
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-[#817D70]">Variants:</span>
                      <div className="flex flex-wrap gap-1">
                        {(prod.variants || []).map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            disabled={v.stock <= 0}
                            onClick={() => handleAddToCart(prod, v)}
                            className={`px-2 py-1 rounded text-[11px] font-mono border cursor-pointer transition-colors ${
                              v.stock <= 0
                                ? 'bg-[#181810] border-[#393426] text-[#817D70] opacity-40 cursor-not-allowed'
                                : 'bg-[#1E1D14] hover:bg-[#252419] border-[#393426] text-[#F5F2E8]'
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
            <div className="bg-[#11110D] p-3.5 rounded-xl border border-[#393426] space-y-2">
              <div className="flex items-center justify-between font-bold text-[#F5F2E8]">
                <span>{lang === 'my' ? 'ခြင်းတောင်းထဲရှိ ပစ္စည်းများ' : 'Shopping Cart'} ({cart.length})</span>
                <span className="font-mono text-[#C9A227]">{totalAmount.toLocaleString()} MMK</span>
              </div>

              {cart.length === 0 ? (
                <p className="text-center text-[#817D70] py-3">
                  {lang === 'my' ? 'ခြင်းတောင်းထဲတွင် ပစ္စည်းမရှိသေးပါ' : 'Your cart is empty. Add a product above.'}
                </p>
              ) : (
                <div className="space-y-1.5 divide-y divide-[#393426]">
                  {cart.map((item, idx) => (
                    <div key={idx} className="pt-1.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-[#F5F2E8]">{item.name}</span>{' '}
                        <span className="text-[#817D70]">({item.variant}) x{item.qty}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#F5F2E8]">{(item.price * item.qty).toLocaleString()} MMK</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(idx)}
                          className="text-[#817D70] hover:text-[#E06B61]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#393426]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#B9B5A7] font-semibold rounded-xl"
              >
                {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
              </button>
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setCheckoutStep('checkout')}
                className="px-5 py-2 bg-[#C9A227] hover:bg-[#A88419] disabled:opacity-40 text-[#0B0B09] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
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
              <div className="p-3 bg-[#E06B61]/10 border border-[#E06B61]/40 rounded-xl text-xs text-[#E06B61]">
                {orderError}
              </div>
            )}

            <div>
              <label className="block text-[#B9B5A7] font-semibold mb-1">
                {lang === 'my' ? 'ဖောက်သည် အမည်' : 'Customer Name'} *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Daw Mya"
                className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#B9B5A7] font-semibold mb-1">
                {lang === 'my' ? 'ဖုန်းနံပါတ်' : 'Phone Number'} *
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="09123456789"
                className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] font-mono focus:border-[#C9A227] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#B9B5A7] font-semibold mb-1">
                {lang === 'my' ? 'ပို့ဆောင်ရမည့် လိပ်စာ' : 'Delivery Address'} *
              </label>
              <textarea
                rows={2}
                required
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Township, City"
                className="w-full bg-[#11110D] border border-[#393426] rounded-xl p-3 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
              />
            </div>

            <div className="bg-[#11110D] p-3 rounded-xl border border-[#393426] flex items-center justify-between font-bold">
              <span className="text-[#B9B5A7]">{lang === 'my' ? 'ပေးချေရမည့် စုစုပေါင်း' : 'Total Payment'}:</span>
              <span className="font-mono text-[#C9A227] text-sm">{totalAmount.toLocaleString()} MMK</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#393426]">
              <button
                type="button"
                onClick={() => setCheckoutStep('cart')}
                className="px-4 py-2 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#B9B5A7] font-semibold rounded-xl"
              >
                {lang === 'my' ? 'နောက်သို့' : 'Back to Cart'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-[#C9A227] hover:bg-[#A88419] disabled:opacity-50 text-[#0B0B09] font-bold rounded-xl cursor-pointer"
              >
                {submitting ? (lang === 'my' ? 'စစ်ဆေးတင်သွင်းနေသည်...' : 'Placing Order...') : (lang === 'my' ? 'အော်ဒါ အပြီးသတ်တင်မည်' : 'Place Order')}
              </button>
            </div>
          </form>
        )}

        {checkoutStep === 'success' && (
          <div className="text-center py-6 space-y-3 text-xs">
            <CheckCircle2 className="w-12 h-12 text-[#65B985] mx-auto" />
            <h4 className="text-base font-bold text-[#F5F2E8]">
              {lang === 'my' ? 'အော်ဒါတင်သွင်းမှု အောင်မြင်ပါသည်' : 'Order Placed Successfully!'}
            </h4>
            <p className="text-[#B9B5A7]">
              Order ID:{' '}
              <span className="font-mono text-[#C9A227] font-bold">{createdOrder?.id}</span>
            </p>
            <p className="text-[11px] text-[#817D70] max-w-sm mx-auto">
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
              className="px-5 py-2 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-bold rounded-xl cursor-pointer mt-2"
            >
              {lang === 'my' ? 'ပိတ်မည်' : 'Done'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
