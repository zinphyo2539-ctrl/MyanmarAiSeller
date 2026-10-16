import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  Plus,
  Trash2,
  Edit2,
  Send,
  ShieldCheck,
  Zap,
  Activity,
  MessageSquare
} from 'lucide-react';
import { AiConfig, SampleReply, AiHealth, Product } from '../types';

interface AiSellerViewProps {
  config: AiConfig | null;
  samples: SampleReply[];
  products: Product[];
  aiHealth: AiHealth | null;
  lang: 'my' | 'en';
  onUpdateConfig: (newConfig: Partial<AiConfig>) => Promise<void>;
  onAddSample: (sample: { customerMessage: string; preferredReply: string; category: string }) => Promise<void>;
  onUpdateSample: (id: string, sample: { customerMessage: string; preferredReply: string; category: string }) => Promise<void>;
  onDeleteSample: (id: string) => Promise<void>;
  onTestPreview: (customerMessage: string, customInstructions?: string, replyStyle?: string) => Promise<string>;
}

export const AiSellerView: React.FC<AiSellerViewProps> = ({
  config,
  samples,
  products,
  aiHealth,
  lang,
  onUpdateConfig,
  onAddSample,
  onUpdateSample,
  onDeleteSample,
  onTestPreview
}) => {
  // Config form local state
  const [preferredLang, setPreferredLang] = useState(config?.preferredLanguage || 'myanmar');
  const [replyStyle, setReplyStyle] = useState(config?.replyStyle || 'friendly');
  const [customInstructions, setCustomInstructions] = useState(config?.customInstructions || '');
  const [handoffUncertain, setHandoffUncertain] = useState(config?.humanHandoff?.triggerOnUncertain ?? true);
  const [handoffComplaint, setHandoffComplaint] = useState(config?.humanHandoff?.triggerOnComplaint ?? true);
  const [handoffHumanReq, setHandoffHumanReq] = useState(config?.humanHandoff?.triggerOnHumanRequest ?? true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);

  // Playground simulation state
  const [previewInput, setPreviewInput] = useState('');
  const [previewOutput, setPreviewOutput] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Dynamic suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Sample Reply CRUD Modal state
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [editingSample, setEditingSample] = useState<SampleReply | null>(null);
  const [sampleForm, setSampleForm] = useState({ customerMessage: '', preferredReply: '', category: 'Stock and variants' });
  const [savingSample, setSavingSample] = useState(false);

  const fetchSuggestions = async () => {
    if (suggestionsLoading) return;
    setSuggestionsLoading(true);
    try {
      const res = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('myanmar_seller_token') ? { 'Authorization': `Bearer ${localStorage.getItem('myanmar_seller_token')}` } : {})
        },
        body: JSON.stringify({})
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.suggestions) {
          setSuggestions(data.suggestions);
        }
      }
    } catch {
      // Ignored
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleToggleAi = async () => {
    if (!config || savingConfig) return;
    setSavingConfig(true);
    try {
      await onUpdateConfig({ enabled: !config.enabled });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSaveSuccess(false);
    try {
      await onUpdateConfig({
        preferredLanguage: preferredLang,
        replyStyle,
        customInstructions,
        humanHandoff: {
          enabled: true,
          triggerOnUncertain: handoffUncertain,
          triggerOnComplaint: handoffComplaint,
          triggerOnHumanRequest: handoffHumanReq,
          notificationChannel: 'telegram_staff'
        }
      });
      setConfigSaveSuccess(true);
      setTimeout(() => setConfigSaveSuccess(false), 3000);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRunPreview = async (queryText?: string) => {
    const text = (queryText || previewInput).trim();
    if (!text || previewLoading) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const reply = await onTestPreview(text, customInstructions, replyStyle);
      setPreviewOutput(reply);
      if (queryText) setPreviewInput(queryText);
    } catch (err: any) {
      setPreviewError(err.message || 'AI Generation Error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenAddSample = () => {
    setEditingSample(null);
    setSampleForm({ customerMessage: '', preferredReply: '', category: 'Stock and variants' });
    setIsSampleModalOpen(true);
  };

  const handleOpenEditSample = (sample: SampleReply) => {
    setEditingSample(sample);
    setSampleForm({
      customerMessage: sample.customerMessage,
      preferredReply: sample.preferredReply,
      category: sample.category || 'Stock and variants'
    });
    setIsSampleModalOpen(true);
  };

  const handleSaveSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleForm.customerMessage.trim() || !sampleForm.preferredReply.trim() || savingSample) return;
    setSavingSample(true);
    try {
      if (editingSample) {
        await onUpdateSample(editingSample.id, sampleForm);
      } else {
        await onAddSample(sampleForm);
      }
      setIsSampleModalOpen(false);
    } finally {
      setSavingSample(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Health and Master Switch */}
      <section
        aria-label="AI Provider Health and Operating Status"
        className="bg-[#181810] border border-[#393426] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-[#C9A227] font-bold">
              {lang === 'my' ? 'AI အရောင်းအကူ ကွပ်ကဲရေး' : 'Sales Agent Control Center'}
            </span>
            <span className="text-[10px] bg-[#1E1D14] text-[#E0BD55] px-2 py-0.5 rounded-full font-mono border border-[#393426]">
              Groq Cloud Only
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#F5F2E8]">
            {lang === 'my' ? 'Groq AI အရောင်းကိုယ်စားလှယ်' : 'Groq AI Sales Representative'}
          </h2>
          <div className="flex items-center gap-3 text-xs text-[#817D70] font-mono pt-0.5">
            <span>Model: {aiHealth?.model || 'openai/gpt-oss-120b'}</span>
            <span>·</span>
            <span className={aiHealth?.configured ? 'text-[#65B985] font-semibold' : 'text-[#E06B61]'}>
              Status: {aiHealth?.configured ? 'Operational' : 'API Key Missing'}
            </span>
          </div>
        </div>

        {/* Master AI Enable Toggle */}
        <div className="flex items-center gap-3 bg-[#11110D] border border-[#393426] p-2.5 px-4 rounded-xl">
          <div className="text-right">
            <span className="text-xs font-bold text-[#F5F2E8] block">
              {config?.enabled
                ? (lang === 'my' ? 'အလိုအလျောက်ဖွင့်ထားသည်' : 'Agent Active')
                : (lang === 'my' ? 'ယာယီရပ်ဆိုင်းထားသည်' : 'Agent Paused')}
            </span>
            <span className="text-[11px] text-[#817D70]">
              {config?.enabled
                ? (lang === 'my' ? 'ဖောက်သည်အား ဖြေကြားနေသည်' : 'Answering customer queries')
                : (lang === 'my' ? 'ဖောက်သည်ထံ စာမပြန်ပါ' : 'No automated responses')}
            </span>
          </div>

          <button
            type="button"
            disabled={savingConfig}
            onClick={handleToggleAi}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              config?.enabled ? 'bg-[#C9A227]' : 'bg-[#393426]'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-[#0B0B09] transition-transform ${
                config?.enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Strict Operating Policies (Authoritative Backend Rules) */}
      <section aria-label="Operating Rules & Merchant Policies" className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#B9B5A7]">
          {lang === 'my' ? 'တင်းကျပ်သော လုပ်ငန်းလည်ပတ်မှု စည်းမျဉ်းများ' : 'Authoritative Operating Policies'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="bg-[#181810] border border-[#393426] p-4 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#C9A227] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-[#F5F2E8]">
                {lang === 'my' ? '၁။ စျေးနှုန်းအတည်ပြု စည်းမျဉ်း' : '1. Authoritative Pricing Integrity'}
              </h4>
              <p className="text-[#B9B5A7] leading-relaxed">
                {lang === 'my'
                  ? 'AI သည် ဆာဗာ Database ထဲရှိ အတည်ပြုပြီး စျေးနှုန်းများကိုသာ တင်းကျပ်စွာ အသုံးပြုရမည်။ စျေးနှုန်းနှင့် လျှော့စျေးများကို လုပ်ကြံဖန်တီးခွင့် မရှိပါ။'
                  : 'AI strictly enforces database catalog prices. Unauthorized discounts or fabricated prices are automatically blocked.'}
              </p>
            </div>
          </div>

          <div className="bg-[#181810] border border-[#393426] p-4 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#65B985] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-[#F5F2E8]">
                {lang === 'my' ? '၂။ စတော့လက်ကျန် စစ်ဆေးမှု စည်းမျဉ်း' : '2. Real Stock Verification'}
              </h4>
              <p className="text-[#B9B5A7] leading-relaxed">
                {lang === 'my'
                  ? 'ပစ္စည်းရရှိနိုင်မှု မဖြေကြားမီ Database ရှိ Variant အလိုက် စတော့ကို အမြဲတမ်း စစ်ဆေးရမည်။ လက်ကျန်ပြတ်နေပါက မှန်ကန်စွာ ရှင်းပြရမည်။'
                  : 'Variant stock is verified before promising availability. Out of stock items must be honestly communicated to customers.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Behavior & Custom Instructions Configuration Form */}
      <section aria-label="AI Personality and Handoff Rules" className="bg-[#181810] border border-[#393426] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#393426] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#F5F2E8]">
              {lang === 'my' ? 'AI အရောင်းဟန်ပန်နှင့် ညွှန်ကြားချက်များ' : 'Sales Behavior & Custom Instructions'}
            </h3>
            <p className="text-xs text-[#817D70]">
              {lang === 'my' ? 'ဖောက်သည်အား ပြန်လည်ဖြေကြားမည့် ပုံစံကို စိတ်ကြိုက်သတ်မှတ်ပါ' : 'Configure tone, language, and human escalation triggers.'}
            </p>
          </div>

          {configSaveSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-[#65B985] font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{lang === 'my' ? 'သိမ်းဆည်းပြီးပါပြီ' : 'Saved'}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSavePolicies} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#B9B5A7] font-semibold mb-1">
                {lang === 'my' ? 'တုံ့ပြန်မည့် ဘာသာစကား' : 'Response Language'}
              </label>
              <select
                value={preferredLang}
                onChange={(e) => setPreferredLang(e.target.value)}
                className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
              >
                <option value="myanmar">မြန်မာဘာသာ (Myanmar)</option>
                <option value="english">English</option>
              </select>
            </div>

            <div>
              <label className="block text-[#B9B5A7] font-semibold mb-1">
                {lang === 'my' ? 'စကားပြောဟန်ပန် (Reply Style)' : 'Reply Style'}
              </label>
              <select
                value={replyStyle}
                onChange={(e) => setReplyStyle(e.target.value)}
                className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
              >
                <option value="friendly">ဖော်ရွေသော အရောင်းပုံစံ (Friendly & Polite)</option>
                <option value="formal">လေးနက်ယဉ်ကျေးသော ပုံစံ (Formal & Professional)</option>
                <option value="concise">တိုတိုနှင့် လိုရင်းရှင်းသော ပုံစံ (Concise & Direct)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#B9B5A7] font-semibold mb-1">
              {lang === 'my' ? 'စတိုးအတွက် သီးသန့် ညွှန်ကြားချက်များ (Custom Prompt Instructions)' : 'Custom Prompt Instructions'}
            </label>
            <textarea
              rows={4}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Always greet warmly, verify stock from database, guide customer to order via KBZPay..."
              className="w-full bg-[#11110D] border border-[#393426] rounded-xl p-3 text-[#F5F2E8] placeholder-[#817D70] focus:border-[#C9A227] focus:outline-none leading-relaxed"
            />
          </div>

          {/* Human Escalation Triggers */}
          <div className="pt-2 border-t border-[#393426]">
            <span className="text-xs font-bold text-[#E0BD55] block mb-2">
              {lang === 'my' ? 'လူထံသို့ အလိုအလျောက် လွှဲပြောင်းရမည့် အခြေအနေများ (Handoff Triggers)' : 'Human Escalation Triggers'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label className="flex items-center gap-2 bg-[#11110D] p-2.5 rounded-xl border border-[#393426] cursor-pointer">
                <input
                  type="checkbox"
                  checked={handoffUncertain}
                  onChange={(e) => setHandoffUncertain(e.target.checked)}
                  className="rounded text-[#C9A227] focus:ring-0"
                />
                <span className="text-xs text-[#B9B5A7]">
                  {lang === 'my' ? 'မသေချာသော မေးခွန်းများ' : 'Uncertain questions'}
                </span>
              </label>

              <label className="flex items-center gap-2 bg-[#11110D] p-2.5 rounded-xl border border-[#393426] cursor-pointer">
                <input
                  type="checkbox"
                  checked={handoffComplaint}
                  onChange={(e) => setHandoffComplaint(e.target.checked)}
                  className="rounded text-[#C9A227] focus:ring-0"
                />
                <span className="text-xs text-[#B9B5A7]">
                  {lang === 'my' ? 'တိုင်ကြားမှု / မကျေနပ်မှု' : 'Customer complaints'}
                </span>
              </label>

              <label className="flex items-center gap-2 bg-[#11110D] p-2.5 rounded-xl border border-[#393426] cursor-pointer">
                <input
                  type="checkbox"
                  checked={handoffHumanReq}
                  onChange={(e) => setHandoffHumanReq(e.target.checked)}
                  className="rounded text-[#C9A227] focus:ring-0"
                />
                <span className="text-xs text-[#B9B5A7]">
                  {lang === 'my' ? 'လူနှင့်ပြောရန် တောင်းဆိုမှု' : 'Human staff requested'}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-5 py-2.5 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingConfig ? (lang === 'my' ? 'သိမ်းဆည်းနေသည်...' : 'Saving...') : (lang === 'my' ? 'စည်းမျဉ်းများ သိမ်းဆည်းမည်' : 'Save Policies')}</span>
            </button>
          </div>
        </form>
      </section>

      {/* AI Reply Simulation & Live Playground (Clearly Identified as Simulation) */}
      <section aria-label="AI Reply Simulation Playground" className="bg-[#181810] border border-[#393426] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#393426] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C9A227]" />
              <h3 className="text-base font-bold text-[#F5F2E8]">
                {lang === 'my' ? 'AI တုံ့ပြန်မှု စမ်းသပ်ခန်း (AI Simulation Preview)' : 'AI Simulation Preview'}
              </h3>
            </div>
            <p className="text-xs text-[#817D70] mt-0.5">
              {lang === 'my'
                ? 'စမ်းသပ်မှုသက်သက်သာဖြစ်သည် — ဖောက်သည်ထံ စာမပို့ပါ၊ အော်ဒါမတင်ပါ၊ စတော့မနုတ်ပါ။'
                : 'Isolated simulation only — Does not message real customers, create orders, or modify inventory.'}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchSuggestions}
            disabled={suggestionsLoading}
            className="text-xs text-[#C9A227] hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{suggestionsLoading ? (lang === 'my' ? 'မေးခွန်းထုတ်နေသည်...' : 'Generating...') : (lang === 'my' ? 'မေးခွန်းအသစ်များ ထုတ်ယူမည်' : 'Generate Suggestions')}</span>
          </button>
        </div>

        {/* Dynamic Suggested Questions */}
        {suggestions.length > 0 && (
          <div className="bg-[#11110D] border border-[#393426] p-3 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-[#A88419] uppercase tracking-wider block">
              {lang === 'my' ? 'စတိုး ကုန်ပစ္စည်းများမှ ထုတ်လုပ်ထားသော အကြံပြုမေးခွန်းများ' : 'Catalog-Aware Sample Questions'}
            </span>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRunPreview(q)}
                  className="text-left text-xs bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#F5F2E8] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Query Input and Test Trigger */}
        <div className="flex gap-2">
          <input
            type="text"
            value={previewInput}
            onChange={(e) => setPreviewInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunPreview()}
            placeholder={lang === 'my' ? 'စမ်းသပ်မည့် ဖောက်သည်မေးခွန်း ရိုက်ထည့်ပါ (ဥပမာ- T-shirt စျေးဘယ်လောက်လဲ)...' : 'Type a test customer message (e.g. Is jacket in stock?)...'}
            className="flex-1 bg-[#11110D] border border-[#393426] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2E8] placeholder-[#817D70] focus:border-[#C9A227] focus:outline-none"
          />
          <button
            type="button"
            disabled={!previewInput.trim() || previewLoading}
            onClick={() => handleRunPreview()}
            className="px-5 py-2.5 bg-[#C9A227] hover:bg-[#A88419] disabled:opacity-50 text-[#0B0B09] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Zap className="w-4 h-4" />
            <span>{previewLoading ? (lang === 'my' ? 'စစ်ဆေးနေသည်...' : 'Testing...') : (lang === 'my' ? 'စမ်းသပ်မည်' : 'Test AI Reply')}</span>
          </button>
        </div>

        {/* Preview Output Box */}
        {previewError && (
          <div className="p-3 bg-[#E06B61]/10 border border-[#E06B61]/40 rounded-xl text-xs text-[#E06B61]">
            {previewError}
          </div>
        )}

        {previewOutput && (
          <div className="bg-[#11110D] border border-[#C9A227]/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[#A88419] font-mono">
              <span>Groq Response (Verified Against Real Inventory)</span>
              <span>Simulation Result</span>
            </div>
            <p className="text-xs text-[#F5F2E8] whitespace-pre-wrap leading-relaxed">
              {previewOutput}
            </p>
          </div>
        )}
      </section>

      {/* Sample Replies CRUD */}
      <section aria-label="Sample Replies Management" className="bg-[#181810] border border-[#393426] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#393426] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#F5F2E8]">
              {lang === 'my' ? 'နမူနာ အဖြေများ (Sample Replies)' : 'Sample Replies for Tone Guidance'}
            </h3>
            <p className="text-xs text-[#817D70]">
              {lang === 'my' ? 'AI သည် ဤနမူနာများကို အခြေခံ၍ သင့်စတိုး၏ စကားပြောဟန်ပန်ကို အတုယူပါမည်' : 'Few-shot examples providing tone and formatting guidelines.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddSample}
            className="px-3 py-1.5 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-xs font-semibold text-[#C9A227] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'my' ? 'နမူနာအသစ်ထည့်' : 'Add Sample'}</span>
          </button>
        </div>

        {samples.length === 0 ? (
          <p className="text-center text-xs text-[#817D70] py-6">
            {lang === 'my' ? 'နမူနာအဖြေများ မထည့်ရသေးပါ' : 'No sample replies configured yet.'}
          </p>
        ) : (
          <div className="divide-y divide-[#393426]">
            {samples.map((sample) => (
              <div key={sample.id} className="py-3 flex items-start justify-between gap-3">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-[#11110D] border border-[#393426] text-[#A88419] px-2 py-0.5 rounded-full font-mono">
                      {sample.category}
                    </span>
                    <span className="font-semibold text-[#F5F2E8]">
                      Q: "{sample.customerMessage}"
                    </span>
                  </div>
                  <p className="text-[#B9B5A7] pl-2 border-l border-[#C9A227]/40 whitespace-pre-wrap">
                    A: {sample.preferredReply}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditSample(sample)}
                    className="p-1.5 hover:bg-[#1E1D14] rounded-lg text-[#B9B5A7] hover:text-[#C9A227] cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSample(sample.id)}
                    className="p-1.5 hover:bg-[#1E1D14] rounded-lg text-[#817D70] hover:text-[#E06B61] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sample Modal */}
      {isSampleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181810] border border-[#393426] rounded-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-base font-bold text-[#F5F2E8]">
              {editingSample ? (lang === 'my' ? 'နမူနာအဖြေ ပြင်ဆင်ရန်' : 'Edit Sample Reply') : (lang === 'my' ? 'နမူနာအဖြေ အသစ်ထည့်ရန်' : 'Add Sample Reply')}
            </h3>

            <form onSubmit={handleSaveSample} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#B9B5A7] font-semibold mb-1">
                  {lang === 'my' ? 'အမျိုးအစား' : 'Category'}
                </label>
                <input
                  type="text"
                  value={sampleForm.category}
                  onChange={(e) => setSampleForm({ ...sampleForm, category: e.target.value })}
                  placeholder="e.g. Price, Delivery, Stock"
                  className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#B9B5A7] font-semibold mb-1">
                  {lang === 'my' ? 'ဖောက်သည် မေးမည့်စကား' : 'Customer Message'} *
                </label>
                <input
                  type="text"
                  required
                  value={sampleForm.customerMessage}
                  onChange={(e) => setSampleForm({ ...sampleForm, customerMessage: e.target.value })}
                  placeholder="e.g. စျေးနှုန်းဘယ်လောက်လဲ"
                  className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#B9B5A7] font-semibold mb-1">
                  {lang === 'my' ? 'လိုလားသော အဖြေပုံစံ' : 'Preferred Reply'} *
                </label>
                <textarea
                  rows={3}
                  required
                  value={sampleForm.preferredReply}
                  onChange={(e) => setSampleForm({ ...sampleForm, preferredReply: e.target.value })}
                  placeholder="e.g. မင်္ဂလာပါရှင်၊ စျေးနှုန်းကတော့..."
                  className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] focus:border-[#C9A227] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSampleModalOpen(false)}
                  className="px-4 py-2 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#B9B5A7] rounded-xl font-semibold"
                >
                  {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={savingSample}
                  className="px-4 py-2 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] rounded-xl font-bold"
                >
                  {savingSample ? 'Saving...' : (lang === 'my' ? 'သိမ်းမည်' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
