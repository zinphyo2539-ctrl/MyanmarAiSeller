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
  Upload
} from 'lucide-react';
import { Product, Variant } from '../types';

// Declarative Product Thumbnail with graceful fallback on broken image URLs
const ProductThumbnail: React.FC<{ imageUrl?: string | null; name: string }> = ({ imageUrl, name }) => {
  const [hasError, setHasError] = useState(false);

  if (!imageUrl || hasError) {
    return (
      <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-center shrink-0">
        <Package className="w-6 h-6 text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-center shrink-0 overflow-hidden">
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

  // Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

    setUploadingImage(true);
    setUploadError(null);
    setUploadSuccessMessage(null);

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
      e.target.value = '';
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: 15000,
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
    setFormData({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      price: 15000,
      description: '',
      discount: '',
      status: 'active',
      imageUrl: '',
      variants: [
        { color: 'Standard', size: 'Free Size', stock: 10, sku: `SKU-${Date.now().toString().slice(-6)}-V1` }
      ]
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormError(null);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      price: prod.price,
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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, formData);
      } else {
        await onAddProduct(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            {lang === 'my' ? 'ကုန်ပစ္စည်းနှင့် စတော့ အကျဉ်းချုပ်' : 'Inventory & Stock Overview'}
          </h2>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'my' ? 'ပစ္စည်းအသစ်ထည့်မည်' : 'Add Product'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-xs font-medium text-slate-500">
              {lang === 'my' ? 'ရောင်းချနေသော ပစ္စည်း' : 'Active Products'}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-2">
              {products.length}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {lang === 'my' ? 'ကက်တလောက်စာရင်းသွင်းပြီး' : 'catalog items'}
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-xs font-medium text-slate-500">
              {lang === 'my' ? 'စုစုပေါင်း စတော့ယူနစ်' : 'Total Stock Units'}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-2">
              {totalStockUnits.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {lang === 'my' ? 'variants အားလုံးပေါင်း' : 'across all variants'}
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-xs font-medium text-slate-500">
              {lang === 'my' ? 'လက်ကျန်ပြတ်လပ်မှု' : 'Out of Stock'}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-red-600 mt-2">
              {outOfStockCount}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {lang === 'my' ? 'ဖြည့်တင်းရန် လိုအပ်သည်' : 'requires replenishment'}
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <span className="text-xs font-medium text-slate-500">
              {lang === 'my' ? 'လက်ကျန်နည်းပါးမှု (<=3)' : 'Low Stock (<=3)'}
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums text-amber-600 mt-2">
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
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl overflow-x-auto shadow-sm">
          <button
            type="button"
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              stockFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'my' ? 'အားလုံး' : 'All'}
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('in_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              stockFilter === 'in_stock' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'my' ? 'လက်ကျန်ရှိ' : 'In Stock'}
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('low_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              stockFilter === 'low_stock' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'my' ? 'လက်ကျန်နည်း' : 'Low Stock'}
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('out_of_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              stockFilter === 'out_of_stock' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'my' ? 'လက်ကျန်ပြတ်' : 'Out of Stock'}
          </button>
        </div>
      </section>

      {/* Product List Cards */}
      <section aria-label="Product Catalog List">
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-900">
              {products.length === 0
                ? (lang === 'my' ? 'ကုန်ပစ္စည်း မထည့်သွင်းရသေးပါ' : 'No products in catalog yet')
                : (lang === 'my' ? 'ကိုက်ညီသော ကုန်ပစ္စည်း မတွေ့ပါ' : 'No products match your search/filter')}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {products.length === 0
                ? (lang === 'my' ? 'အထက်ပါ "ပစ္စည်းအသစ်ထည့်မည်" ခလုတ်ကို နှိပ်၍ စတိုး၏ ပထမဆုံး ကုန်ပစ္စည်းကို စတင်ထည့်သွင်းပါ' : 'Click "Add Product" above to create your first store product.')
                : (lang === 'my' ? 'ရှာဖွေမှုစကားလုံး သို့မဟုတ် filter ကို ပြန်လည်စစ်ဆေးပါ' : 'Try adjusting your search terms or filters.')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              const totalStock = (product.variants || []).reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
              const isOut = totalStock === 0 || (product.variants || []).some(v => Number(v.stock) === 0);

              return (
                <div
                  key={product.id}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 flex flex-col justify-between transition-all space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <ProductThumbnail imageUrl={product.imageUrl} name={product.name} />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-1">
                          <span>SKU: {product.sku}</span>
                          <span>·</span>
                          <span className="text-slate-900 font-bold">
                            {product.price.toLocaleString()} MMK
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(product)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                        title={lang === 'my' ? 'ပြင်ဆင်ရန်' : 'Edit'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === product.id}
                        onClick={() => handleDelete(product.id)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-400 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
                        title={lang === 'my' ? 'ဖျက်မည်' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {product.discount && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{product.discount}</span>
                    </div>
                  )}

                  {/* Variants and Stock Breakdown */}
                  <div className="pt-2.5 border-t border-slate-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      {lang === 'my' ? 'အရွယ်အစားနှင့် စတော့ လက်ကျန်' : 'Variants & Stock'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(product.variants || []).map((v) => {
                        const isZero = Number(v.stock) === 0;
                        const isLow = Number(v.stock) > 0 && Number(v.stock) <= 3;

                        return (
                          <div
                            key={v.id}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono tabular-nums border ${
                              isZero
                                ? 'bg-red-50 border-red-200 text-red-700 font-semibold'
                                : isLow
                                ? 'bg-amber-50 border-amber-200 text-amber-700 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 space-y-4 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct
                  ? (lang === 'my' ? 'ကုန်ပစ္စည်း ပြင်ဆင်ရန်' : 'Edit Product')
                  : (lang === 'my' ? 'ကုန်ပစ္စည်း အသစ်ထည့်သွင်းရန်' : 'Add New Product')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'my' ? 'ကုန်ပစ္စည်း အမည်' : 'Product Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cotton T-Shirt"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {lang === 'my' ? 'စျေးနှုန်း (MMK)' : 'Price (MMK)'} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="500"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Product Image URL Input & Live Preview with Supabase File Upload */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-semibold text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>{lang === 'my' ? 'ကုန်ပစ္စည်း ဓာတ်ပုံ (Supabase Storage Upload သို့မဟုတ် HTTPS URL)' : 'Product Image (Supabase Upload or HTTPS URL)'}</span>
                  </label>
                  {formData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: '' })}
                      className="text-[11px] text-red-600 hover:underline font-medium cursor-pointer"
                    >
                      {lang === 'my' ? 'ဖျက်မည်' : 'Clear Image'}
                    </button>
                  )}
                </div>

                {/* File Upload Button / Hidden Input */}
                <div className="flex items-center gap-2">
                  <label className={`flex-1 py-2.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>
                      {uploadingImage
                        ? (lang === 'my' ? 'ပုံတင်နေသည်...' : 'Uploading to Supabase...')
                        : (lang === 'my' ? 'ဖိုင်မှ ပုံတင်မည် (JPEG/PNG/WebP, Max 5MB)' : 'Upload Image File (Supabase)')}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>

                {uploadError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700">
                    {uploadError}
                  </div>
                )}

                {uploadSuccessMessage && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-700">
                    {uploadSuccessMessage}
                  </div>
                )}

                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://... (or uploaded via Supabase)"
                      maxLength={1024}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-mono text-xs focus:border-blue-500 focus:outline-none placeholder-slate-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {lang === 'my'
                        ? 'Supabase မှ တင်ထားသော URL သို့မဟုတ် တိုက်ရိုက် HTTPS link ကို အသုံးပြုနိုင်သည်'
                        : 'Supabase storage URL or direct secure HTTPS link'}
                    </span>
                  </div>

                  {/* Live Image Preview Thumbnail */}
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden relative shadow-xs">
                    {formData.imageUrl && formData.imageUrl.trim().startsWith('https://') ? (
                      <img
                        src={formData.imageUrl.trim()}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'my' ? 'ဖော်ပြချက်' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={lang === 'my' ? 'ပစ္စည်းအသေးစိတ် အချက်အလက်...' : 'Fabric, fit, care instructions...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {lang === 'my' ? 'လျှော့စျေး / ပရိုမိုးရှင်း' : 'Discount / Promo'}
                </label>
                <input
                  type="text"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  placeholder="e.g. 10% OFF weekend promo"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Variants Section */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">
                    {lang === 'my' ? 'Variants (အရောင်၊ အရွယ်အစား၊ စတော့)' : 'Variants (Color, Size, Stock)'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    + {lang === 'my' ? 'Variant အသစ်ထည့်' : 'Add Variant'}
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formData.variants.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={v.color}
                          onChange={(e) => {
                            const newV = [...formData.variants];
                            newV[idx].color = e.target.value;
                            setFormData({ ...formData, variants: newV });
                          }}
                          placeholder="Color"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={v.size}
                          onChange={(e) => {
                            const newV = [...formData.variants];
                            newV[idx].size = e.target.value;
                            setFormData({ ...formData, variants: newV });
                          }}
                          placeholder="Size"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) => {
                            const newV = [...formData.variants];
                            newV[idx].stock = Number(e.target.value);
                            setFormData({ ...formData, variants: newV });
                          }}
                          placeholder="Stock"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <button
                          type="button"
                          disabled={formData.variants.length <= 1}
                          onClick={() => handleRemoveVariantRow(idx)}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-30 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? (lang === 'my' ? 'သိမ်းဆည်းနေသည်...' : 'Saving...') : (lang === 'my' ? 'သိမ်းမည်' : 'Save Product')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
