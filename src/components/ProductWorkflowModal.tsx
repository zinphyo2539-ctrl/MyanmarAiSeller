import React from 'react';
import { GuidedWorkflow } from './GuidedWorkflow';
import { X, Upload } from 'lucide-react';

export const ProductWorkflowModal = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  handleSaveProduct,
  lang,
  editingProduct,
  formError,
  handleFileUpload,
  uploadingImage,
  uploadError,
  uploadSuccessMessage,
  handleGenerateAiPhoto,
  generatingAiPhoto,
  aiGeneratedPreviewUrl,
  aiStyle,
  setAiStyle,
  aiCustomPrompt,
  setAiCustomPrompt,
  handleApproveAiPhoto,
  handleAddVariantRow,
  handleRemoveVariantRow,
}: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-4 overflow-y-auto transition-all duration-300">
      <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-none sm:rounded-3xl w-full max-w-lg shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden h-full sm:h-auto sm:max-h-[90vh] flex flex-col my-auto text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
          <h3 className="text-base font-bold text-white tracking-tight">
            {editingProduct
              ? lang === 'my'
                ? 'ကုန်ပစ္စည်း ပြင်ဆင်ရန်'
                : 'Edit Product'
              : lang === 'my'
              ? 'ကုန်ပစ္စည်း အသစ်ထည့်သွင်းရန်'
              : 'Add New Product'}
          </h3>
          <button
            type="button"
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
          onFinish={handleSaveProduct}
          steps={[
            {
              title: lang === 'my' ? 'အခြေခံ အချက်အလက်' : 'Basic Information',
              instruction:
                lang === 'my'
                  ? 'ပထမဆုံး ပစ္စည်းအမည်နဲ့ အမျိုးအစားကို ဖြည့်ပါ။'
                  : 'First, fill in the product name and SKU.',
              content: (
                <div className="space-y-3.5 py-1">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5 text-xs">SKU *</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                      {lang === 'my' ? 'ဖော်ပြချက်' : 'Description'}
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-all outline-none resize-none"
                    />
                  </div>
                </div>
              ),
            },
            {
              title: lang === 'my' ? 'ကုန်ပစ္စည်း ပုံများ' : 'Product Images',
              instruction:
                lang === 'my' ? 'အခု ရောင်းချမယ့်ပစ္စည်းရဲ့ ပုံကို တင်ပါ။' : 'Upload the product image.',
              content: (
                <div className="space-y-4 py-1">
                  <label
                    className={`block py-6 px-4 border-2 border-dashed border-purple-500/30 hover:border-purple-400 bg-purple-500/[0.04] hover:bg-purple-500/[0.08] rounded-2xl text-center cursor-pointer transition-all ${
                      uploadingImage ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <Upload className="w-8 h-8 text-purple-400 mx-auto" />
                    <span className="text-xs font-semibold text-slate-200 mt-2 block">
                      {uploadingImage
                        ? 'Uploading...'
                        : lang === 'my'
                        ? 'ပုံတင်ရန် နှိပ်ပါ'
                        : 'Upload Image'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">JPG, PNG up to 10MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.imageUrl && (
                    <div className="relative group rounded-2xl overflow-hidden border border-white/10">
                      <img
                        src={formData.imageUrl}
                        className="w-full h-40 object-cover"
                        alt="Product preview"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        className="absolute top-2.5 right-2.5 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold px-2.5"
                        title={lang === 'my' ? 'ပုံဖျက်မည်' : 'Remove Image'}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{lang === 'my' ? 'ပုံဖျက်မည်' : 'Remove'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: lang === 'my' ? 'ဈေးနှုန်းနှင့် စတော့' : 'Price and Stock',
              instruction:
                lang === 'my' ? 'ဈေးနှုန်းနဲ့ လက်ကျန်အရေအတွက်ကို ဖြည့်ပါ။' : 'Fill in price and cost.',
              content: (
                <div className="space-y-4 py-1">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                        Price (MMK) *
                      </label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: Number(e.target.value) })
                        }
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                        Cost (MMK)
                      </label>
                      <input
                        type="number"
                        value={formData.costPrice}
                        onChange={(e) =>
                          setFormData({ ...formData, costPrice: e.target.value })
                        }
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white transition-all outline-none"
                      />
                    </div>
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
