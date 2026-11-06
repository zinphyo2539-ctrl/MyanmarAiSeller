import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  FileText,
  History,
  Check,
  Copy,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Download,
  Trash2,
  ArrowRight,
  ExternalLink,
  Sliders,
  Layers,
  Wand2,
  Camera,
  Share2,
  ShoppingBag
} from 'lucide-react';
import { Product, AiStudioImageMode, AiStudioCopyType, AiStudioGeneration } from '../types';

interface AiStudioViewProps {
  products: Product[];
  lang: 'my' | 'en';
  getHeaders: () => Record<string, string>;
  onProductUpdated?: (updatedProduct: Product) => void;
  onNavigateToInventory?: () => void;
}

export const AiStudioView: React.FC<AiStudioViewProps> = ({
  products,
  lang,
  getHeaders,
  onProductUpdated,
  onNavigateToInventory
}) => {
  // Navigation tabs within AI Studio
  const [activeTab, setActiveTab] = useState<'image_studio' | 'copy_studio' | 'history'>('image_studio');

  // Shared Product Selector
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');

  // ==========================================
  // Image Studio State
  // ==========================================
  const [imageMode, setImageMode] = useState<AiStudioImageMode>('clean_background');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '16:9'>('1:1');
  const [customImagePrompt, setCustomImagePrompt] = useState<string>('');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);

  const [generatingImage, setGeneratingImage] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [applyingImage, setApplyingImage] = useState<boolean>(false);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  // ==========================================
  // Copy Studio State
  // ==========================================
  const [copyType, setCopyType] = useState<AiStudioCopyType>('description_my');
  const [customCopyPrompt, setCustomCopyPrompt] = useState<string>('');
  const [generatingCopy, setGeneratingCopy] = useState<boolean>(false);
  const [generatedText, setGeneratedText] = useState<string>('');
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // ==========================================
  // History State
  // ==========================================
  const [history, setHistory] = useState<AiStudioGeneration[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Active product object
  const activeProduct = products.find(p => p.id === selectedProductId) || products[0];

  // Fetch generation history
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/ai-studio/history', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
      }
    } catch (err) {
      console.error('Failed to load studio history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  // Handle file select for optional reference
  const handleReferenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(lang === 'my' ? 'ဖိုင်အရွယ်အစားသည် 5MB ထက် မကျော်ရပါ' : 'File size must not exceed 5MB');
        return;
      }
      setReferenceFile(file);
      setReferencePreview(URL.createObjectURL(file));
    }
  };

  // Generate Image Handler
  const handleGenerateImage = async () => {
    setGeneratingImage(true);
    setImageError(null);
    setGeneratedImageUrl(null);
    setAppliedSuccess(false);

    try {
      const formData = new FormData();
      if (activeProduct) {
        formData.append('productId', activeProduct.id);
        formData.append('productName', activeProduct.name);
      }
      formData.append('mode', imageMode);
      formData.append('aspectRatio', aspectRatio);
      if (customImagePrompt.trim()) {
        formData.append('customInstructions', customImagePrompt.trim());
      }
      if (referenceFile) {
        formData.append('referenceImage', referenceFile);
      }

      const headers = getHeaders();
      // Remove Content-Type so browser sets boundary for multipart/form-data
      delete headers['Content-Type'];

      const res = await fetch('/api/ai-studio/generate-image', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to generate product image');
      }

      const data = await res.json();
      setGeneratedImageUrl(data.imageUrl);
      setGeneratedId(data.generationId);
    } catch (err: any) {
      setImageError(err.message || 'Image generation failed');
    } finally {
      setGeneratingImage(false);
    }
  };

  // Apply to Inventory Handler
  const handleApplyToInventory = async () => {
    if (!activeProduct || !generatedImageUrl) return;

    setApplyingImage(true);
    try {
      const res = await fetch('/api/ai-studio/apply-image', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          productId: activeProduct.id,
          imageUrl: generatedImageUrl,
          generationId: generatedId
        })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update product image');
      }

      const data = await res.json();
      setAppliedSuccess(true);
      if (onProductUpdated && data.product) {
        onProductUpdated(data.product);
      }
      setTimeout(() => setAppliedSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to apply image');
    } finally {
      setApplyingImage(false);
    }
  };

  // Discard generated image
  const handleDiscardImage = () => {
    setGeneratedImageUrl(null);
    setGeneratedId(null);
    setAppliedSuccess(false);
  };

  // Generate Copy Handler
  const handleGenerateCopy = async () => {
    if (!activeProduct) return;

    setGeneratingCopy(true);
    setCopyError(null);

    try {
      const res = await fetch('/api/ai-studio/generate-copy', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          productId: activeProduct.id,
          copyType,
          customInstructions: customCopyPrompt.trim()
        })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to generate copy');
      }

      const data = await res.json();
      setGeneratedText(data.generatedText || '');
    } catch (err: any) {
      setCopyError(err.message || 'Copy generation failed');
    } finally {
      setGeneratingCopy(false);
    }
  };

  // 1-Click Copy
  const handleCopyText = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Luxury Studio Header Card */}
      <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 rounded-2xl p-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-relaxed">
              AI Studio (ဆိုင်စုံ စတူဒီယို)
            </h1>
            <p className="text-xs text-purple-200/80 leading-relaxed">
              {lang === 'my'
                ? 'စတော့ကုန်ပစ္စည်းများအတွက် AI ဓာတ်ပုံဖန်တီးမှုနှင့် ဆိုရှယ်မီဒီယာ အရောင်းကြော်ငြာစာသားများ'
                : 'AI-powered studio product photography, descriptions & high-converting marketing copy'}
            </p>
          </div>
        </div>

        {/* Studio Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('image_studio')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'image_studio'
                ? 'bg-white text-indigo-950 shadow-sm font-bold'
                : 'text-purple-200 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{lang === 'my' ? 'ဓာတ်ပုံ စတူဒီယို' : 'Product Photo Studio'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('copy_studio')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'copy_studio'
                ? 'bg-white text-indigo-950 shadow-sm font-bold'
                : 'text-purple-200 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{lang === 'my' ? 'ကြော်ငြာစာသား' : 'Marketing Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-indigo-950 shadow-sm font-bold'
                : 'text-purple-200 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{lang === 'my' ? 'မှတ်တမ်း' : 'History'}</span>
          </button>
        </div>
      </div>

      {/* Product Selector Bar (Unified across AI Studio) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
            {lang === 'my' ? 'ပစ္စည်းရွေးချယ်ပါ:' : 'Target Product:'}
          </span>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full sm:w-80 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-600"
          >
            {products.length === 0 ? (
              <option value="">{lang === 'my' ? 'စတော့တွင် ပစ္စည်းမရှိသေးပါ' : 'No products in inventory'}</option>
            ) : (
              products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({Number(p.price).toLocaleString()} MMK)
                </option>
              ))
            )}
          </select>
        </div>

        {activeProduct && (
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-mono">SKU: {activeProduct.sku}</span>
            <span>·</span>
            <span className="font-mono font-semibold text-slate-800">
              {Number(activeProduct.price).toLocaleString()} MMK
            </span>
            {activeProduct.imageUrl && (
              <div className="w-8 h-8 rounded-lg border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                <img
                  src={activeProduct.imageUrl}
                  alt={activeProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 1: PRODUCT IMAGE STUDIO */}
      {activeTab === 'image_studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column (Left) */}
          <div className="lg:col-span-5 space-y-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>{lang === 'my' ? 'ဓာတ်ပုံ ဖန်တီးမှု ရွေးချယ်စရာများ' : 'Studio Generation Settings'}</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === 'my'
                  ? 'အဆင့်မြင့် အလင်းအမှောင်နှင့် စတူဒီယိုနောက်ခံ စတိုင်ကို ရွေးချယ်ပါ'
                  : 'Select professional background, lighting, and visual environment'}
              </p>
            </div>

            {/* Generation Modes with colorful 40x40px gradient icon boxes and check icon */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-700">
                {lang === 'my' ? 'စတူဒီယို စတိုင် (Generation Mode)' : 'Generation Mode'}
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    id: 'clean_background',
                    title: lang === 'my' ? 'Clean Background (နောက်ခံသန့်စင်ဖြူစင်)' : 'Clean White Studio',
                    desc: lang === 'my' ? 'အဖြူရောင်စတူဒီယိုနောက်ခံ၊ အရိပ်အစွန်းနူးညံ့' : 'Isolated product, soft natural studio drop shadow',
                    icon: Sparkles,
                    color: 'from-sky-500 to-blue-600'
                  },
                  {
                    id: 'premium_photo',
                    title: lang === 'my' ? 'Premium Photography (ဇိမ်ခံ စတူဒီယို)' : 'Premium Luxury Studio',
                    desc: lang === 'my' ? 'အမှောင်ရောင်နောက်ခံ၊ စတူဒီယိုမီးရောင်' : 'Dramatic rim lighting, dark slate surface',
                    icon: Camera,
                    color: 'from-amber-500 to-orange-600'
                  },
                  {
                    id: 'social_ad',
                    title: lang === 'my' ? 'Social Media Ad (ဆိုရှယ်မီဒီယာ ကြော်ငြာ)' : 'Social Media Commercial',
                    desc: lang === 'my' ? 'အရောင်အသွေးစုံလင်၊ လူကြိုက်များသောကြော်ငြာစတိုင်' : 'Vibrant colors, high conversion commercial style',
                    icon: Wand2,
                    color: 'from-fuchsia-500 to-pink-600'
                  },
                  {
                    id: 'lifestyle',
                    title: lang === 'my' ? 'Lifestyle Showcase (လူနေမှုစတိုင် နောက်ခံ)' : 'Lifestyle Showcase',
                    desc: lang === 'my' ? 'ခေတ်မီအိမ်တွင်းအလှဆင်၊ သဘာဝအလင်းရောင်' : 'Warm natural morning daylight, authentic setting',
                    icon: Layers,
                    color: 'from-emerald-500 to-teal-600'
                  },
                  {
                    id: 'catalog',
                    title: lang === 'my' ? 'Product Catalog (ကတ်တလောက် ပြကွက်)' : 'Catalog Pedestal',
                    desc: lang === 'my' ? 'အရောင်းပြခန်း စင်တင်ပြသမှု' : 'Minimalist retail pedestal, clean balanced framing',
                    icon: ShoppingBag,
                    color: 'from-indigo-500 to-violet-600'
                  }
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = imageMode === mode.id;

                  return (
                    <div
                      key={mode.id}
                      onClick={() => setImageMode(mode.id as AiStudioImageMode)}
                      className={`cursor-pointer rounded-xl p-3 border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-purple-600 ring-2 ring-purple-600/20 bg-purple-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mode.color} text-white flex items-center justify-center shadow-xs shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 leading-snug truncate">
                            {mode.title}
                          </div>
                          <div className="text-[11px] text-slate-500 leading-snug truncate mt-0.5">
                            {mode.desc}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {lang === 'my' ? 'ပုံချိုး အချိုးအစား (Aspect Ratio)' : 'Aspect Ratio'}
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl">
                {(['1:1', '4:5', '16:9'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      aspectRatio === ratio
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ratio} {ratio === '1:1' ? '(Square)' : ratio === '4:5' ? '(Portrait)' : '(Landscape)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Reference Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {lang === 'my' ? 'နမူနာဓာတ်ပုံ ထည့်သွင်းရန် (Optional)' : 'Reference Image (Optional)'}
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 border-2 border-dashed border-slate-200 hover:border-purple-500 rounded-xl p-3 text-center cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleReferenceFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                    <Upload className="w-4 h-4 text-purple-600" />
                    <span>{referenceFile ? referenceFile.name : (lang === 'my' ? 'ပုံရွေးချယ်ပါ' : 'Upload file')}</span>
                  </div>
                </label>
                {referencePreview && (
                  <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden relative group shrink-0 shadow-2xs">
                    <img src={referencePreview} alt="Ref" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setReferenceFile(null);
                        setReferencePreview(null);
                      }}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {lang === 'my' ? 'အထူးညွှန်ကြားချက် (Prompt Refinements)' : 'Custom Instructions (Optional)'}
              </label>
              <textarea
                rows={2}
                placeholder={lang === 'my' ? 'ဥပမာ: Add soft golden hour glow, wooden table...' : 'e.g. Add subtle warm morning light...'}
                value={customImagePrompt}
                onChange={(e) => setCustomImagePrompt(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            {/* Generate Trigger Button (Animated AI Magic Gradient) */}
            <button
              type="button"
              disabled={generatingImage || !activeProduct}
              onClick={handleGenerateImage}
              className="w-full py-3.5 px-6 rounded-xl btn-ai-gradient text-white font-bold text-xs shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {generatingImage ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{lang === 'my' ? 'စတူဒီယို ဓာတ်ပုံ ဖန်တီးနေပါသည်...' : 'Generating Studio Photography...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{lang === 'my' ? 'AI ဓာတ်ပုံ စတင်ဖန်တီးမည်' : 'Generate Studio Photo'}</span>
                </>
              )}
            </button>
          </div>

          {/* Preview & Action Column (Right) */}
          <div className="lg:col-span-7 space-y-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  <span>{lang === 'my' ? 'ဖန်တီးမှု ပြကွက် (Preview & Apply)' : 'Studio Photo Preview'}</span>
                </h2>
                {generatedImageUrl && (
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {lang === 'my' ? 'အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ' : 'Generated Ready'}
                  </span>
                )}
              </div>

              {/* Status and Errors */}
              {imageError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{imageError}</span>
                </div>
              )}

              {appliedSuccess && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {lang === 'my'
                      ? 'ကုန်ပစ္စည်း၏ အဓိကဓာတ်ပုံအဖြစ် စတော့တွင် အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!'
                      : 'Successfully saved as primary image in your Inventory!'}
                  </span>
                </div>
              )}

              {/* Preview Display Area with subtle studio dot-grid background */}
              <div className="mt-4 aspect-square max-h-[460px] w-full rounded-2xl border-2 border-dashed border-slate-200 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] bg-slate-50/50 overflow-hidden flex items-center justify-center relative">
                {generatingImage ? (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-600 flex items-center justify-center mx-auto shadow-inner animate-pulse">
                      <Wand2 className="w-7 h-7 animate-bounce" />
                    </div>
                    <div className="font-bold text-xs text-slate-800">
                      {lang === 'my' ? 'AI စတူဒီယိုမှ ဓာတ်ပုံဖန်တီးနေပါသည်...' : 'Synthesizing Studio Product Image...'}
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                      {lang === 'my'
                        ? 'ရွေးချယ်ထားသော စတိုင်အတိုင်း အလင်းအမှောင်နှင့် နောက်ခံကို အဆင့်မြင့်ဆုံး ပြင်ဆင်နေပါသည်'
                        : 'Balancing lighting, shadows, and high-fidelity product reflection'}
                    </p>
                  </div>
                ) : generatedImageUrl ? (
                  <img
                    src={generatedImageUrl}
                    alt="Generated Product"
                    className="w-full h-full object-contain bg-slate-900/5"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2 text-slate-400">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-600 flex items-center justify-center shadow-inner mb-3 mx-auto">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <p className="font-bold text-sm text-slate-700">
                      {lang === 'my' ? 'ဖန်တီးထားသော ပုံ မရှိသေးပါ' : 'No Studio Photo Generated Yet'}
                    </p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed mt-1">
                      {lang === 'my'
                        ? 'အပေါ်ဘက်ရှိ စတူဒီယိုစတိုင်ကို ရွေးချယ်သတ်မှတ်ပြီး "AI ဓာတ်ပုံ စတင်ဖန်တီးမည်" ကို နှိပ်ပါ'
                        : 'Configure your settings on the left and click "Generate Studio Photo" to begin.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Merchant Explicit Actions (Never auto-replace without merchant confirmation) */}
            {generatedImageUrl && (
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDiscardImage}
                  className="px-3.5 py-2 border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {lang === 'my' ? 'ပယ်ဖျက်မည်' : 'Discard'}
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={generatedImageUrl}
                    download={`shopsone-studio-${Date.now()}.png`}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{lang === 'my' ? 'ဒေါင်းလုဒ်ရယူမည်' : 'Download'}</span>
                  </a>

                  <button
                    type="button"
                    disabled={applyingImage}
                    onClick={handleApplyToInventory}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {applyingImage ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {lang === 'my' ? 'စတော့တွင် အဓိကပုံအဖြစ် သိမ်းဆည်းမည်' : 'Save as Product Image'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: MARKETING COPY & DESCRIPTIONS */}
      {activeTab === 'copy_studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-5 bg-white p-5 rounded-2xl border border-[#CBD5E1] shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2563EB]" />
                <span>{lang === 'my' ? 'စာသား ဖန်တီးမှု ပုံစံများ' : 'Marketing Copy Tools'}</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === 'my'
                  ? 'မြန်မာဘာသာ သို့မဟုတ် အင်္ဂလိပ်ဘာသာဖြင့် ဆွဲဆောင်မှုရှိသော ရောင်းချစာသားများ'
                  : 'Culturally tuned copy, product descriptions, TikTok scripts & promos'}
              </p>
            </div>

            {/* Copy Types */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                {lang === 'my' ? 'စာသား အမျိုးအစား' : 'Format Selection'}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    id: 'description_my',
                    title: lang === 'my' ? 'မြန်မာ ကုန်ပစ္စည်းအညွှန်း (Burmese Description)' : 'Burmese Product Description',
                    desc: lang === 'my' ? 'ကုန်သည်များအတွက် စုံလင်ယဉ်ကျေးသော ဖော်ပြချက်' : 'Polite, detailed e-commerce description in Myanmar'
                  },
                  {
                    id: 'description_en',
                    title: lang === 'my' ? 'အင်္ဂလိပ် ကုန်ပစ္စည်းအညွှန်း (English Description)' : 'English Product Description',
                    desc: lang === 'my' ? 'နိုင်ငံတကာ အဆင့်မီ ကုန်ပစ္စည်းအညွှန်း' : 'Professional e-commerce specifications & benefits'
                  },
                  {
                    id: 'facebook_promo',
                    title: lang === 'my' ? 'Facebook အရောင်းပို့စ် (Social Commerce)' : 'Facebook Sales Post',
                    desc: lang === 'my' ? 'ဆွဲဆောင်မှုရှိသော Emoji + စျေးနှုန်း + Call to Action' : 'Engaging social post with hooks, pricing, and CTA'
                  },
                  {
                    id: 'tiktok_script',
                    title: lang === 'my' ? 'TikTok ဗီဒီယို ဇာတ်ညွှန်း (Video Script)' : 'TikTok Short Video Script',
                    desc: lang === 'my' ? 'Hook၊ ပြသမှု နှင့် မှာယူရန် လမ်းညွှန်' : '3-part script: Hook, Showcase, and Call to action'
                  },
                  {
                    id: 'headline_cta',
                    title: lang === 'my' ? 'ကြော်ငြာခေါင်းစဉ်နှင့် CTA (Headlines)' : 'Catchy Headlines & CTAs',
                    desc: lang === 'my' ? 'မျက်စိကျစေမည့် ကြော်ငြာ ခေါင်းစဉ်တိုများ' : 'Punchy headlines that drive immediate customer interest'
                  },
                  {
                    id: 'features_summary',
                    title: lang === 'my' ? 'အဓိက အချက်အလက် အကျဉ်းချုပ် (Bullet Points)' : 'Key Feature Highlights',
                    desc: lang === 'my' ? 'ဝယ်သူများ အလွယ်တကူ ဖတ်ရှုနိုင်သော အချက်များ' : 'Scannable bullet points highlighting product value'
                  }
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setCopyType(type.id as AiStudioCopyType)}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      copyType === type.id
                        ? 'border-[#2563EB] bg-blue-50/50 ring-1 ring-[#2563EB]'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-800">{type.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Guidance */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {lang === 'my' ? 'အပိုဆောင်း ညွှန်ကြားချက် (Custom Instructions)' : 'Additional Notes (Optional)'}
              </label>
              <textarea
                rows={2}
                placeholder={lang === 'my' ? 'ဥပမာ: အထူးလျော့စျေး ကာလအကြောင်း ထည့်ရေးပေးပါ...' : 'e.g. Focus on fabric durability...'}
                value={customCopyPrompt}
                onChange={(e) => setCustomCopyPrompt(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            {/* Trigger Button */}
            <button
              type="button"
              disabled={generatingCopy || !activeProduct}
              onClick={handleGenerateCopy}
              className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              {generatingCopy ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{lang === 'my' ? 'ကြော်ငြာစာသား ရေးသားနေပါသည်...' : 'Drafting Copy...'}</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>{lang === 'my' ? 'ကြော်ငြာစာသား ဖန်တီးမည်' : 'Generate Marketing Copy'}</span>
                </>
              )}
            </button>
          </div>

          {/* Output Display Column */}
          <div className="lg:col-span-7 space-y-4 bg-white p-5 rounded-2xl border border-[#CBD5E1] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2563EB]" />
                  <span>{lang === 'my' ? 'ဖန်တီးထားသော စာသား (Generated Output)' : 'Generated Text Preview'}</span>
                </h2>
                {generatedText && (
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="px-3 py-1 bg-blue-50 text-[#2563EB] hover:bg-blue-100 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedNotification ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">{lang === 'my' ? 'ကူးယူပြီး' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{lang === 'my' ? 'ကူးယူမည် (Copy)' : 'Copy'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {copyError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{copyError}</span>
                </div>
              )}

              {/* Editable Output Box */}
              <div className="mt-4">
                {generatingCopy ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#2563EB]" />
                    <p className="text-xs">{lang === 'my' ? 'AI မှ စာသား ရေးသားနေပါသည်...' : 'Generating tailored marketing copy...'}</p>
                  </div>
                ) : (
                  <textarea
                    rows={12}
                    value={generatedText}
                    onChange={(e) => setGeneratedText(e.target.value)}
                    placeholder={
                      lang === 'my'
                        ? 'ဖန်တီးထားသော စာသား ဤနေရာတွင် ပေါ်လာပါမည်။ လိုအပ်သလို စိတ်ကြိုက် ပြင်ဆင်နိုင်ပါသည်။'
                        : 'Generated promotional copy will appear here. You can freely review and edit.'
                    }
                    className="w-full p-4 border border-slate-200 rounded-xl text-xs font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-slate-50/50"
                  />
                )}
              </div>
            </div>

            {/* Quick Actions Footer */}
            {generatedText && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{generatedText.length} {lang === 'my' ? 'စာလုံးရေ' : 'characters'}</span>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'ကူးယူပြီး အသုံးပြုမည်' : 'Copy to Clipboard'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: GENERATION HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <History className="w-4 h-4 text-[#2563EB]" />
                <span>{lang === 'my' ? 'AI စတူဒီယို ဖန်တီးမှု မှတ်တမ်း' : 'Studio Generation History'}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'my' ? 'လတ်တလော ဖန်တီးခဲ့သော ဓာတ်ပုံနှင့် စာသားများ' : 'Past generated images, copy, and products'}
              </p>
            </div>
            <button
              type="button"
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>{lang === 'my' ? 'ပြန်လည်စစ်ဆေးမည်' : 'Refresh'}</span>
            </button>
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>{lang === 'my' ? 'ဖန်တီးမှု မှတ်တမ်း မရှိသေးပါ' : 'No studio assets recorded yet.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => (
                <div key={item.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      {item.type === 'image' ? (lang === 'my' ? 'စတူဒီယို ဓာတ်ပုံ' : 'Studio Photo') : (lang === 'my' ? 'ကြော်ငြာစာသား' : 'Marketing Copy')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {item.productName && (
                    <div className="text-xs text-[#2563EB] font-medium truncate">
                      {item.productName}
                    </div>
                  )}

                  {item.type === 'image' && item.outputUrl && (
                    <div className="aspect-square w-full rounded-lg overflow-hidden border border-slate-200 bg-white">
                      <img src={item.outputUrl} alt="Thumbnail" className="w-full h-full object-contain" />
                    </div>
                  )}

                  {item.type === 'copy' && item.outputText && (
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 line-clamp-4 font-mono">
                      {item.outputText}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span>{item.mode || item.type}</span>
                    {item.savedToProduct && (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {lang === 'my' ? 'စတော့တွင် သိမ်းပြီး' : 'Saved to Inventory'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
