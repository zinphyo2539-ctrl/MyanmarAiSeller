import React from 'react';
import {
  DollarSign,
  ShoppingCart,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  MessageSquare,
  Bot,
  ArrowRight,
  TrendingUp,
  Activity,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { DashboardSummary, Product, Order, AuditLog, AiHealth, NavigationDestination } from '../types';

interface HomeViewProps {
  summary: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  products: Product[];
  orders: Order[];
  auditLogs: AuditLog[];
  aiHealth: AiHealth | null;
  storeName: string;
  lang: 'my' | 'en';
  onNavigate: (tab: NavigationDestination, filter?: string) => void;
  onEditProduct: (product: Product) => void;
  onRefresh: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  summary,
  loading,
  error,
  products,
  orders,
  auditLogs,
  aiHealth,
  storeName,
  lang,
  onNavigate,
  onEditProduct,
  onRefresh
}) => {
  const currentDate = new Date().toLocaleDateString(lang === 'my' ? 'my-MM' : 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const lowOrOutOfStockProducts = products.filter((p) => {
    return p.variants && p.variants.some((v) => Number(v.stock) <= 3);
  });

  if (loading && !summary) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-white/[0.03] border border-white/10 rounded-3xl shadow-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-white/[0.03] border border-white/10 rounded-2xl shadow-xl" />
          <div className="h-28 bg-white/[0.03] border border-white/10 rounded-2xl shadow-xl" />
          <div className="h-28 bg-white/[0.03] border border-white/10 rounded-2xl shadow-xl" />
          <div className="h-28 bg-white/[0.03] border border-white/10 rounded-2xl shadow-xl" />
        </div>
        <div className="h-44 bg-white/[0.03] border border-white/10 rounded-2xl shadow-xl" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="p-8 text-center bg-white/[0.03] backdrop-blur-2xl border border-rose-500/30 rounded-3xl shadow-2xl space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-semibold text-white">
          {lang === 'my' ? 'ဒေတာရယူ၍မရပါ' : 'Unable to load dashboard data'}
        </h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-full shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
        >
          {lang === 'my' ? 'ပြန်လည်ကြိုးစားရန်' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up text-slate-100">
      {/* Dark Glass Command Center Banner */}
      <section
        aria-label="Store Greeting Header"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 text-white p-6 sm:p-8 shadow-2xl shadow-black/60 border border-purple-500/20 backdrop-blur-2xl"
      >
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-24 -bottom-10 w-44 h-44 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 tracking-wide uppercase font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              {lang === 'my' ? 'စီးပွားရေးကွပ်ကဲမှုစင်တာ' : 'Business Command Center'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-white leading-relaxed">
              {storeName || (lang === 'my' ? 'စတိုးအမည်မသတ်မှတ်ရသေးပါ' : 'Store Profile Unset')}
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              {currentDate}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* AI Provider Glassmorphic Pill */}
            <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2 text-right">
              <span className="text-[11px] text-slate-400 block font-mono uppercase tracking-wider">
                {lang === 'my' ? 'AI Provider စနစ်' : 'AI Engine'}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-xs font-bold text-emerald-300 font-mono">
                  {aiHealth?.configured ? `Groq (${aiHealth.model})` : 'Groq API Active'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-white backdrop-blur-xl active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>{lang === 'my' ? 'ပြန်လည်ရယူရန်' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Primary Sales Overview Cards (Glass Bento Grid with Top Accent Glow) */}
      <section aria-label="Sales Overview Metrics">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-base font-bold text-white leading-relaxed">
            {lang === 'my' ? 'အရောင်းနှင့်ငွေပေးချေမှု အကျဉ်းချုပ်' : 'Sales & Payment Overview'}
          </h2>
          <span className="text-xs text-slate-400 font-medium font-mono">
            {lang === 'my' ? 'အတည်ပြုပြီး အချက်အလက်များ' : 'Verified Authoritative Records'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today's Confirmed Sales */}
          <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-5 border border-white/10 border-t-2 border-t-emerald-400 shadow-[0_15px_35px_rgba(0,0,0,0.5)] hover:border-purple-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                {lang === 'my' ? 'ဒီကနေ့ အရောင်း' : "Today's Sales"}
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
                  {(summary?.todaySalesAmount || 0).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono">MMK</span>
              </div>
              <span className="text-xs text-slate-400 mt-1 block">
                {summary?.todayConfirmedOrdersCount || 0} {lang === 'my' ? 'အော်ဒါ အတည်ပြုပြီး' : 'confirmed today'}
              </span>
            </div>
          </div>

          {/* Card 2: Total Orders */}
          <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-5 border border-white/10 border-t-2 border-t-purple-400 shadow-[0_15px_35px_rgba(0,0,0,0.5)] hover:border-purple-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                {lang === 'my' ? 'စုစုပေါင်း အော်ဒါ' : 'Total Orders'}
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-purple-200 font-mono tabular-nums">
                {summary?.totalOrdersCount || 0}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">
                {summary?.ordersByStatus?.confirmed || 0} {lang === 'my' ? 'အတည်ပြုပြီး' : 'confirmed'} · {summary?.ordersByStatus?.pending || 0} {lang === 'my' ? 'စိစစ်ဆဲ' : 'pending'}
              </span>
            </div>
          </div>

          {/* Card 3: Payments to Review */}
          <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-5 border border-white/10 border-t-2 border-t-amber-400 shadow-[0_15px_35px_rgba(0,0,0,0.5)] hover:border-purple-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-300">
                {lang === 'my' ? 'စိစစ်ရန် ငွေလွှဲ' : 'Payments to Review'}
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums">
                {summary?.paymentsToReviewCount || 0}
              </div>
              <span className="text-xs font-medium text-amber-300/80 mt-1 block font-mono tabular-nums">
                {(summary?.paymentsToReviewAmount || 0).toLocaleString()} MMK {lang === 'my' ? 'စိစစ်ရန်ကျန်' : 'unverified'}
              </span>
            </div>
          </div>

          {/* Card 4: Confirmed Payments */}
          <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-5 border border-white/10 border-t-2 border-t-teal-400 shadow-[0_15px_35px_rgba(0,0,0,0.5)] hover:border-purple-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                {lang === 'my' ? 'ငွေလက်ခံ အတည်ပြုပြီး' : 'Confirmed Payments'}
              </span>
              <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/25 text-teal-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-teal-300 font-mono tabular-nums">
                {summary?.confirmedPaymentsCount || 0}
              </div>
              <span className="text-xs text-slate-400 mt-1 block font-mono tabular-nums">
                {(summary?.confirmedPaymentsAmount || 0).toLocaleString()} MMK {lang === 'my' ? 'လက်ခံပြီး' : 'verified'}
              </span>
            </div>
          </div>
        </div>

        {/* Informational metric disclaimers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3.5">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300 font-medium">
                {lang === 'my' ? 'ယခင်ကာလနှင့် နှိုင်းယှဉ်ချက်' : 'Sales vs Prior Period'}:
              </span>
            </div>
            <span className="text-amber-400 font-semibold font-mono text-[11px]">
              {lang === 'my' ? 'လုံလောက်သော မှတ်တမ်းမရှိပါ' : 'Insufficient Data'}
            </span>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300 font-medium">
                {lang === 'my' ? 'အသားတင်အမြတ် (Estimated Profit)' : 'Estimated Net Profit'}:
              </span>
            </div>
            <span className="text-amber-400 font-semibold font-mono text-[11px]">
              {lang === 'my' ? 'ကုန်ကျစရိတ် မသတ်မှတ်ရသေးပါ' : 'Insufficient Data (No COGS)'}
            </span>
          </div>
        </div>
      </section>

      {/* Needs Attention Section (Urgent Actions in Glass Panels) */}
      <section aria-label="Actionable Items Requiring Merchant Attention">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-base font-bold text-white leading-relaxed">
            {lang === 'my' ? 'အရေးတကြီး လုပ်ဆောင်ရန်များ' : 'Needs Attention'}
          </h2>
          <span className="text-xs font-semibold text-purple-400 font-mono">
            {lang === 'my' ? 'ချက်ချင်းဆောင်ရွက်ရန်' : 'Immediate Action Required'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Action 1: Stock Issues */}
          <button
            type="button"
            onClick={() => onNavigate('inventory', 'low_stock')}
            className="group text-left bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] rounded-2xl p-5 border border-white/10 hover:border-amber-400/40 shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-white leading-relaxed truncate">
                  {lang === 'my' ? 'လက်ကျန်ပြတ်/နည်း ပစ္စည်းများ' : 'Inventory Alerts'}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums">
                {(summary?.outOfStockCount || 0) + (summary?.lowStockCount || 0)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {summary?.outOfStockCount || 0} {lang === 'my' ? 'လုံးဝပြတ်' : 'out of stock'} · {summary?.lowStockCount || 0} {lang === 'my' ? 'လက်ကျန်နည်း' : 'low stock'}
              </p>
            </div>
          </button>

          {/* Action 2: Payments Pending Verification */}
          <button
            type="button"
            onClick={() => onNavigate('profile', 'payments')}
            className="group text-left bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] rounded-2xl p-5 border border-white/10 hover:border-purple-400/40 shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-white leading-relaxed truncate">
                  {lang === 'my' ? 'စိစစ်ရမည့် ငွေလွှဲပြေစာ' : 'Payments Awaiting Review'}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-purple-300 font-mono tabular-nums">
                {summary?.paymentsToReviewCount || 0}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'my' ? 'လူကိုယ်တိုင် စစ်ဆေးအတည်ပြုရန်' : 'Requires authorized human confirmation'}
              </p>
            </div>
          </button>

          {/* Action 3: Human Review Inbox */}
          <button
            type="button"
            onClick={() => onNavigate('messages', 'human_review')}
            className="group text-left bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] rounded-2xl p-5 border border-white/10 hover:border-indigo-400/40 shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-white leading-relaxed truncate">
                  {lang === 'my' ? 'လူဖြေကြားရန် လွှဲပြောင်းထားမှု' : 'Human Review Queue'}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-white font-mono tabular-nums">
                {summary?.needsHumanReviewCount || 0}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'my' ? 'AI မှ လွှဲပြောင်းထားသော မေးခွန်းများ' : 'Questions flagged for human staff'}
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Inventory Alerts List */}
      <section aria-label="Inventory Stock Alerts">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-base font-bold text-white leading-relaxed">
            {lang === 'my' ? 'လက်ကျန်သတိပေးချက်များ (Inventory Alerts)' : 'Inventory Stock Alerts'}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
          >
            {lang === 'my' ? 'ကုန်ပစ္စည်းအားလုံး ကြည့်ရန်' : 'View all inventory'}
          </button>
        </div>

        {lowOrOutOfStockProducts.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/10 p-8 rounded-2xl text-center shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">
              {lang === 'my' ? 'လက်ကျန်ပြတ်လပ်မှု မရှိပါ' : 'All product inventory is healthy'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'my' ? 'ကုန်ပစ္စည်းအားလုံး သတ်မှတ်အရေအတွက်ထက် ကျော်လွန်နေပါသည်' : 'No products are out of stock or below the critical threshold'}
            </p>
          </div>
        ) : (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl divide-y divide-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)] overflow-hidden">
            {lowOrOutOfStockProducts.slice(0, 4).map((product) => {
              const lowVariants = (product.variants || []).filter((v) => Number(v.stock) <= 3);

              return (
                <div key={product.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white leading-relaxed">
                      {product.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                      <span>SKU: {product.sku}</span>
                      <span>·</span>
                      <span className="text-purple-300">{product.price.toLocaleString()} MMK</span>
                      <span>·</span>
                      {lowVariants.map((v) => (
                        <span
                          key={v.id}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            v.stock === 0
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {v.color}/{v.size}: {v.stock === 0 ? '0 stock' : `${v.stock} left`}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditProduct(product)}
                    className="self-start sm:self-center px-4 py-2 bg-white/[0.05] hover:bg-purple-600/20 hover:text-purple-300 hover:border-purple-500/40 border border-white/10 text-xs font-semibold text-slate-300 rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    {lang === 'my' ? 'Stock ပြင်ရန်' : 'Update Stock'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Sales & Orders Activity */}
      <section aria-label="Recent Sales & Order Activity">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-base font-bold text-white leading-relaxed">
            {lang === 'my' ? 'လတ်တလော အရောင်းမှတ်တမ်း (Recent Sales)' : 'Recent Sales Activity'}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('profile', 'payments')}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
          >
            {lang === 'my' ? 'အော်ဒါအားလုံး ကြည့်ရန်' : 'View all orders'}
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/10 p-8 rounded-2xl text-center space-y-2 shadow-lg">
            <ShoppingBag className="w-10 h-10 text-slate-500 mx-auto mb-1" />
            <p className="text-sm font-semibold text-white">
              {lang === 'my' ? 'အရောင်းမှတ်တမ်း မရှိသေးပါ (No sales records yet)' : 'Sales History: No sales records yet'}
            </p>
            <p className="text-xs text-slate-400">
              {lang === 'my' ? 'လတ်တလော အရောင်းလှုပ်ရှားမှု မရှိသေးပါ' : 'Recent Sales: No sales activity yet'}
            </p>
          </div>
        ) : (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl divide-y divide-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)] overflow-hidden">
            {orders.slice(0, 5).map((order) => {
              const isConfirmed = order.paymentStatus === 'CONFIRMED';
              const isRejected = order.paymentStatus === 'REJECTED';
              const isSlipSubmitted = order.paymentStatus === 'SLIP_SUBMITTED';

              return (
                <div key={order.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-white/[0.05] text-purple-300 font-semibold px-2 py-0.5 rounded border border-white/10">
                        {order.id}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="font-semibold text-white">{order.customerName}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                      {new Date(order.createdAt).toLocaleString()} · {order.items?.length || 0} items
                    </span>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="font-mono font-bold text-white block tabular-nums text-sm">
                      {order.totalAmount.toLocaleString()} MMK
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md ${
                      isConfirmed
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : isRejected
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : isSlipSubmitted
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isConfirmed ? 'bg-emerald-400' : isRejected ? 'bg-rose-400' : isSlipSubmitted ? 'bg-purple-400 animate-pulse' : 'bg-amber-400'
                      }`} />
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Activity Audit Log */}
      <section aria-label="Recent Authorized Activity">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono">
            {lang === 'my' ? 'လတ်တလော စနစ်မှတ်တမ်း (Recent Activity)' : 'Recent Authorized Activity'}
          </h2>
          <span className="text-xs text-slate-400 font-medium font-mono">
            {lang === 'my' ? 'ဆာဗာစစ်ဆေးပြီး မှတ်တမ်း' : 'Authoritative Audit Logs'}
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/10 p-6 rounded-2xl text-center text-xs text-slate-400 shadow-sm">
            {lang === 'my' ? 'မှတ်တမ်းမရှိသေးပါ' : 'No audit log events recorded yet.'}
          </div>
        ) : (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl divide-y divide-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)] overflow-hidden">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-4 flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-1.5 shrink-0 shadow-md shadow-purple-500/50" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white truncate">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 break-words">
                    {log.details}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                    Actor: {log.actor}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
