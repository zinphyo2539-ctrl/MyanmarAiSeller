import React, { useState } from 'react';
import { GuidedWorkflow } from './GuidedWorkflow';
import { X, CheckCircle2, ShoppingCart, ArrowRight, Upload, CreditCard, AlertCircle, Copy, Eye, Clock, RefreshCw } from 'lucide-react';
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

export const CheckoutWorkflowModal: React.FC<CheckoutWorkflowModalProps> = ({ isOpen, onClose, store, products, lang, onOrderCreated, cart, onNavigateToSupport }) => {
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

  if (!isOpen) return null;

  const totalCartAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Persistent Order Summary UI
  const persistentSummary = (
    <div className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
            <h4 className="text-[10px] uppercase font-bold text-[#817D70] tracking-wider">
                {lang === 'my' ? 'အော်ဒါ အနှစ်ချုပ်' : 'Order Summary'}
            </h4>
            <div className="text-xs font-bold text-[#C9A227] font-mono">
                {totalCartAmount.toLocaleString()} MMK
            </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {cart.map((item, idx) => (
                <div key={idx} className="flex-shrink-0 flex items-center gap-2 bg-[#1E1D14] p-1.5 rounded-lg border border-[#393426]">
                    {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded object-cover border border-[#393426]" />
                    )}
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold text-[#F5F2E8] truncate max-w-[80px]">{item.name}</p>
                        <p className="text-[9px] text-[#817D70]">x{item.qty} · {item.variantName}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  // 1. Order Creation Logic (Transition from Step 3)
  const handleCreateOrder = async () => {
    if (createdOrder) return true; // Already created (user went back and next again)

    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim()) {
      throw new Error(lang === 'my' ? 'လိုအပ်သော အချက်အလက်များ အားလုံးဖြည့်စွက်ပေးပါ' : 'Please fill in all required delivery details.');
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
        items: cart.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          name: i.name,
          variant: i.variantName,
          price: i.price,
          qty: i.qty
        }))
      })
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
        throw new Error(lang === 'my' ? 'ငွေလွှဲပြေစာ ပုံ ရွေးချယ်ပေးပါ' : 'Please select a payment slip image.');
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

        const res = await fetch(`/api/public/orders/${encodeURIComponent(createdOrder.id)}/payment-slip`, {
            method: 'POST',
            body: formData
        });

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
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4">
      <div className="bg-[#181810] border border-[#393426] rounded-none sm:rounded-2xl w-full max-w-2xl h-full sm:h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b border-[#393426] flex items-center justify-between bg-[#11110D]">
            <div>
                <h3 className="text-base font-bold text-[#F5F2E8]">{store?.storeName || 'Checkout'}</h3>
                <p className="text-[10px] text-[#817D70] uppercase font-bold tracking-tighter">Secure Checkout</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#252419] rounded-xl text-[#817D70] transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <GuidedWorkflow
          lang={lang}
          onClose={onClose}
          onFinish={onClose}
          persistentContent={persistentSummary}
          steps={[
            {
              title: lang === 'my' ? 'ခြင်းတောင်းစစ်ဆေးရန်' : 'Review Cart',
              instruction: lang === 'my' ? 'ဝယ်ယူမည့် ပစ္စည်းများကို စစ်ဆေးပါ။' : 'Confirm your items and quantities.',
              content: (
                <div className="space-y-4 py-4">
                    <p className="text-xs text-[#B9B5A7]">
                        {lang === 'my' ? 'ခြင်းတောင်းထဲရှိ ပစ္စည်းများနှင့် ကျသင့်ငွေကို အပေါ်တွင် စစ်ဆေးနိုင်ပါသည်။' : 'You can review your items and total amount in the summary above.'}
                    </p>
                    <div className="bg-[#C9A227]/5 border border-[#C9A227]/20 p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-[#C9A227] mb-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">{lang === 'my' ? 'မှာယူမှု အချိန်' : 'Order Timing'}</span>
                        </div>
                        <p className="text-[11px] text-[#B9B5A7] leading-relaxed">
                            {lang === 'my' ? 'ကုန်ပစ္စည်းများကို ချက်ချင်းဖယ်ထားပေးမည် မဟုတ်ပါ။ အော်ဒါတင်ပြီး ငွေလွှဲပြေစာ တင်ပြီးမှသာ ပစ္စည်းသီးသန့်ဖယ်ထားပေးမည် ဖြစ်ပါသည်။' : 'Items are not reserved until you complete the checkout and upload your payment slip.'}
                        </p>
                    </div>
                </div>
              )
            },
            {
              title: lang === 'my' ? 'ပို့ဆောင်မည့် အချက်အလက်' : 'Delivery Details',
              instruction: lang === 'my' ? 'ပို့ဆောင်ရန် လိပ်စာနှင့် ဖုန်းနံပါတ်ကို ဖြည့်ပါ။' : 'Tell us where to send your order.',
              content: (
                <div className="space-y-4">
                    <div>
                        <label className="block text-[#817D70] text-[10px] uppercase font-bold mb-1">Customer Name</label>
                        <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-[#11110D] border border-[#393426] rounded-xl p-3 text-[#F5F2E8] text-sm focus:border-[#C9A227] outline-none" placeholder="Daw Mya" />
                    </div>
                    <div>
                        <label className="block text-[#817D70] text-[10px] uppercase font-bold mb-1">Phone Number</label>
                        <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-[#11110D] border border-[#393426] rounded-xl p-3 text-[#F5F2E8] text-sm font-mono focus:border-[#C9A227] outline-none" placeholder="09xxxxxxxxx" />
                    </div>
                    <div>
                        <label className="block text-[#817D70] text-[10px] uppercase font-bold mb-1">Shipping Address</label>
                        <textarea rows={3} value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} className="w-full bg-[#11110D] border border-[#393426] rounded-xl p-3 text-[#F5F2E8] text-sm focus:border-[#C9A227] outline-none" placeholder="Street, Township, City" />
                    </div>
                </div>
              )
            },
            {
              title: lang === 'my' ? 'ငွေပေးချေရန် လမ်းညွှန်' : 'Payment Instructions',
              instruction: lang === 'my' ? 'ပေးထားသော KPay အကောင့်သို့ ငွေလွှဲပါ။' : 'Please complete the transfer to the account below.',
              onStepNext: handleCreateOrder,
              content: (
                <div className="space-y-4">
                    <div className="p-4 bg-[#1E1D14] border border-[#C9A227]/30 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3 text-[#C9A227]">
                            <CreditCard className="w-5 h-5" />
                            <span className="font-bold text-sm">KBZPay Details</span>
                        </div>
                        
                        <div className="bg-[#11110D] p-4 rounded-xl space-y-3">
                            <div className="flex justify-between border-b border-[#393426] pb-2">
                                <span className="text-[10px] text-[#817D70] uppercase">Account</span>
                                <span className="text-sm font-bold text-[#F5F2E8]">{store?.paymentSettings?.kpayAccountName || 'Merchant'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[10px] text-[#817D70] uppercase">Phone</span>
                                <span className="text-sm font-bold font-mono text-[#C9A227]">{store?.paymentSettings?.kpayPhone || 'N/A'}</span>
                            </div>
                        </div>

                        {store?.paymentSettings?.kpayQrUrl && (
                            <div className="bg-white p-2 rounded-xl w-40 h-40 mx-auto overflow-hidden">
                                <img src={store.paymentSettings.kpayQrUrl} className="w-full h-full object-contain" alt="QR" />
                            </div>
                        )}

                        <div className="text-[11px] text-[#B9B5A7] p-3 bg-[#11110D]/50 rounded-xl leading-relaxed italic">
                            {lang === 'my' ? 'မှတ်ချက် - ငွေလွှဲပြီးပါက နောက်တစ်ဆင့်တွင် ပြေစာ (Slip) တင်ပေးရန် လိုအပ်ပါသည်။' : 'Note: You will need to upload the transfer slip in the next step.'}
                        </div>
                    </div>
                </div>
              )
            },
            {
              title: lang === 'my' ? 'ပြေစာ တင်သွင်းရန်' : 'Upload Payment Slip',
              instruction: lang === 'my' ? 'ငွေလွှဲပြေစာ ပုံကို ရွေးချယ်တင်ပြပါ။' : 'Select and upload your transfer screenshot.',
              onStepNext: handleUploadSlip,
              content: (
                <div className="space-y-6">
                    {createdOrder && (
                        <div className="bg-[#1E1D14] p-3 rounded-xl border border-[#393426] flex justify-between items-center">
                            <span className="text-[10px] text-[#817D70] uppercase font-bold">Order ID</span>
                            <span className="font-mono text-xs font-bold text-[#C9A227]">{createdOrder.id}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <label className={`block py-10 border-2 border-dashed rounded-2xl text-center transition-colors cursor-pointer ${slipFile ? 'border-[#65B985]/50 bg-[#65B985]/5' : 'border-[#393426] hover:border-[#C9A227]/50 bg-[#11110D]'}`}>
                            <input type="file" accept="image/*" onChange={handleSelectFile} className="hidden" />
                            <div className="flex flex-col items-center gap-3">
                                {slipPreviewUrl ? (
                                    <img src={slipPreviewUrl} className="w-24 h-24 object-cover rounded-lg border border-[#393426]" />
                                ) : (
                                    <Upload className="w-8 h-8 text-[#817D70]" />
                                )}
                                <span className="text-xs text-[#B9B5A7]">
                                    {slipFile ? slipFile.name : (lang === 'my' ? 'ပုံရွေးရန် နှိပ်ပါ' : 'Tap to select image')}
                                </span>
                            </div>
                        </label>

                        <div>
                            <label className="block text-[#817D70] text-[10px] uppercase font-bold mb-1">Transaction Ref (Optional)</label>
                            <input type="text" value={transactionRef} onChange={e => setTransactionRef(e.target.value)} className="w-full bg-[#11110D] border border-[#393426] rounded-xl p-3 text-[#F5F2E8] text-sm font-mono focus:border-[#C9A227] outline-none" placeholder="e.g. 02941..." />
                        </div>
                    </div>
                </div>
              )
            },
            {
              title: lang === 'my' ? 'ပြီးမြောက်ခြင်း' : 'Order Confirmed',
              instruction: lang === 'my' ? 'အော်ဒါကို ဆိုင်ရှင်မှ စစ်ဆေးနေပါသည်။' : 'Your order is pending merchant approval.',
              content: (
                <div className="text-center py-6 sm:py-10 space-y-6">
                    <div className="w-20 h-20 bg-[#65B985]/10 border-2 border-[#65B985]/30 rounded-full flex items-center justify-center mx-auto text-[#65B985]">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    
                    <div className="space-y-2 px-4">
                        <h4 className="text-xl font-extrabold text-[#F5F2E8]">Order Received!</h4>
                        <p className="text-sm text-[#817D70]">
                            {lang === 'my' ? 'ဆိုင်ရှင်မှ ငွေဝင်ရောက်မှုကို စစ်ဆေးပြီးပါက အော်ဒါအတည်ပြုပေးပါမည်။' : 'Merchant will confirm your payment shortly.'}
                        </p>
                    </div>

                    <div className="bg-[#11110D] border border-[#393426] rounded-2xl p-5 text-left divide-y divide-[#393426] mx-4">
                        <div className="py-3 flex justify-between items-center">
                            <span className="text-xs text-[#817D70]">Status</span>
                            <span className="text-[10px] font-bold text-[#E0BD55] bg-[#E0BD55]/10 px-2 py-0.5 rounded border border-[#E0BD55]/20">PENDING VERIFICATION</span>
                        </div>
                        <div className="py-3 flex justify-between items-center">
                            <span className="text-xs text-[#817D70]">Order ID</span>
                            <span className="text-xs font-bold font-mono text-[#C9A227]">{createdOrder?.id}</span>
                        </div>
                        {createdOrder?.supportCode && (
                            <div className="py-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-[#817D70]">{lang === 'my' ? 'အော်ဒါ စစ်ဆေးရေး ကုဒ်' : 'Customer Support Code'}</span>
                                    <button 
                                        onClick={() => handleCopyCode(createdOrder.supportCode!)}
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${copiedCode ? 'bg-[#65B985]/20 text-[#65B985]' : 'bg-[#1E1D14] text-[#C9A227] hover:bg-[#252419]'}`}
                                    >
                                        <Copy className="w-3 h-3" />
                                        <span className="text-[10px] font-bold">{copiedCode ? (lang === 'my' ? 'ကူးယူပြီး' : 'Copied') : (lang === 'my' ? 'ကုဒ်ကူးမည်' : 'Copy Code')}</span>
                                    </button>
                                </div>
                                <div className="p-3 bg-[#181810] border border-[#393426] rounded-xl font-mono text-center text-sm font-bold text-[#C9A227] tracking-widest select-all">
                                    {createdOrder.supportCode}
                                </div>
                                <p className="text-[10px] text-[#817D70] leading-relaxed">
                                    {lang === 'my' ? '* ဤကုဒ်ကို သိမ်းဆည်းထားပါ။ အော်ဒါအခြေအနေကို စစ်ဆေးရန်နှင့် အကူအညီတောင်းခံရန် ဤကုဒ်လိုအပ်ပါသည်။' : '* Save this code. You will need it to track your order status and request support.'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="px-4 space-y-3">
                        <div className="p-3 bg-red-950/10 border border-red-900/30 rounded-xl text-left">
                            <div className="flex items-start gap-2 text-red-400">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <p className="text-[10px] leading-relaxed">
                                    {lang === 'my' ? 'သတိပေးချက် - ငွေလွှဲပြေစာ တင်ပြထားခြင်းသည် ငွေလက်ခံအတည်ပြုပြီးကြောင်း မဆိုလိုပါ။ ဆိုင်ရှင်မှ ငွေဝင်ရောက်မှုကို စစ်ဆေးအတည်ပြုပြီးမှသာ အော်ဒါသည် အောင်မြင်မည်ဖြစ်ပါသည်။' : 'Warning: Uploading a payment slip does not mean the merchant has approved payment. The order will be confirmed only after manual verification.'}
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={onNavigateToSupport}
                            className="w-full py-4 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] rounded-2xl text-[#C9A227] font-bold text-sm transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>{lang === 'my' ? 'အော်ဒါ အခြေအနေ စစ်ဆေးမည်' : 'Track Order Status'}</span>
                        </button>
                    </div>
                </div>
              )
            }
          ]}
        />
      </div>
    </div>
  );
};
