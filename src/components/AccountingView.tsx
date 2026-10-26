import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Search,
  Plus,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Receipt,
  PieChart,
  FileText,
  Clock,
  Trash2,
  Edit2,
  X,
  CreditCard,
  Building2,
  Wallet
} from 'lucide-react';
import { AccountingEntry, FinancialSummary, Product } from '../types';

interface AccountingViewProps {
  lang: 'my' | 'en';
  getHeaders: () => Record<string, string>;
  products: Product[];
  onNavigateToInventory?: () => void;
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  lang,
  getHeaders,
  products,
  onNavigateToInventory
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'reports'>('overview');
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  // Data
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters for Transactions
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // Modal State for New / Edit Entry
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<AccountingEntry | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'expense' as 'income' | 'expense',
    category: 'cost_of_goods',
    amount: '',
    paymentMethod: 'Cash',
    description: '',
    orderId: ''
  });
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reconcile State
  const [reconciling, setReconciling] = useState<boolean>(false);

  // Format currency helper
  const formatMMK = (amount: number | null | undefined): string => {
    const val = Number(amount) || 0;
    return `${val.toLocaleString()} MMK`;
  };

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      let url = `/api/accounting/summary?range=${range}`;
      if (range === 'custom' && customStartDate && customEndDate) {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to fetch financial summary');
      }
      const data: FinancialSummary = await res.json();
      setSummary(data);
    } catch (err: any) {
      console.error('Error fetching summary:', err);
      setError(err.message || 'Error loading financial summary');
    }
  }, [range, customStartDate, customEndDate, getHeaders]);

  // Fetch entries
  const fetchEntries = useCallback(async () => {
    try {
      let url = `/api/accounting/entries?page=${page}&limit=${limit}`;
      if (filterType !== 'all') url += `&type=${filterType}`;
      if (filterCategory !== 'all') url += `&category=${filterCategory}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      if (range === 'custom' && customStartDate && customEndDate) {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }

      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to fetch accounting entries');
      }
      const data = await res.json();
      setEntries(data.entries || []);
      setTotalCount(data.totalCount || 0);
    } catch (err: any) {
      console.error('Error fetching entries:', err);
    }
  }, [page, filterType, filterCategory, searchQuery, range, customStartDate, customEndDate, getHeaders]);

  // Reload all
  const reloadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchSummary(), fetchEntries()]);
    setLoading(false);
  }, [fetchSummary, fetchEntries]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // Open modal for new entry
  const handleOpenCreateModal = () => {
    setEditingEntry(null);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      type: 'expense',
      category: 'cost_of_goods',
      amount: '',
      paymentMethod: 'Cash',
      description: '',
      orderId: ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (entry: AccountingEntry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date || new Date().toISOString().slice(0, 10),
      type: entry.type,
      category: entry.category,
      amount: String(entry.amount),
      paymentMethod: entry.paymentMethod || 'Cash',
      description: entry.description || '',
      orderId: entry.orderId || ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit entry form
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    const amountNum = Number(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError(lang === 'my' ? 'ငွေပမာဏကို မှန်ကန်စွာ ထည့်သွင်းပါ' : 'Please enter a valid positive amount');
      setFormSubmitting(false);
      return;
    }

    try {
      const isEdit = !!editingEntry;
      const url = isEdit ? `/api/accounting/entries/${editingEntry.id}` : '/api/accounting/entries';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({
          ...formData,
          amount: amountNum
        })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to save entry');
      }

      setIsModalOpen(false);
      setSuccessMessage(
        isEdit
          ? (lang === 'my' ? 'စာရင်း အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ' : 'Entry updated successfully')
          : (lang === 'my' ? 'စာရင်း အသစ် အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ' : 'Entry added successfully')
      );
      setTimeout(() => setSuccessMessage(null), 3500);
      await reloadData();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete entry
  const handleDeleteEntry = async (id: string) => {
    const confirmText = lang === 'my' ? 'ဤစာရင်းမှတ်တမ်းကို ဖျက်ရန် သေချာပါသလား?' : 'Are you sure you want to delete this entry?';
    if (!window.confirm(confirmText)) return;

    try {
      const res = await fetch(`/api/accounting/entries/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to delete entry');
      }
      setSuccessMessage(lang === 'my' ? 'စာရင်း ဖျက်ပြီးပါပြီ' : 'Entry deleted');
      setTimeout(() => setSuccessMessage(null), 3000);
      await reloadData();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  // Auto-reconcile with orders
  const handleReconcileOrders = async () => {
    setReconciling(true);
    try {
      const res = await fetch('/api/accounting/reconcile-orders', {
        method: 'POST',
        headers: getHeaders()
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Reconciliation failed');
      }
      const data = await res.json();
      setSuccessMessage(
        lang === 'my'
          ? `အော်ဒါစာရင်း ${data.totalOrders} ခုနှင့် ချိန်ညှိပြီးပါပြီ (${data.syncedCount} ခု အသစ်ပေါင်းထည့်ထားပါသည်)`
          : `Reconciled with ${data.totalOrders} orders (${data.syncedCount} new added)`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      await reloadData();
    } catch (err: any) {
      alert(err.message || 'Reconciliation failed');
    } finally {
      setReconciling(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    window.location.href = '/api/accounting/export';
  };

  // Category labels helper
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, { my: string; en: string }> = {
      cost_of_goods: { my: 'ကုန်ပစ္စည်းဝယ်ရင်းစရိတ် (COGS)', en: 'Cost of Goods (COGS)' },
      delivery: { my: 'ပို့ဆောင်ခစရိတ် (Delivery)', en: 'Delivery & Shipping' },
      advertising: { my: 'ကြော်ငြာစရိတ် (Ads/Marketing)', en: 'Advertising & Marketing' },
      rent: { my: 'ဆိုင်ခန်းငှားရမ်းခ (Rent)', en: 'Store Rent' },
      salaries: { my: 'ဝန်ထမ်းလစာ (Salaries)', en: 'Salaries & Wages' },
      utilities: { my: 'မီး/ရေ/အင်တာနက် (Utilities)', en: 'Utilities & Internet' },
      packaging: { my: 'ထုပ်ပိုးပစ္စည်းစရိတ် (Packaging)', en: 'Packaging Materials' },
      sales_revenue: { my: 'အရောင်းရငွေ (Sales Revenue)', en: 'Sales Revenue' },
      service_fee: { my: 'ဝန်ဆောင်ခဝင်ငွေ (Service Fee)', en: 'Service Income' },
      other_income: { my: 'အခြားဝင်ငွေ (Other Income)', en: 'Other Income' },
      other_expense: { my: 'အခြားအထွေထွေစရိတ် (Other Expense)', en: 'Other Expenses' }
    };
    return labels[category] ? (lang === 'my' ? labels[category].my : labels[category].en) : category;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#CBD5E1] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
                {lang === 'my' ? 'စာရင်းကိုင်နှင့် ဘဏ္ဍာရေး' : 'Accounting & Financials'}
              </h1>
              <p className="text-xs text-[#64748B]">
                {lang === 'my'
                  ? 'ဝင်ငွေ၊ ထွက်ငွေ၊ ရောင်းရကုန်ကျစရိတ် (COGS) နှင့် အသားတင်အမြတ်အစွန်း မှတ်တမ်း'
                  : 'Real revenue, expenses, cost of goods sold, profit/loss, and receivables'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReconcileOrders}
            disabled={reconciling}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title={lang === 'my' ? 'အော်ဒါများမှ စာရင်းအလိုအလျောက် ချိန်ညှိမည်' : 'Sync verified sales from orders'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
            <span>{lang === 'my' ? 'အော်ဒါများနှင့် ချိန်ညှိမည်' : 'Reconcile Orders'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            title={lang === 'my' ? 'CSV ဖိုင်အဖြစ် ဒေါင်းလုဒ်ရယူမည်' : 'Export to CSV'}
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>{lang === 'my' ? 'CSV ရယူမည်' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'my' ? 'စာရင်းအသစ် ထည့်မည်' : 'New Entry'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={reloadData} className="font-bold underline cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Date Filter Bar & Primary View Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#CBD5E1] shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white text-[#2563EB] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'my' ? 'ဘဏ္ဍာရေး အနှစ်ချုပ်' : 'Overview'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-white text-[#2563EB] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'my' ? 'စာရင်းမှတ်တမ်းများ' : 'Transactions'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-white text-[#2563EB] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {lang === 'my' ? 'အစီရင်ခံစာများ' : 'Reports'}
          </button>
        </div>

        {/* Date Range Segmented Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-medium mr-1 hidden sm:inline">
            {lang === 'my' ? 'ကာလ:' : 'Range:'}
          </span>
          <button
            type="button"
            onClick={() => setRange('today')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
              range === 'today' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'my' ? 'ယနေ့' : 'Today'}
          </button>
          <button
            type="button"
            onClick={() => setRange('week')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
              range === 'week' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'my' ? 'ဒီအပတ်' : 'This Week'}
          </button>
          <button
            type="button"
            onClick={() => setRange('month')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
              range === 'month' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'my' ? 'ဒီလ' : 'This Month'}
          </button>
          <button
            type="button"
            onClick={() => setRange('custom')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
              range === 'custom' ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'my' ? 'စိတ်ကြိုက်' : 'Custom'}
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker when selected */}
      {range === 'custom' && (
        <div className="p-4 bg-white border border-[#CBD5E1] rounded-2xl flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">{lang === 'my' ? 'မှ:' : 'From:'}</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">{lang === 'my' ? 'ထိ:' : 'To:'}</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <button
            type="button"
            onClick={fetchSummary}
            className="px-3 py-1.5 bg-[#2563EB] text-white text-xs font-semibold rounded-lg hover:bg-[#1D4ED8] cursor-pointer"
          >
            {lang === 'my' ? 'ကြည့်ရှုမည်' : 'Apply'}
          </button>
        </div>
      )}

      {/* Limitation Disclosure Banner (if some products lack purchase cost) */}
      {summary && summary.missingCostPricesCount > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 text-xs text-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {lang === 'my' ? 'ဝယ်ရင်းစရိတ် အချက်အလက် သတိပေးချက်' : 'Product Cost Basis Notice'}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                {lang === 'my'
                  ? `ရောင်းချပြီးသော ပစ္စည်းများအနက် ${summary.missingCostPricesCount} ခုတွင် ဝယ်ရင်းစရိတ် (Cost Price) မသတ်မှတ်ရသေးပါ။ COGS ကို စာရင်းသွင်းထားသော စရိတ်များဖြင့်သာ တွက်ချက်ထားပါသည်။ ပိုမိုတိကျစေရန် စတော့စာမျက်နှာတွင် ကုန်ပစ္စည်းဝယ်ရင်းစျေး ထည့်သွင်းနိုင်ပါသည်။`
                  : `${summary.missingCostPricesCount} sold items lack an explicit cost price basis. COGS is derived from recorded costs. Configure product cost price in Inventory for full margin fidelity.`}
              </p>
            </div>
          </div>
          {onNavigateToInventory && (
            <button
              type="button"
              onClick={onNavigateToInventory}
              className="shrink-0 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer"
            >
              {lang === 'my' ? 'စတော့သို့ သွားမည်' : 'Go to Inventory'}
            </button>
          )}
        </div>
      )}

      {/* TAB 1: EXECUTIVE FINANCIAL OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 4 Primary Financial Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sales Revenue */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {lang === 'my' ? 'ရောင်းရငွေ စုစုပေါင်း' : 'Total Sales Revenue'}
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-[#0F172A]">
                {formatMMK(summary?.salesRevenue)}
              </div>
              <div className="text-[11px] text-slate-500">
                <span>{summary?.orderCount || 0} {lang === 'my' ? 'အော်ဒါများမှ ရငွေ' : 'orders in period'}</span>
              </div>
            </div>

            {/* Cash Actually Received */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {lang === 'my' ? 'လက်ခံရရှိငွေ အမှန်' : 'Cash Received'}
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-emerald-600">
                {formatMMK(summary?.cashReceived)}
              </div>
              <div className="text-[11px] text-slate-500">
                <span>{lang === 'my' ? 'အတည်ပြုပြီးသော ရငွေ အစစ်အမှန်' : 'Verified confirmed payments'}</span>
              </div>
            </div>

            {/* Outstanding Receivables */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {lang === 'my' ? 'ရရန်ကျန်ငွေ (Receivables)' : 'Outstanding Receivables'}
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-amber-600">
                {formatMMK(summary?.receivables)}
              </div>
              <div className="text-[11px] text-slate-500">
                <span>{lang === 'my' ? 'ငွေပေးချေရန် ကျန်ရှိနေသေးသော အော်ဒါများ' : 'Pending payment collection'}</span>
              </div>
            </div>

            {/* Net Profit / Loss */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {lang === 'my' ? 'အသားတင် အမြတ်/အရှုံး' : 'Net Profit / Loss'}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  (summary?.netProfit || 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>
                  {(summary?.netProfit || 0) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
              </div>
              <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
                (summary?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}>
                {formatMMK(summary?.netProfit)}
              </div>
              <div className="text-[11px] text-slate-500">
                <span>{lang === 'my' ? 'စရိတ်အားလုံး နုတ်ပြီး အသားတင်' : 'Gross profit minus operating costs'}</span>
              </div>
            </div>
          </div>

          {/* Secondary Financial Calculation Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* COGS and Gross Profit Card */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {lang === 'my' ? 'ကုန်ကျစရိတ်နှင့် အကြမ်းဖျင်းအမြတ်' : 'COGS & Gross Margin'}
                </h3>
                <Building2 className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{lang === 'my' ? 'ရောင်းရငွေ (Sales Revenue):' : 'Recognized Sales:'}</span>
                  <span className="font-mono font-semibold text-slate-800">{formatMMK(summary?.salesRevenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{lang === 'my' ? 'ကုန်ကျစရိတ် (COGS):' : 'Cost of Goods (COGS):'}</span>
                  <span className="font-mono font-semibold text-red-600">- {formatMMK(summary?.cogs)}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-bold text-sm">
                  <span>{lang === 'my' ? 'အကြမ်းဖျင်း အမြတ် (Gross Profit):' : 'Gross Profit:'}</span>
                  <span className="font-mono text-emerald-700">{formatMMK(summary?.grossProfit)}</span>
                </div>
              </div>
            </div>

            {/* Operating Expenses Breakdown */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {lang === 'my' ? 'လုပ်ငန်းလည်ပတ်စရိတ်များ' : 'Operating Expenses'}
                </h3>
                <CreditCard className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{lang === 'my' ? 'အကြမ်းဖျင်း အမြတ်:' : 'Gross Profit:'}</span>
                  <span className="font-mono font-semibold text-slate-800">{formatMMK(summary?.grossProfit)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{lang === 'my' ? 'လည်ပတ်စရိတ် (Operating Expenses):' : 'Operating Expenses:'}</span>
                  <span className="font-mono font-semibold text-red-600">- {formatMMK(summary?.operatingExpenses)}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-bold text-sm">
                  <span>{lang === 'my' ? 'အသားတင် အမြတ်/အရှုံး:' : 'Net Profit / Loss:'}</span>
                  <span className={`font-mono ${(summary?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatMMK(summary?.netProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cash Flow Health */}
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {lang === 'my' ? 'ငွေစီးဆင်းမှု (Cash Flow)' : 'Cash Flow Health'}
                </h3>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{lang === 'my' ? 'ငွေဝင် (Inflows):' : 'Cash Inflows:'}</span>
                  <span className="font-mono font-semibold text-emerald-600">+ {formatMMK(summary?.cashInflows)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{lang === 'my' ? 'ငွေထွက် (Outflows):' : 'Cash Outflows:'}</span>
                  <span className="font-mono font-semibold text-red-600">- {formatMMK(summary?.cashOutflows)}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-bold text-sm">
                  <span>{lang === 'my' ? 'ငွေစီးဆင်းမှု အသားတင်:' : 'Net Cash Flow:'}</span>
                  <span className={`font-mono ${(summary?.netCashFlow || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatMMK(summary?.netCashFlow)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent 5 Transactions Snapshot */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {lang === 'my' ? 'လတ်တလော စာရင်းမှတ်တမ်းများ' : 'Recent Accounting Records'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'my' ? 'နောက်ဆုံးထည့်သွင်းထားသော စာရင်းများ' : 'Latest verified entries'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('transactions')}
                className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold cursor-pointer"
              >
                {lang === 'my' ? 'အားလုံးကြည့်မည် →' : 'View All →'}
              </button>
            </div>

            {entries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{lang === 'my' ? 'စာရင်းမှတ်တမ်းများ မရှိသေးပါ' : 'No transactions recorded yet'}</p>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="mt-3 px-3 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-lg"
                >
                  {lang === 'my' ? '+ ပထမဆုံး စာရင်းထည့်မည်' : '+ Add First Entry'}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {entries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        entry.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {entry.type === 'income' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">
                          {entry.description || getCategoryLabel(entry.category)}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{entry.date}</span>
                          <span>·</span>
                          <span>{getCategoryLabel(entry.category)}</span>
                          <span>·</span>
                          <span>{entry.paymentMethod}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`font-mono font-bold text-right shrink-0 ${
                      entry.type === 'income' ? 'text-emerald-700' : 'text-slate-800'
                    }`}>
                      {entry.type === 'income' ? '+' : '-'} {formatMMK(entry.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED TRANSACTIONS LIST */}
      {activeTab === 'transactions' && (
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={lang === 'my' ? 'စာရင်းရှာဖွေရန်...' : 'Search transactions...'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none"
              >
                <option value="all">{lang === 'my' ? 'အမျိုးအစား အားလုံး' : 'All Types'}</option>
                <option value="income">{lang === 'my' ? 'ဝင်ငွေ (Income)' : 'Income'}</option>
                <option value="expense">{lang === 'my' ? 'ထွက်ငွေ (Expense)' : 'Expense'}</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none"
              >
                <option value="all">{lang === 'my' ? 'ကဏ္ဍ အားလုံး' : 'All Categories'}</option>
                <option value="cost_of_goods">{lang === 'my' ? 'ကုန်ပစ္စည်းဝယ်ရင်းစရိတ်' : 'Cost of Goods'}</option>
                <option value="delivery">{lang === 'my' ? 'ပို့ဆောင်ခစရိတ်' : 'Delivery'}</option>
                <option value="advertising">{lang === 'my' ? 'ကြော်ငြာစရိတ်' : 'Advertising'}</option>
                <option value="rent">{lang === 'my' ? 'ဆိုင်ခန်းငှားရမ်းခ' : 'Rent'}</option>
                <option value="salaries">{lang === 'my' ? 'ဝန်ထမ်းလစာ' : 'Salaries'}</option>
                <option value="utilities">{lang === 'my' ? 'မီး/ရေ/အင်တာနက်' : 'Utilities'}</option>
                <option value="packaging">{lang === 'my' ? 'ထုပ်ပိုးစရိတ်' : 'Packaging'}</option>
                <option value="sales_revenue">{lang === 'my' ? 'အရောင်းရငွေ' : 'Sales Revenue'}</option>
                <option value="other_income">{lang === 'my' ? 'အခြားဝင်ငွေ' : 'Other Income'}</option>
                <option value="other_expense">{lang === 'my' ? 'အခြားစရိတ်' : 'Other Expense'}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {entries.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-semibold text-slate-600">
                {lang === 'my' ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော စာရင်းမှတ်တမ်း မရှိပါ' : 'No transactions match your criteria'}
              </p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="mt-4 px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                {lang === 'my' ? '+ စာရင်းမှတ်တမ်းအသစ် ထည့်မည်' : '+ Add New Transaction'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-3">{lang === 'my' ? 'ရက်စွဲ' : 'Date'}</th>
                    <th className="py-3 px-3">{lang === 'my' ? 'အမျိုးအစား' : 'Type'}</th>
                    <th className="py-3 px-3">{lang === 'my' ? 'ကဏ္ဍ' : 'Category'}</th>
                    <th className="py-3 px-3">{lang === 'my' ? 'ဖော်ပြချက်' : 'Description'}</th>
                    <th className="py-3 px-3">{lang === 'my' ? 'ငွေပေးချေမှု' : 'Method'}</th>
                    <th className="py-3 px-3 text-right">{lang === 'my' ? 'ပမာဏ' : 'Amount'}</th>
                    <th className="py-3 px-3 text-right">{lang === 'my' ? 'လုပ်ဆောင်ချက်' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`font-semibold ${
                          entry.type === 'income' ? 'text-emerald-700' : 'text-red-600'
                        }`}>
                          {entry.type === 'income' ? (lang === 'my' ? 'ဝင်ငွေ' : 'Income') : (lang === 'my' ? 'ထွက်ငွေ' : 'Expense')}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-700 font-medium">
                        {getCategoryLabel(entry.category)}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={entry.description}>
                        {entry.description || '-'}
                        {entry.orderId && (
                          <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                            Order: #{entry.orderId}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {entry.paymentMethod}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                        entry.type === 'income' ? 'text-emerald-700' : 'text-slate-900'
                      }`}>
                        {entry.type === 'income' ? '+' : '-'} {formatMMK(entry.amount)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(entry)}
                            className="p-1.5 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg cursor-pointer"
                            title={lang === 'my' ? 'ပြင်ဆင်မည်' : 'Edit'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            title={lang === 'my' ? 'ဖျက်မည်' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalCount > limit && (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                {lang === 'my' ? `စုစုပေါင်း ${totalCount} ခုအနက်` : `Total ${totalCount} records`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-slate-100 rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  {lang === 'my' ? 'ရှေ့သို့' : 'Previous'}
                </button>
                <span>Page {page} of {Math.ceil(totalCount / limit)}</span>
                <button
                  type="button"
                  disabled={page >= Math.ceil(totalCount / limit)}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 bg-slate-100 rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  {lang === 'my' ? 'နောက်သို့' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CATEGORY & PROFIT/LOSS REPORTS */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Profit & Loss Summary */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#0F172A]">
                {lang === 'my' ? 'အမြတ်အစွန်း ရှင်းတမ်း (P&L Summary)' : 'Profit & Loss Statement'}
              </h3>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-700">
                  {lang === 'my' ? '၁။ စုစုပေါင်း အရောင်းရငွေ (Gross Revenue)' : '1. Gross Sales Revenue'}
                </span>
                <span className="font-mono font-bold text-slate-900">{formatMMK(summary?.salesRevenue)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50 pl-3 text-red-600">
                <span>{lang === 'my' ? 'နုတ်: ရောင်းရကုန်ကျစရိတ် (Less: COGS)' : 'Less: Cost of Goods Sold'}</span>
                <span className="font-mono font-semibold">- {formatMMK(summary?.cogs)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 bg-slate-50/50 px-2 rounded font-bold">
                <span className="text-slate-800">
                  {lang === 'my' ? '၂။ အကြမ်းဖျင်း အမြတ် (Gross Profit)' : '2. Gross Profit'}
                </span>
                <span className="font-mono text-emerald-700">{formatMMK(summary?.grossProfit)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50 pl-3 text-red-600">
                <span>{lang === 'my' ? 'နုတ်: လုပ်ငန်းလည်ပတ်စရိတ်များ (Operating Expenses)' : 'Less: Operating Expenses'}</span>
                <span className="font-mono font-semibold">- {formatMMK(summary?.operatingExpenses)}</span>
              </div>
              <div className="flex justify-between py-2.5 border-t-2 border-slate-900 bg-blue-50/40 px-2 rounded-lg font-bold text-sm">
                <span className="text-[#0F172A]">
                  {lang === 'my' ? '၃။ အသားတင် အမြတ်/အရှုံး (Net Profit)' : '3. Net Profit / Loss'}
                </span>
                <span className={`font-mono ${(summary?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatMMK(summary?.netProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Expense Category Breakdown */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#0F172A]">
                {lang === 'my' ? 'အသုံးစရိတ် အမျိုးအစားခွဲခြမ်းစိတ်ဖြာမှု' : 'Expense Category Breakdown'}
              </h3>
              <PieChart className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3">
              {[
                { key: 'cost_of_goods', label: lang === 'my' ? 'ကုန်ပစ္စည်းဝယ်ရင်းစရိတ်' : 'Cost of Goods' },
                { key: 'delivery', label: lang === 'my' ? 'ပို့ဆောင်ခစရိတ်' : 'Delivery & Shipping' },
                { key: 'advertising', label: lang === 'my' ? 'ကြော်ငြာစရိတ်' : 'Advertising & Promo' },
                { key: 'rent', label: lang === 'my' ? 'ဆိုင်ခန်းငှားရမ်းခ' : 'Store Rent' },
                { key: 'salaries', label: lang === 'my' ? 'ဝန်ထမ်းလစာ' : 'Salaries' },
                { key: 'utilities', label: lang === 'my' ? 'မီး/ရေ/အင်တာနက်' : 'Utilities' },
                { key: 'packaging', label: lang === 'my' ? 'ထုပ်ပိုးပစ္စည်းစရိတ်' : 'Packaging' },
                { key: 'other_expense', label: lang === 'my' ? 'အခြားစရိတ်များ' : 'Other Expenses' }
              ].map(({ key, label }) => {
                const totalForCat = entries
                  .filter(e => e.type === 'expense' && e.category === key)
                  .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                
                const totalAllExpenses = (summary?.operatingExpenses || 0) + (summary?.cogs || 0);
                const percent = totalAllExpenses > 0 ? Math.round((totalForCat / totalAllExpenses) * 100) : 0;

                return (
                  <div key={key} className="text-xs space-y-1">
                    <div className="flex justify-between items-center text-slate-700">
                      <span>{label}</span>
                      <span className="font-mono font-semibold">{formatMMK(totalForCat)} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#2563EB] h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#0F172A]">
                {editingEntry
                  ? (lang === 'my' ? 'စာရင်းမှတ်တမ်း ပြင်ဆင်ရန်' : 'Edit Accounting Entry')
                  : (lang === 'my' ? 'စာရင်းမှတ်တမ်း အသစ်ထည့်သွင်းရန်' : 'New Accounting Entry')}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEntry} className="space-y-4 text-xs">
              {/* Type toggle */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  {lang === 'my' ? 'စာရင်းအမျိုးအစား' : 'Transaction Type'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'income', category: 'sales_revenue' })}
                    className={`py-2 text-center rounded-xl font-bold transition-colors cursor-pointer border ${
                      formData.type === 'income'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {lang === 'my' ? '+ ဝင်ငွေ (Income)' : '+ Income'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense', category: 'cost_of_goods' })}
                    className={`py-2 text-center rounded-xl font-bold transition-colors cursor-pointer border ${
                      formData.type === 'expense'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {lang === 'my' ? '- အသုံးစရိတ် (Expense)' : '- Expense'}
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'my' ? 'ကဏ္ဍ' : 'Category'}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                >
                  {formData.type === 'expense' ? (
                    <>
                      <option value="cost_of_goods">{lang === 'my' ? 'ကုန်ပစ္စည်းဝယ်ရင်းစရိတ် (COGS)' : 'Cost of Goods (COGS)'}</option>
                      <option value="delivery">{lang === 'my' ? 'ပို့ဆောင်ခစရိတ် (Delivery)' : 'Delivery & Shipping'}</option>
                      <option value="advertising">{lang === 'my' ? 'ကြော်ငြာစရိတ် (Advertising)' : 'Advertising & Promo'}</option>
                      <option value="rent">{lang === 'my' ? 'ဆိုင်ခန်းငှားရမ်းခ (Rent)' : 'Rent'}</option>
                      <option value="salaries">{lang === 'my' ? 'ဝန်ထမ်းလစာ (Salaries)' : 'Salaries'}</option>
                      <option value="utilities">{lang === 'my' ? 'မီး/ရေ/အင်တာနက် (Utilities)' : 'Utilities'}</option>
                      <option value="packaging">{lang === 'my' ? 'ထုပ်ပိုးပစ္စည်းစရိတ် (Packaging)' : 'Packaging'}</option>
                      <option value="other_expense">{lang === 'my' ? 'အခြားအထွေထွေစရိတ်' : 'Other Expenses'}</option>
                    </>
                  ) : (
                    <>
                      <option value="sales_revenue">{lang === 'my' ? 'အရောင်းရငွေ (Sales Revenue)' : 'Sales Revenue'}</option>
                      <option value="service_fee">{lang === 'my' ? 'ဝန်ဆောင်ခဝင်ငွေ' : 'Service Income'}</option>
                      <option value="other_income">{lang === 'my' ? 'အခြားဝင်ငွေ' : 'Other Income'}</option>
                    </>
                  )}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'my' ? 'ငွေပမာဏ (MMK)' : 'Amount (MMK)'}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  min="1"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-mono text-sm"
                />
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'my' ? 'ရက်စွဲ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'my' ? 'ငွေပေးချေမှုစနစ်' : 'Payment Method'}
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                  >
                    <option value="Cash">Cash (ငွေသား)</option>
                    <option value="KBZPay">KBZPay</option>
                    <option value="WavePay">WavePay</option>
                    <option value="CB Pay">CB Pay</option>
                    <option value="AYA Pay">AYA Pay</option>
                    <option value="Bank Transfer">Bank Transfer (ဘဏ်လွှဲ)</option>
                    <option value="Other">Other (အခြား)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'my' ? 'ဖော်ပြချက် / အကြောင်းအရာ' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  placeholder={lang === 'my' ? 'အသေးစိတ်မှတ်ချက်...' : 'Enter details or remarks...'}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {formSubmitting
                    ? (lang === 'my' ? 'သိမ်းဆည်းနေသည်...' : 'Saving...')
                    : (lang === 'my' ? 'သိမ်းဆည်းမည်' : 'Save Entry')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
