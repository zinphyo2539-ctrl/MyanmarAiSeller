import React from 'react';
import { GuidedWorkflow } from './GuidedWorkflow';
import { X, ImageIcon, Upload, Bot, CheckCircle2 } from 'lucide-react';

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
    handleRemoveVariantRow 
}: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
                {editingProduct
                ? (lang === 'my' ? 'ကုန်ပစ္စည်း ပြင်ဆင်ရန်' : 'Edit Product')
                : (lang === 'my' ? 'ကုန်ပစ္စည်း အသစ်ထည့်သွင်းရန်' : 'Add New Product')}
            </h3>
            <button type="button" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5 text-slate-400" />
            </button>
        </div>
        
        <GuidedWorkflow
          lang={lang}
          onClose={onClose}
          onFinish={handleSaveProduct}
          steps={[
            {
              title: lang === 'my' ? 'အခြေခံ အချက်အလက်' : 'Basic Information',
              instruction: lang === 'my' ? 'ပထမဆုံး ပစ္စည်းအမည်နဲ့ အမျိုးအစားကို ဖြည့်ပါ။' : 'First, fill in the product name and category.',
              content: (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-xs">Product Name *</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-xs">SKU *</label>
                    <input type="text" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-xs">{lang === 'my' ? 'ဖော်ပြချက်' : 'Description'}</label>
                    <textarea rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                  </div>
                </div>
              )
            },
            {
              title: lang === 'my' ? 'ကုန်ပစ္စည်း ပုံများ' : 'Product Images',
              instruction: lang === 'my' ? 'အခု ရောင်းချမယ့်ပစ္စည်းရဲ့ ပုံကို တင်ပါ။' : 'Upload the product image.',
              content: (
                <div className="space-y-4">
                    <label className={`block py-4 border-2 border-dashed border-slate-300 rounded-xl text-center cursor-pointer ${uploadingImage ? 'opacity-50' : ''}`}>
                      <Upload className="w-6 h-6 text-blue-600 mx-auto" />
                      <span className="text-xs text-slate-500 mt-2 block">{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    {formData.imageUrl && <img src={formData.imageUrl} className="w-full h-32 object-cover rounded-xl" />}
                </div>
              )
            },
            {
                title: lang === 'my' ? 'ဈေးနှုန်းနှင့် စတော့' : 'Price and Stock',
                instruction: lang === 'my' ? 'ဈေးနှုန်းနဲ့ လက်ကျန်အရေအတွက်ကို ဖြည့်ပါ။' : 'Fill in price and stock.',
                content: (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1 text-xs">Price *</label>
                            <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-slate-700 font-semibold mb-1 text-xs">Cost</label>
                            <input type="number" value={formData.costPrice} onChange={(e) => setFormData({...formData, costPrice: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                        </div>
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
