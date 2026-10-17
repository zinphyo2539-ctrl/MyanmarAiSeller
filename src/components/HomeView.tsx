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
        <div className="h-20 bg-white border border-slate-200 rounded-2xl shadow-sm" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-white border border-slate-200 rounded-2xl shadow-sm" />
          <div className="h-28 bg-white border border-slate-200 rounded-2xl shadow-sm" />
          <div className="h-28 bg-white border border-slate-200 rounded-2xl shadow-sm" />
          <div className="h-28 bg-white border border-slate-200 rounded-2xl shadow-sm" />
        </div>
        <div className="h-44 bg-white border border-slate-200 rounded-2xl shadow-sm" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="p-8 text-center bg-white border border-red-200 rounded-2xl shadow-sm space-y-4">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
        <h3 className="text-lg font-semibold text-slate-900">
          {lang === 'my' ? 'ဒေတာရယူ၍မရပါ' : 'Unable to load dashboard data'}
        </h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer shadow-sm"
        >
          {lang === 'my' ? 'ပြန်လည်ကြိုးစားရန်' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section
        aria-label="Store Greeting Header"
        className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <span className="text-xs uppercase tracking-wider text-[#2563EB] font-bold">
            {lang === 'my' ? 'စီးပွားရေးကွပ်ကဲမှုစင်တာ' : 'Business Command Center'}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight mt-0.5">
            {storeName || (lang === 'my' ? 'စတိုးအမည်မသတ်မှတ်ရသေးပါ' : 'Store Profile Unset')}
          </h1>
          <p className="text-xs text-[#64748B] mt-1 font-mono">
            {currentDate}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-[#64748B] block">
              {lang === 'my' ? 'AI Provider စနစ်' : 'AI Provider'}
            </span>
            <span className="text-xs font-semibold text-[#16A34A]">
              {aiHealth?.configured ? `Groq (${aiHealth.model})` : 'Groq API Key Missing'}
            </span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="px-3.5 py-2 bg-[#F8FAFC] hover:bg-[#CBD5E1] border border-[#CBD5E1] text-xs font-semibold text-[#475569] rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Activity className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>{lang === 'my' ? 'ပြန်လည်ရယူရန်' : 'Refresh'}</span>
          </button>
        </div>
      </section>

      {/* Primary Sales Overview Cards */}
      <section aria-label="Sales Overview Metrics">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            {lang === 'my' ? 'အရောင်းနှင့်ငွေပေးချေမှု အကျဉ်းချုပ်' : 'Sales & Payment Overview'}
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {lang === 'my' ? 'အတည်ပြုပြီး အချက်အလက်များ' : 'Verified Authoritative Records'}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today's Confirmed Sales */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                {lang === 'my' ? 'ဒီကနေ့ အရောင်း' : "Today's Sales"}
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-lg sm:text-2xl font-extrabold font-mono tabular-nums text-slate-900 tracking-tight">
                {(summary?.todaySalesAmount || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">MMK</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {summary?.todayConfirmedOrdersCount || 0} {lang === 'my' ? 'အော်ဒါ အတည်ပြုပြီး' : 'confirmed today'}
              </span>
            </div>
          </div>

          {/* Card 2: Total Orders */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                {lang === 'my' ? 'စုစုပေါင်း အော်ဒါ' : 'Total Orders'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-lg sm:text-2xl font-extrabold font-mono tabular-nums text-slate-900 tracking-tight">
                {summary?.totalOrdersCount || 0}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {summary?.ordersByStatus.confirmed || 0} {lang === 'my' ? 'အတည်ပြုပြီး' : 'confirmed'} · {summary?.ordersByStatus.pending || 0} {lang === 'my' ? 'စိစစ်ဆဲ' : 'pending'}
              </span>
            </div>
          </div>

          {/* Card 3: Payments to Review */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                {lang === 'my' ? 'စိစစ်ရန် ငွေလွှဲ' : 'Payments to Review'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-lg sm:text-2xl font-extrabold font-mono tabular-nums text-amber-600 tracking-tight">
                {summary?.paymentsToReviewCount || 0}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block font-mono tabular-nums">
                {(summary?.paymentsToReviewAmount || 0).toLocaleString()} MMK {lang === 'my' ? 'စိစစ်ရန်ကျန်' : 'unverified'}
              </span>
            </div>
          </div>

          {/* Card 4: Confirmed Payments */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                {lang === 'my' ? 'ငွေလက်ခံ အတည်ပြုပြီး' : 'Confirmed Payments'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-lg sm:text-2xl font-extrabold font-mono tabular-nums text-emerald-600 tracking-tight">
                {summary?.confirmedPaymentsCount || 0}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block font-mono tabular-nums">
                {(summary?.confirmedPaymentsAmount || 0).toLocaleString()} MMK {lang === 'my' ? 'လက်ခံပြီး' : 'verified'}
              </span>
            </div>
          </div>
        </div>

        {/* Honest Disclaimers for Non-Calculable Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 font-medium">
                {lang === 'my' ? 'ယခင်ကာလနှင့် နှိုင်းယှဉ်ချက်' : 'Sales vs Prior Period'}:
              </span>
            </div>
            <span className="text-amber-700 font-semibold">
              {lang === 'my' ? 'လုံလောက်သော မှတ်တမ်းမရှိပါ' : 'Insufficient Data'}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 font-medium">
                {lang === 'my' ? 'အသားတင်အမြတ် (Estimated Profit)' : 'Estimated Net Profit'}:
              </span>
            </div>
            <span className="text-amber-700 font-semibold">
              {lang === 'my' ? 'ကုန်ကျစရိတ် မသတ်မှတ်ရသေးပါ' : 'Insufficient Data (No COGS)'}
            </span>
          </div>
        </div>
      </section>

      {/* Needs Attention Section */}
      <section aria-label="Actionable Items Requiring Merchant Attention">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            {lang === 'my' ? 'အရေးတကြီး လုပ်ဆောင်ရန်များ' : 'Needs Attention'}
          </h2>
          <span className="text-xs text-blue-600 font-semibold">
            {lang === 'my' ? 'ချက်ချင်းဆောင်ရွက်ရန်' : 'Immediate Action Required'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Action 1: Stock Issues */}
          <button
            type="button"
            onClick={() => onNavigate('inventory', 'low_stock')}
            className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 p-5 rounded-2xl text-left transition-all group cursor-pointer shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900">
                  {lang === 'my' ? 'လက်ကျန်ပြတ်/နည်း ပစ္စည်းများ' : 'Inventory Alerts'}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
            </div>
            <div className="mt-4">
              <div className="text-xl font-extrabold font-mono tabular-nums text-amber-600">
                {(summary?.outOfStockCount || 0) + (summary?.lowStockCount || 0)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {summary?.outOfStockCount || 0} {lang === 'my' ? 'လုံးဝပြတ်' : 'out of stock'} · {summary?.lowStockCount || 0} {lang === 'my' ? 'လက်ကျန်နည်း' : 'low stock'}
              </p>
            </div>
          </button>

          {/* Action 2: Payments Pending Verification */}
          <button
            type="button"
            onClick={() => onNavigate('profile', 'payments')}
            className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 p-5 rounded-2xl text-left transition-all group cursor-pointer shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900">
                  {lang === 'my' ? 'စိစစ်ရမည့် ငွေလွှဲပြေစာ' : 'Payments Awaiting Review'}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
            </div>
            <div className="mt-4">
              <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900">
                {summary?.paymentsToReviewCount || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'my' ? 'လူကိုယ်တိုင် စစ်ဆေးအတည်ပြုရန်' : 'Requires authorized human confirmation'}
              </p>
            </div>
          </button>

          {/* Action 3: Human Review Inbox */}
          <button
            type="button"
            onClick={() => onNavigate('messages', 'human_review')}
            className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 p-5 rounded-2xl text-left transition-all group cursor-pointer shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900">
                  {lang === 'my' ? 'လူဖြေကြားရန် လွှဲပြောင်းထားမှု' : 'Human Review Queue'}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
            </div>
            <div className="mt-4">
              <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900">
                {summary?.needsHumanReviewCount || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'my' ? 'AI မှ လွှဲပြောင်းထားသော မေးခွန်းများ' : 'Questions flagged for human staff'}
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Inventory Alerts List */}
      <section aria-label="Inventory Stock Alerts">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            {lang === 'my' ? 'လက်ကျန်သတိပေးချက်များ (Inventory Alerts)' : 'Inventory Stock Alerts'}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
          >
            {lang === 'my' ? 'ကုန်ပစ္စည်းအားလုံး ကြည့်ရန်' : 'View all inventory'}
          </button>
        </div>

        {lowOrOutOfStockProducts.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-900">
              {lang === 'my' ? 'လက်ကျန်ပြတ်လပ်မှု မရှိပါ' : 'All product inventory is healthy'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'my' ? 'ကုန်ပစ္စည်းအားလုံး သတ်မှတ်အရေအတွက်ထက် ကျော်လွန်နေပါသည်' : 'No products are out of stock or below the critical threshold'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-sm overflow-hidden">
            {lowOrOutOfStockProducts.slice(0, 4).map((product) => {
              const lowVariants = (product.variants || []).filter((v) => Number(v.stock) <= 3);

              return (
                <div key={product.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {product.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                      <span>SKU: {product.sku}</span>
                      <span>·</span>
                      <span>{product.price.toLocaleString()} MMK</span>
                      <span>·</span>
                      {lowVariants.map((v) => (
                        <span
                          key={v.id}
                          className={v.stock === 0 ? 'text-red-600 font-bold' : 'text-amber-600 font-bold'}
                        >
                          {v.color}/{v.size}: {v.stock === 0 ? '0 stock' : `${v.stock} left`}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditProduct(product)}
                    className="self-start sm:self-center px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl transition-colors cursor-pointer shadow-sm"
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            {lang === 'my' ? 'လတ်တလော အရောင်းမှတ်တမ်း (Recent Sales)' : 'Recent Sales Activity'}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('profile', 'payments')}
            className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
          >
            {lang === 'my' ? 'အော်ဒါအားလုံး ကြည့်ရန်' : 'View all orders'}
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center space-y-2 shadow-sm">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-1" />
            <p className="text-sm font-semibold text-slate-900">
              {lang === 'my' ? 'အရောင်းမှတ်တမ်း မရှိသေးပါ (No sales records yet)' : 'Sales History: No sales records yet'}
            </p>
            <p className="text-xs text-slate-500">
              {lang === 'my' ? 'လတ်တလော အရောင်းလှုပ်ရှားမှု မရှိသေးပါ' : 'Recent Sales: No sales activity yet'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-sm overflow-hidden">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{order.id}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-slate-700">{order.customerName}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                    {new Date(order.createdAt).toLocaleString()} · {order.items?.length || 0} items
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 block tabular-nums text-sm">
                    {order.totalAmount.toLocaleString()} MMK
                  </span>
                  <span className={`text-[10px] font-bold uppercase ${
                    order.paymentStatus === 'CONFIRMED' ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity Audit Log */}
      <section aria-label="Recent Authorized Activity">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            {lang === 'my' ? 'လတ်တလော စနစ်မှတ်တမ်း (Recent Activity)' : 'Recent Authorized Activity'}
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {lang === 'my' ? 'ဆာဗာစစ်ဆေးပြီး မှတ်တမ်း' : 'Authoritative Audit Logs'}
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl text-center text-xs text-slate-500 shadow-sm">
            {lang === 'my' ? 'မှတ်တမ်းမရှိသေးပါ' : 'No audit log events recorded yet.'}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-sm overflow-hidden">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-4 flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 break-words">
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
