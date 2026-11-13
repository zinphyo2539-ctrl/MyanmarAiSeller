import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
  Save,
  Tag,
  ImageIcon,
  Upload,
  Bot
} from 'lucide-react';
import { Product, Variant } from '../types';
import { ProductWorkflowModal } from './ProductWorkflowModal';

// Declarative Product Thumbnail with graceful fallback on broken image URLs
const ProductThumbnail: React.FC<{ imageUrl?: string | null; name: string }> = ({ imageUrl, name }) => {
  const [hasError, setHasError] = useState(false);

  if (!imageUrl || hasError) {
    return (
      <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-center shrink-0 text-purple-400 shadow-inner">
        <Package className="w-6 h-6 stroke-[1.75]" />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
      <img
        src={imageUrl}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  );
};

interface InventoryViewProps {
  products: Product[];
  loading: boolean;
  lang: 'my' | 'en';
  onAddProduct: (product: any) => Promise<void>;
  onUpdateProduct: (id: string, updates: any) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  initialFilter?: string;
  getHeaders: () => Record<string, string>;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  loading,
  lang,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  initialFilter,
  getHeaders
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>(
    initialFilter === 'low_stock' ? 'low_stock' : initialFilter === 'out_of_stock' ? 'out_of_stock' : 'all'
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Upload & AI Analysis State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);
  const [aiAnalysisApplied, setAiAnalysisApplied] = useState(false);
  const [aiAnalysisMeta, setAiAnalysisMeta] = useState<{ provider: string; model: string } | null>(null);
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  const applyAiAnalysisResult = (analysis: any) => {
    if (!analysis) return;
    setFormData((prev) => {
      const baseSuffix = prev.sku && prev.sku.includes('-') ? prev.sku.split('-').pop() : Date.now().toString().slice(-4);
      const nextSku = analysis.skuPrefix ? `${analysis.skuPrefix}-${baseSuffix}` : prev.sku;
      const nextVariants = Array.isArray(analysis.variants) && analysis.variants.length > 0
        ? analysis.variants.map((v: any, idx: number) => ({
            color: v.color || 'Standard',
            size: v.size || 'Free Size',
            stock: typeof v.stock === 'number' ? v.stock : 10,
            sku: `${nextSku}-V${idx + 1}`
          }))
        : prev.variants;

      return {
        ...prev,
        name: analysis.name || prev.name,
        category: analysis.category || prev.category,
        sku: nextSku,
        description: analysis.description || prev.description,
        price: typeof analysis.price === 'number' && analysis.price > 0 ? analysis.price : prev.price,
        variants: nextVariants
      };
    });
    setAiAnalysisApplied(true);
  };

  const runAiImageAnalysis = async (input: { file?: File; imageUrl?: string }) => {
    setAnalyzingImage(true);
    setAiAnalysisError(null);
    try {
      const rawHeaders = getHeaders();
      let res: Response;

      if (input.file) {
        const aiForm = new FormData();
        aiForm.append('image', input.file);
        aiForm.append('lang', lang);
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(rawHeaders)) {
          if (k.toLowerCase() !== 'content-type') {
            headers[k] = v;
          }
        }
        res = await fetch('/api/merchant/analyze-product-image', {
          method: 'POST',
          headers,
          body: aiForm
        });
      } else if (input.imageUrl) {
        res = await fetch('/api/merchant/analyze-product-image', {
          method: 'POST',
          headers: rawHeaders,
          body: JSON.stringify({ imageUrl: input.imageUrl, lang })
        });
      } else {
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI analysis failed');
      }
      if (data.provider || data.model) {
        setAiAnalysisMeta({
          provider: data.provider || 'groq',
          model: data.model || 'qwen/qwen3.8-27b',
        });
      }
      if (data.analysis) {
        applyAiAnalysisResult(data.analysis);
      }
    } catch (err: any) {
      setAiAnalysisMeta(null);
      setAiAnalysisError(
        err?.message ||
          (lang === 'my'
            ? 'AI မှ ပုံခွဲခြမ်းစိတ်ဖြာမှု မအောင်မြင်ပါ — ကိုယ်တိုင်ဖြည့်သွင်းနိုင်ပါသည်။'
            : 'AI image analysis failed — you can still fill fields manually.')
      );
    } finally {
      setAnalyzingImage(false);
    }
  };

  const processImageFile = async (file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(lang === 'my' ? 'ဖိုင်ဆိုဒ် 5 MB ထက်မကြီးရပါ။' : 'File size must not exceed 5 MiB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setUploadError(lang === 'my' ? 'JPEG, PNG သို့မဟုတ် WebP ပုံဖိုင်သာ လက်ခံပါသည်။' : 'Only JPEG, PNG, and WebP images are supported.');
      return;
    }

    if (localImagePreview && localImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(localImagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setLocalImagePreview(previewUrl);
    setSelectedImageFile(file);
    setUploadingImage(true);
    setUploadError(null);
    setUploadSuccessMessage(null);
    setAiAnalysisError(null);

    const shouldAutoAnalyze = !editingProduct;
    const analysisPromise = shouldAutoAnalyze ? runAiImageAnalysis({ file }) : Promise.resolve();

    try {
      const dataForm = new FormData();
      dataForm.append('image', file);

      const rawHeaders = getHeaders();
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawHeaders)) {
        if (k.toLowerCase() !== 'content-type') {
          headers[k] = v;
        }
      }

      const res = await fetch('/api/merchant/upload-image', {
        method: 'POST',
        headers,
        body: dataForm
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setFormData(prev => ({ ...prev, imageUrl: data.imageUrl }));
      setUploadSuccessMessage(lang === 'my' ? 'ပုံတင်ခြင်း အောင်မြင်ပါသည်!' : 'Image uploaded successfully!');
      setTimeout(() => setUploadSuccessMessage(null), 3000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      await analysisPromise;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processImageFile(file);
  };

  // AI Generator State
  const [aiStyle, setAiStyle] = useState('clean_white_studio');
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [generatingAiPhoto, setGeneratingAiPhoto] = useState(false);
  const [aiGeneratedPreviewUrl, setAiGeneratedPreviewUrl] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);

  const handleGenerateAiPhoto = async () => {
    if (!formData.imageUrl || generatingAiPhoto) return;
    setGeneratingAiPhoto(true);
    setAiError(null);
    try {
      const res = await fetch('/api/merchant/ai-generate-photo', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          imageUrl: formData.imageUrl,
          style: aiStyle,
          prompt: aiCustomPrompt
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI photo generation failed');
      }
      setAiGeneratedPreviewUrl(data.generatedImageUrl);
      if (typeof data.remainingQuota === 'number') {
        setRemainingQuota(data.remainingQuota);
      }
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate AI product photo');
    } finally {
      setGeneratingAiPhoto(false);
    }
  };

  const handleApproveAiPhoto = () => {
    if (aiGeneratedPreviewUrl) {
      setFormData(prev => ({ ...prev, imageUrl: aiGeneratedPreviewUrl }));
      setAiGeneratedPreviewUrl(null);
      setUploadSuccessMessage(lang === 'my' ? 'AI ပုံကို အတည်ပြု၍ သတ်မှတ်ပြီးပါပြီ!' : 'AI photo approved and applied!');
      setTimeout(() => setUploadSuccessMessage(null), 3000);
    }
  };

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    sku: string;
    price: number;
    costPrice?: number | string;
    description: string;
    discount: string;
    status: string;
    imageUrl: string;
    variants: Array<{ color: string; size: string; stock: number; sku: string }>;
  }>({
    name: '',
    category: '',
    sku: '',
    price: 15000,
    costPrice: '',
    description: '',
    discount: '',
    status: 'active',
    imageUrl: '',
    variants: [
      { color: 'Standard', size: 'Free Size', stock: 10, sku: '' }
    ]
  });

  // Calculate Overview Metrics
  let totalStockUnits = 0;
  let outOfStockCount = 0;
  let lowStockCount = 0;

  products.forEach((p) => {
    let prodTotalStock = 0;
    let hasZero = false;
    let hasLow = false;

    (p.variants || []).forEach((v) => {
      const s = Number(v.stock) || 0;
      prodTotalStock += s;
      totalStockUnits += s;
      if (s === 0) hasZero = true;
      else if (s <= 3) hasLow = true;
    });

    if (prodTotalStock === 0 || hasZero) outOfStockCount++;
    else if (hasLow) lowStockCount++;
  });

  // Filter products strictly based on real data
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchesName = p.name.toLowerCase().includes(q);
      const matchesSku = p.sku.toLowerCase().includes(q);
      const matchesVariant = p.variants?.some(v => v.color.toLowerCase().includes(q) || v.size.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q));
      if (!matchesName && !matchesSku && !matchesVariant) return false;
    }

    if (stockFilter === 'out_of_stock') {
      const hasZero = (p.variants || []).some(v => Number(v.stock) === 0);
      const totalStock = (p.variants || []).reduce((sum, v) => sum + Number(v.stock), 0);
      if (!hasZero && totalStock > 0) return false;
    } else if (stockFilter === 'low_stock') {
      const hasLow = (p.variants || []).some(v => Number(v.stock) > 0 && Number(v.stock) <= 3);
      if (!hasLow) return false;
    } else if (stockFilter === 'in_stock') {
      const allInStock = (p.variants || []).every(v => Number(v.stock) > 3);
      if (!allInStock) return false;
    }

    return true;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormError(null);
    setUploadError(null);
    setUploadSuccessMessage(null);
    setAiAnalysisError(null);
    setAiAnalysisApplied(false);
    setAiAnalysisMeta(null);
    setLocalImagePreview(null);
    const shortTs = Date.now().toString().slice(-6);
    setFormData({
      name: '',
      category: '',
      sku: `SKU-${shortTs}`,
      price: 15000,
      costPrice: '',
      description: '',
      discount: '',
      status: 'active',
      imageUrl: '',
      variants: [
        { color: 'Standard', size: 'Free Size', stock: 10, sku: `SKU-${shortTs}-V1` }
      ]
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormError(null);
    setUploadError(null);
    setUploadSuccessMessage(null);
    setAiAnalysisError(null);
    setAiAnalysisApplied(false);
    setAiAnalysisMeta(null);
    setLocalImagePreview(null);
    setFormData({
      name: prod.name,
      category: prod.category || '',
      sku: prod.sku,
      price: prod.price,
      costPrice: prod.costPrice !== undefined && prod.costPrice !== null ? prod.costPrice : '',
      description: prod.description || '',
      discount: prod.discount || '',
      status: prod.status || 'active',
      imageUrl: prod.imageUrl || '',
      variants: (prod.variants && prod.variants.length > 0)
        ? prod.variants.map(v => ({ color: v.color, size: v.size, stock: v.stock, sku: v.sku }))
        : [{ color: 'Standard', size: 'Free Size', stock: 0, sku: `${prod.sku}-V1` }]
    });
    setIsModalOpen(true);
  };

  const handleAddVariantRow = () => {
    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        { color: 'Black', size: 'M', stock: 5, sku: `${prev.sku}-V${prev.variants.length + 1}` }
      ]
    }));
  };

  const handleRemoveVariantRow = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveProduct = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!formData.name.trim()) {
      const msg = lang === 'my' ? 'ကုန်ပစ္စည်းအမည် ဖြည့်သွင်းရန် လိုအပ်ပါသည်။' : 'Product name is required.';
      setFormError(msg);
      throw new Error(msg);
    }
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        costPrice: formData.costPrice !== '' && !isNaN(Number(formData.costPrice)) ? Number(formData.costPrice) : null
      };
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, payload);
      } else {
        await onAddProduct(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm(lang === 'my' ? 'ဤကုန်ပစ္စည်းကို ဖျက်ရန် သေချာပါသလား?' : 'Are you sure you want to delete this product?');
    if (!confirmDelete) return;
    setDeletingId(id);
    try {
      await onDeleteProduct(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Metrics Cards */}
      <section aria-label="Inventory Metrics Overview">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {lang === 'my' ? 'ကုန်ပစ္စည်းနှင့် စတော့ အကျဉ်းချုပ်' : 'Inventory & Stock Overview'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'my' ? 'ပစ္စည်းအသစ်ထည့်မည်' : 'Add Product'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-2xl hover:border-purple-500/40 transition-all group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-medium text-slate-400">
              {lang === 'my' ? 'ရောင်းချနေသော ပစ္စည်း' : 'Active Products'}
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-slate-100 mt-2">
              {products.length}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {lang === 'my' ? 'ကက်တလောက်စာရင်းသွင်းပြီး' : 'catalog items'}
            </span>
          </div>

          {/* Card 2 */}
          <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-2xl hover:border-indigo-500/40 transition-all group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-medium text-slate-400">
              {lang === 'my' ? 'စုစုပေါင်း စတော့ယူနစ်' : 'Total Stock Units'}
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-slate-100 mt-2">
              {totalStockUnits.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {lang === 'my' ? 'variants အားလုံးပေါင်း' : 'across all variants'}
            </span>
          </div>

          {/* Card 3 */}
          <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-2xl hover:border-rose-500/40 transition-all group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-medium text-slate-400">
              {lang === 'my' ? 'လက်ကျန်ပြတ်လပ်မှု' : 'Out of Stock'}
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-rose-400 mt-2">
              {outOfStockCount}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {lang === 'my' ? 'ဖြည့်တင်းရန် လိုအပ်သည်' : 'requires replenishment'}
            </span>
          </div>

          {/* Card 4 */}
          <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-2xl hover:border-amber-500/40 transition-all group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-medium text-slate-400">
              {lang === 'my' ? 'လက်ကျန်နည်းပါးမှု (<=3)' : 'Low Stock (<=3)'}
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-amber-400 mt-2">
              {lowStockCount}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {lang === 'my' ? 'သတိထားစောင့်ကြည့်ရန်' : 'attention required'}
            </span>
          </div>
        </div>
      </section>

      {/* Search and Filters Bar */}
      <section aria-label="Search and Filter Controls" className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'my' ? 'အမည်၊ SKU သို့မဟုတ် အရောင်/အရွယ်အစားဖြင့် ရှာဖွေပါ...' : 'Search by name, SKU, or variant...'}
            className="w-full bg-slate-950/60 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl overflow-x-auto border border-white/10 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setStockFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
              stockFilter === 'all'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'my' ? 'အားလုံး' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('in_stock')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
              stockFilter === 'in_stock'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'my' ? 'လက်ကျန်ရှိ' : 'In Stock'}
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('low_stock')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
              stockFilter === 'low_stock'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'my' ? 'လက်ကျန်နည်း' : 'Low Stock'}
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('out_of_stock')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
              stockFilter === 'out_of_stock'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'my' ? 'လက်ကျန်ပြတ်' : 'Out of Stock'}
          </button>
        </div>
      </section>

      {/* Product List Cards */}
      <section aria-label="Product Catalog List">
        {filteredProducts.length === 0 ? (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center space-y-3 shadow-inner">
            <Package className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-100">
              {products.length === 0
                ? (lang === 'my' ? 'ကုန်ပစ္စည်း မထည့်သွင်းရသေးပါ' : 'No products in catalog yet')
                : (lang === 'my' ? 'ကိုက်ညီသော ကုန်ပစ္စည်း မတွေ့ပါ' : 'No products match your search/filter')}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {products.length === 0
                ? (lang === 'my' ? 'အထက်ပါ "ပစ္စည်းအသစ်ထည့်မည်" ခလုတ်ကို နှိပ်၍ စတိုး၏ ပထမဆုံး ကုန်ပစ္စည်းကို စတင်ထည့်သွင်းပါ' : 'Click "Add Product" above to create your first store product.')
                : (lang === 'my' ? 'ရှာဖွေမှုစကားလုံး သို့မဟုတ် filter ကို ပြန်လည်စစ်ဆေးပါ' : 'Try adjusting your search terms or filters.')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              return (
                <div
                  key={product.id}
                  className="bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-purple-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all space-y-3 shadow-lg hover:shadow-purple-500/10 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <ProductThumbnail imageUrl={product.imageUrl} name={product.name} />
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-100 leading-snug truncate group-hover:text-purple-300 transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-1">
                          <span>SKU: {product.sku}</span>
                          <span>·</span>
                          <span className="text-purple-300 font-bold">
                            {product.price.toLocaleString()} MMK
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(product)}
                        className="p-2 bg-slate-900/80 hover:bg-purple-600/20 border border-white/10 text-slate-300 hover:text-purple-300 rounded-xl transition-colors cursor-pointer"
                        title={lang === 'my' ? 'ပြင်ဆင်ရန်' : 'Edit'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === product.id}
                        onClick={() => handleDelete(product.id)}
                        className="p-2 bg-slate-900/80 hover:bg-rose-600/20 border border-white/10 text-slate-400 hover:text-rose-400 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                        title={lang === 'my' ? 'ဖျက်မည်' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  )}

                  {product.discount && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{product.discount}</span>
                    </div>
                  )}

                  {/* Variants and Stock Breakdown */}
                  <div className="pt-2.5 border-t border-white/10">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                      {lang === 'my' ? 'အရွယ်အစားနှင့် စတော့ လက်ကျန်' : 'Variants & Stock'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(product.variants || []).map((v) => {
                        const stockNum = Number(v.stock) || 0;
                        const isZero = stockNum === 0;
                        const isLow = stockNum > 0 && stockNum <= 3;
                        const isGood = stockNum > 5;

                        return (
                          <div
                            key={v.id}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono tabular-nums border ${
                              isZero
                                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 font-semibold'
                                : isLow
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 font-semibold'
                                : isGood
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-semibold'
                                : 'bg-slate-900/80 border-white/10 text-slate-300 font-medium'
                            }`}
                          >
                            <span>{v.color}/{v.size}: </span>
                            <span className="font-bold">{v.stock}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add / Edit Product Modal */}
      <ProductWorkflowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        formData={formData}
        setFormData={setFormData}
        handleSaveProduct={handleSaveProduct}
        lang={lang}
        editingProduct={editingProduct}
        formError={formError}
        handleFileUpload={handleFileUpload}
        onImageFileSelected={processImageFile}
        hasSelectedFile={Boolean(selectedImageFile)}
        uploadingImage={uploadingImage}
        uploadError={uploadError}
        uploadSuccessMessage={uploadSuccessMessage}
        localImagePreview={localImagePreview}
        setLocalImagePreview={(val: string | null) => {
          setLocalImagePreview(val);
          if (!val) setSelectedImageFile(null);
        }}
        analyzingImage={analyzingImage}
        aiAnalysisError={aiAnalysisError}
        aiAnalysisApplied={aiAnalysisApplied}
        aiAnalysisMeta={aiAnalysisMeta}
        onReanalyzeImage={() => {
          if (selectedImageFile) {
            runAiImageAnalysis({ file: selectedImageFile });
          } else if (formData.imageUrl) {
            runAiImageAnalysis({ imageUrl: formData.imageUrl });
          }
        }}
        handleGenerateAiPhoto={handleGenerateAiPhoto}
        generatingAiPhoto={generatingAiPhoto}
        aiGeneratedPreviewUrl={aiGeneratedPreviewUrl}
        aiStyle={aiStyle}
        setAiStyle={setAiStyle}
        aiCustomPrompt={aiCustomPrompt}
        setAiCustomPrompt={setAiCustomPrompt}
        handleApproveAiPhoto={handleApproveAiPhoto}
        handleAddVariantRow={handleAddVariantRow}
        handleRemoveVariantRow={handleRemoveVariantRow}
        saving={saving}
      />
    </div>
  );
};
