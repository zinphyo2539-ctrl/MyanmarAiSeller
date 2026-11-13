import React, { useState } from 'react';
import { GuidedWorkflow } from './GuidedWorkflow';
import { X, CheckCircle2, ShoppingCart, ArrowRight, Upload, CreditCard, AlertCircle, Copy, Clock, RefreshCw } from 'lucide-react';
import { StoreSettings, Product, Order } from '../types';

interface CheckoutWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreSettings | null;
  products: Product[];
  lang: 'my' | 'en';
  onOrderCreated: (order: Order) => void;
  cart: any[];
  onNavigateToSupport: () => void;
}

export const CheckoutWorkflowModal: React.FC<CheckoutWorkflowModalProps> = ({
  isOpen,
  onClose,
  store,
  products,
  lang,
  onOrderCreated,
  cart,
  onNavigateToSupport,
}) => {
  // State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [slipSuccess, setSlipSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copyError, setCopyError] = useState(false);

  if (!isOpen) return null;

  const totalCartAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
        setCopiedCode(true);
        setCopyError(false);
        setTimeout(() => setCopiedCode(false), 3000);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 5000);
    }
  };

  // Persistent Order Summary UI
  const persistentSummary = (
    <div className="p-3.5 sm:p-4 space-y-2.5 bg-white/[0.02] border-b border-white/10">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
          {lang === 'my' ? 'အော်ဒါ အနှစ်ချုပ်' : 'Order Summary'}
        </h4>
        <div className="text-xs font-bold text-[var(--brand-primary)] font-mono">
          {totalCartAmount.toLocaleString()} MMK
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {cart.map((item, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 flex items-center gap-2 bg-white/[0.04] p-2 rounded-xl border border-white/10 shadow-xs"
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-8 h-8 rounded-lg object-cover border border-white/10"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate max-w-[100px]">{item.name}</p>
              <p className="text-[10px] text-slate-400">
                x{item.qty} {item.variantName ? `· ${item.variantName}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 1. Order Creation Logic (Transition from Step 3)
  const handleCreateOrder = async () => {
    if (createdOrder) return true;

    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim()) {
      throw new Error(
        lang === 'my'
          ? 'လိုအပ်သော အချက်အလက်များ အားလုံးဖြည့်စွက်ပေးပါ'
          : 'Please fill in all required delivery details.'
      );
    }

    const slug = store?.slug || 'yangon-style';
    const res = await fetch(`/api/public/store/${slug}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        paymentMethod: 'KBZPay',
        items: cart.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          name: i.name,
          variant: i.variantName,
          price: i.price,
          qty: i.qty,
        })),
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout failed');

    setCreatedOrder(data.order);
    onOrderCreated(data.order);
    return true;
  };

  // 2. Slip Upload Logic (Transition from Step 4)
  const handleUploadSlip = async () => {
    if (slipSuccess) return true;
    if (!createdOrder || !slipFile) {
      throw new Error(
        lang === 'my' ? 'ငွေလွှဲပြေစာ ပုံ ရွေးချယ်ပေးပါ' : 'Please select a payment slip image.'
      );
    }

    setUploadingSlip(true);
    try {
      const formData = new FormData();
      formData.append('slipImage', slipFile);
      if (createdOrder.supportCode) {
        formData.append('supportCode', createdOrder.supportCode);
      }
      if (transactionRef.trim()) {
        formData.append('transactionRef', transactionRef.trim());
      }

      const res = await fetch(
        `/api/public/orders/${encodeURIComponent(createdOrder.id)}/payment-slip`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Slip upload failed');

      setSlipSuccess(true);
      if (data.order) setCreatedOrder(data.order);
      return true;
    } finally {
      setUploadingSlip(false);
    }
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
    setSlipPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-4 overflow-y-auto transition-all duration-300">
      <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-none sm:rounded-3xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.8)] my-auto text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {store?.storeName || 'Checkout'}
            </h3>
            <p className="text-[10px] text-[var(--brand-primary)] uppercase font-bold tracking-wider font-mono">
              Secure Checkout
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <GuidedWorkflow
          lang={lang}
          onClose={onClose}
          onFinish={onClose}
          persistentContent={persistentSummary}
          steps={[
            {
              title: lang === 'my' ? 'ခြင်းတောင်းစစ်ဆေးရန်' : 'Review Cart',
              instruction:
                lang === 'my'
                  ? 'ဝယ်ယူမည့် ပစ္စည်းများကို စစ်ဆေးပါ။'
                  : 'Confirm your items and quantities.',
              content: (
                <div className="space-y-4 py-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lang === 'my'
                      ? 'ခြင်းတောင်းထဲရှိ ပစ္စည်းများနှင့် ကျသင့်ငွေကို အပေါ်တွင် စစ်ဆေးနိုင်ပါသည်။'
                      : 'You can review your items and total amount in the summary above.'}
                  </p>
                  <div className="bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 p-4 rounded-2xl backdrop-blur-md">
                    <div className="flex items-center gap-2 text-[var(--brand-primary)] mb-1.5">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {lang === 'my' ? 'မှာယူမှု အချိန်' : 'Order Timing'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {lang === 'my'
                        ? 'ကုန်ပစ္စည်းများကို ချက်ချင်းဖယ်ထားပေးမည် မဟုတ်ပါ။ အော်ဒါတင်ပြီး ငွေလွှဲပြေစာ တင်ပြီးမှသာ ပစ္စည်းသီးသန့်ဖယ်ထားပေးမည် ဖြစ်ပါသည်။'
                        : 'Items are not reserved until you complete the checkout and upload your payment slip.'}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              title: lang === 'my' ? 'ပို့ဆောင်မည့် အချက်အလက်' : 'Delivery Details',
              instruction:
                lang === 'my'
                  ? 'ပို့ဆောင်ရန် လိပ်စာနှင့် ဖုန်းနံပါတ်ကို ဖြည့်ပါ။'
                  : 'Tell us where to send your order.',
              content: (
                <div className="space-y-3.5 py-1">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                      {lang === 'my' ? 'ဝယ်ယူသူ အမည်' : 'Customer Name'} *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-[var(--brand-primary)] focus:bg-white/[0.08] focus:ring-4 focus:ring-[var(--brand-primary)]/15 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none"
                      placeholder="Daw Mya"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                      {lang === 'my' ? 'ဖုန်းနံပါတ်' : 'Phone Number'} *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-[var(--brand-primary)] focus:bg-white/[0.08] focus:ring-4 focus:ring-[var(--brand-primary)]/15 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-500 transition-all outline-none"
                      placeholder="09xxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                      {lang === 'my' ? 'ပို့ဆောင်ရမည့် လိပ်စာ' : 'Shipping Address'} *
                    </label>
                    <textarea
                      rows={3}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-[var(--brand-primary)] focus:bg-white/[0.08] focus:ring-4 focus:ring-[var(--brand-primary)]/15 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 transition-all outline-none resize-none"
                      placeholder="Street, Township, City"
                    />
                  </div>
                </div>
              ),
            },
            {
              title: lang === 'my' ? 'ငွေပေးချေရန် လမ်းညွှန်' : 'Payment Instructions',
              instruction:
                lang === 'my'
                  ? 'ပေးထားသော KPay အကောင့်သို့ ငွေလွှဲပါ။'
                  : 'Please complete the transfer to the account below.',
              onStepNext: handleCreateOrder,
              content: (
                <div className="space-y-4 py-1">
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/20 rounded-2xl space-y-4 shadow-xl">
                    <div className="flex items-center gap-2.5 text-[var(--brand-primary)] font-bold text-sm">
                      <CreditCard className="w-5 h-5 text-[var(--brand-primary)]/80" />
                      <span>KBZPay Details</span>
                    </div>

                    <div className="bg-white/[0.04] p-4 rounded-xl border border-white/10 space-y-2.5">
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <span className="text-xs text-slate-400 font-medium">Account Name</span>
                        <span className="text-sm font-bold text-white">
                          {store?.paymentSettings?.kpayAccountName || 'Merchant'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-medium">Phone Number</span>
                        <span className="text-sm font-bold font-mono text-[var(--brand-primary)]">
                          {store?.paymentSettings?.kpayPhone || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {store?.paymentSettings?.kpayQrUrl && (
                      <div className="bg-white p-3 rounded-2xl border border-white/20 w-44 h-44 mx-auto overflow-hidden shadow-lg flex items-center justify-center">
                        <img
                          src={store.paymentSettings.kpayQrUrl}
                          className="w-full h-full object-contain"
                          alt="KBZPay QR Code"
                        />
                      </div>
                    )}

                    <div className="text-xs text-amber-300 p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl leading-relaxed">
                      {lang === 'my'
                        ? 'မှတ်ချက် - ငွေလွှဲပြီးပါက နောက်တစ်ဆင့်တွင် ပြေစာ (Slip) တင်ပေးရန် လိုအပ်ပါသည်။'
                        : 'Note: You will need to upload the transfer slip in the next step.'}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: lang === 'my' ? 'ပြေစာ တင်သွင်းရန်' : 'Upload Payment Slip',
              instruction:
                lang === 'my'
                  ? 'ငွေလွှဲပြေစာ ပုံကို ရွေးချယ်တင်ပြပါ။'
                  : 'Select and upload your transfer screenshot.',
              onStepNext: handleUploadSlip,
              content: (
                <div className="space-y-4 py-1">
                  {createdOrder && (
                    <div className="bg-purple-950/30 p-3 rounded-xl border border-purple-500/30 flex justify-between items-center">
                      <span className="text-xs text-purple-200 font-semibold">
                        {lang === 'my' ? 'အော်ဒါ အမှတ်' : 'Order ID'}
                      </span>
                      <span className="font-mono text-xs font-bold text-[var(--brand-primary)]">
                        {createdOrder.id}
                      </span>
                    </div>
                  )}

                  <div className="space-y-3.5">
                    <label
                      className={`block py-8 px-4 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
                        slipFile
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-[var(--brand-primary)]/30 hover:border-[var(--brand-primary)]/60 bg-[var(--brand-primary)]/[0.04] hover:bg-[var(--brand-primary)]/[0.08]'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSelectFile}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-2.5">
                        {slipPreviewUrl ? (
                          <img
                            src={slipPreviewUrl}
                            className="w-28 h-28 object-cover rounded-xl border border-white/20 shadow-md"
                            alt="Slip preview"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/30 flex items-center justify-center text-[var(--brand-primary)]">
                            <Upload className="w-6 h-6" />
                          </div>
                        )}
                        <span className="text-xs font-semibold text-slate-200">
                          {slipFile
                            ? slipFile.name
                            : lang === 'my'
                            ? 'ငွေလွှဲပြေစာ ဓာတ်ပုံ ရွေးချယ်ရန် နှိပ်ပါ'
                            : 'Tap to select payment slip screenshot'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">JPG, PNG up to 10MB</span>
                      </div>
                    </label>

                    <div>
                      <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                        {lang === 'my'
                          ? 'ငွေလွှဲ အမှတ် / နောက်ဆုံးဂဏန်း (ရှိပါက)'
                          : 'Transaction Ref (Optional)'}
                      </label>
                      <input
                        type="text"
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-[var(--brand-primary)] focus:bg-white/[0.08] focus:ring-4 focus:ring-[var(--brand-primary)]/15 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-500 transition-all outline-none"
                        placeholder="e.g. 02941..."
                      />
                    </div>
                  </div>
                </div>
              ),
            },
            {
              title: lang === 'my' ? 'ပြီးမြောက်ခြင်း' : 'Order Confirmed',
              instruction:
                lang === 'my'
                  ? 'အော်ဒါကို ဆိုင်ရှင်မှ စစ်ဆေးနေပါသည်။'
                  : 'Your order is pending merchant approval.',
              content: (
                <div className="text-center py-4 sm:py-6 space-y-5">
                  <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-1 px-4">
                    <h4 className="text-lg font-bold text-white">
                      {lang === 'my' ? 'အော်ဒါ လက်ခံရရှိပါသည်' : 'Order Received!'}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                      {lang === 'my'
                        ? 'ဆိုင်ရှင်မှ ငွေဝင်ရောက်မှုကို စစ်ဆေးပြီးပါက အော်ဒါအတည်ပြုပေးပါမည်။'
                        : 'Merchant will confirm your payment shortly.'}
                    </p>
                  </div>

                  {/* Customer Code Section */}
                  <div className="mx-2 sm:mx-4 space-y-3.5">
                    <div className="bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-3.5 relative overflow-hidden text-left">
                      <div className="space-y-1 text-center">
                        <h5 className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider font-mono">
                          {lang === 'my' ? 'သင့် Customer Code' : 'Your Customer Code'}
                        </h5>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
                          {lang === 'my'
                            ? 'ဤကုဒ်ကို သိမ်းဆည်းထားပါ။ အော်ဒါအခြေအနေကို စစ်ဆေးရန်နှင့် Customer Service ထံ ဆက်သွယ်အကူအညီတောင်းခံရန် လိုအပ်ပါမည်။'
                            : 'Save this code securely. You will need it to track your order status and contact Customer Service.'}
                        </p>
                      </div>

                      <div className="bg-white/[0.04] border-2 border-[var(--brand-primary)]/40 rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg">
                        <div className="font-mono text-xl sm:text-2xl font-black text-[var(--brand-primary)] tracking-[0.25em] select-all">
                          {createdOrder?.supportCode || '------'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCopyCode(createdOrder?.supportCode || '')}
                        className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                          copiedCode
                            ? 'bg-emerald-600 text-white'
                            : copyError
                            ? 'bg-rose-600 text-white'
                            : 'bg-[var(--brand-primary)] hover:brightness-110 text-[var(--brand-on-primary)] shadow-[var(--brand-primary)]/30 hover:shadow-[var(--brand-primary)]/50'
                        }`}
                      >
                        {copiedCode ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{lang === 'my' ? 'ကုဒ်ကူးယူပြီးပါပြီ' : 'Code Copied!'}</span>
                          </>
                        ) : copyError ? (
                          <>
                            <AlertCircle className="w-4 h-4" />
                            <span>
                              {lang === 'my'
                                ? 'ကုဒ်ကူးယူ၍ မရပါ။ ကိုယ်တိုင်ကူးယူပါ။'
                                : 'Copy failed. Please copy manually.'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>{lang === 'my' ? 'ကုဒ်ကူးယူရန်' : 'Copy Customer Code'}</span>
                          </>
                        )}
                      </button>

                      <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                        {lang === 'my'
                          ? 'နောင်တွင် အော်ဒါနှင့်ပတ်သက်၍ စုံစမ်းမေးမြန်းသည့်အခါ ဤကုဒ်ကို အသုံးပြုနိုင်ပါသည်။'
                          : 'Use this code for future order inquiries.'}
                      </p>
                    </div>

                    <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-left">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">
                          {lang === 'my'
                            ? 'ဤကုဒ်သည် ငွေပေးချေမှုအတည်ပြုချက် မဟုတ်ပါ။ ငွေပေးချေမှုကို ဆိုင်ဘက်မှ စစ်ဆေးအတည်ပြုပြီးမှသာ အော်ဒါအခြေအနေ ပြောင်းလဲပါမည်။'
                            : 'This code is NOT a payment confirmation. Order status will update only after manual verification by the merchant.'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={onNavigateToSupport}
                      className="w-full py-3 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl text-[var(--brand-primary)] hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>{lang === 'my' ? 'အော်ဒါအခြေအနေ စစ်ဆေးရန်' : 'Track Order Status'}</span>
                    </button>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};
