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
        <div className="h-20 bg-[#181810] border border-[#393426] rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 bg-[#181810] border border-[#393426] rounded-xl" />
          <div className="h-28 bg-[#181810] border border-[#393426] rounded-xl" />
          <div className="h-28 bg-[#181810] border border-[#393426] rounded-xl" />
          <div className="h-28 bg-[#181810] border border-[#393426] rounded-xl" />
        </div>
        <div className="h-44 bg-[#181810] border border-[#393426] rounded-2xl" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="p-8 text-center bg-[#181810] border border-[#E06B61]/40 rounded-2xl space-y-4">
        <AlertCircle className="w-10 h-10 text-[#E06B61] mx-auto" />
        <h3 className="text-lg font-semibold text-[#F5F2E8]">
          {lang === 'my' ? 'ဒေတာရယူ၍မရပါ' : 'Unable to load dashboard data'}
        </h3>
        <p className="text-sm text-[#B9B5A7] max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="px-4 py-2 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-semibold text-sm rounded-lg transition-colors cursor-pointer"
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
        className="bg-[#181810] border border-[#393426] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <span className="text-xs uppercase tracking-wider text-[#A88419] font-bold">
            {lang === 'my' ? 'စီးပွားရေးကွပ်ကဲမှုစင်တာ' : 'Business Command Center'}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#F5F2E8] tracking-tight mt-0.5">
            {storeName || (lang === 'my' ? 'စတိုးအမည်မသတ်မှတ်ရသေးပါ' : 'Store Profile Unset')}
          </h1>
          <p className="text-xs text-[#817D70] mt-1 font-mono">
            {currentDate}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-[#817D70] block">
              {lang === 'my' ? 'AI Provider စနစ်' : 'AI Provider'}
            </span>
            <span className="text-xs font-medium text-[#65B985]">
              {aiHealth?.configured ? `Groq (${aiHealth.model})` : 'Groq API Key Missing'}
            </span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="px-3.5 py-2 bg-[#1E1D14] hover:bg-[#2A271C] border border-[#393426] text-xs font-semibold text-[#E0BD55] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>{lang === 'my' ? 'ပြန်လည်ရယူရန်' : 'Refresh'}</span>
          </button>
        </div>
      </section>

      {/* Primary Sales Overview Cards */}
      <section aria-label="Sales Overview Metrics">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#B9B5A7]">
            {lang === 'my' ? 'အရောင်းနှင့်ငွေပေးချေမှု အကျဉ်းချုပ်' : 'Sales & Payment Overview'}
          </h2>
          <span className="text-xs text-[#817D70]">
            {lang === 'my' ? 'အတည်ပြုပြီး အချက်အလက်များ' : 'Verified Authoritative Records'}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Today's Confirmed Sales */}
          <div className="bg-[#181810] border border-[#393426] p-4 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#B9B5A7]">
                {lang === 'my' ? 'ဒီကနေ့ အရောင်း' : "Today's Sales"}
              </span>
              <DollarSign className="w-4 h-4 text-[#C9A227]" />
            </div>
            <div className="mt-3">
              <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-[#F5F2E8]">
                {(summary?.todaySalesAmount || 0).toLocaleString()} <span className="text-xs font-normal text-[#817D70]">MMK</span>
              </div>
              <span className="text-[11px] text-[#817D70] mt-1 block">
                {summary?.todayConfirmedOrdersCount || 0} {lang === 'my' ? 'အော်ဒါ အတည်ပြုပြီး' : 'confirmed today'}
              </span>
            </div>
          </div>

          {/* Card 2: Total Orders */}
          <div className="bg-[#181810] border border-[#393426] p-4 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#B9B5A7]">
                {lang === 'my' ? 'စုစုပေါင်း အော်ဒါ' : 'Total Orders'}
              </span>
              <ShoppingCart className="w-4 h-4 text-[#83A9D6]" />
            </div>
            <div className="mt-3">
              <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-[#F5F2E8]">
                {summary?.totalOrdersCount || 0}
              </div>
              <span className="text-[11px] text-[#817D70] mt-1 block">
                {summary?.ordersByStatus.confirmed || 0} {lang === 'my' ? 'အတည်ပြုပြီး' : 'confirmed'} · {summary?.ordersByStatus.pending || 0} {lang === 'my' ? 'စိစစ်ဆဲ' : 'pending'}
              </span>
            </div>
          </div>

          {/* Card 3: Payments to Review */}
          <div className="bg-[#181810] border border-[#393426] p-4 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#B9B5A7]">
                {lang === 'my' ? 'စိစစ်ရန် ငွေလွှဲ' : 'Payments to Review'}
              </span>
              <Clock className="w-4 h-4 text-[#E0BD55]" />
            </div>
            <div className="mt-3">
              <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-[#E0BD55]">
                {summary?.paymentsToReviewCount || 0}
              </div>
              <span className="text-[11px] text-[#817D70] mt-1 block font-mono tabular-nums">
                {(summary?.paymentsToReviewAmount || 0).toLocaleString()} MMK {lang === 'my' ? 'စိစစ်ရန်ကျန်' : 'unverified'}
              </span>
            </div>
          </div>

          {/* Card 4: Confirmed Payments */}
          <div className="bg-[#181810] border border-[#393426] p-4 rounded-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#B9B5A7]">
                {lang === 'my' ? 'ငွေလက်ခံ အတည်ပြုပြီး' : 'Confirmed Payments'}
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#65B985]" />
            </div>
            <div className="mt-3">
              <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-[#65B985]">
                {summary?.confirmedPaymentsCount || 0}
              </div>
              <span className="text-[11px] text-[#817D70] mt-1 block font-mono tabular-nums">
                {(summary?.confirmedPaymentsAmount || 0).toLocaleString()} MMK {lang === 'my' ? 'လက်ခံပြီး' : 'verified'}
              </span>
            </div>
          </div>
        </div>

        {/* Honest Disclaimers for Non-Calculable Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="bg-[#11110D] border border-[#393426]/70 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#817D70]" />
              <span className="text-[#817D70]">
                {lang === 'my' ? 'ယခင်ကာလနှင့် နှိုင်းယှဉ်ချက်' : 'Sales vs Prior Period'}:
              </span>
            </div>
            <span className="text-[#A88419] font-medium">
              {lang === 'my' ? 'လုံလောက်သော မှတ်တမ်းမရှိပါ' : 'Insufficient Data'}
            </span>
          </div>

          <div className="bg-[#11110D] border border-[#393426]/70 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-[#817D70]" />
              <span className="text-[#817D70]">
                {lang === 'my' ? 'အသားတင်အမြတ် (Estimated Profit)' : 'Estimated Net Profit'}:
              </span>
            </div>
            <span className="text-[#A88419] font-medium">
              {lang === 'my' ? 'ကုန်ကျစရိတ် မသတ်မှတ်ရသေးပါ' : 'Insufficient Data (No COGS)'}
            </span>
          </div>
        </div>
      </section>

      {/* Needs Attention Section */}
      <section aria-label="Actionable Items Requiring Merchant Attention">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#B9B5A7]">
            {lang === 'my' ? 'အရေးတကြီး လုပ်ဆောင်ရန်များ' : 'Needs Attention'}
          </h2>
          <span className="text-xs text-[#C9A227] font-medium">
            {lang === 'my' ? 'ချက်ချင်းဆောင်ရွက်ရန်' : 'Immediate Action Required'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Action 1: Stock Issues */}
          <button
            type="button"
            onClick={() => onNavigate('inventory', 'low_stock')}
            className="bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] hover:border-[#C9A227]/60 p-4 rounded-xl text-left transition-all group cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#E0BD55]" />
                <span className="text-xs font-semibold text-[#F5F2E8]">
                  {lang === 'my' ? 'လက်ကျန်ပြတ်/နည်း ပစ္စည်းများ' : 'Inventory Alerts'}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#817D70] group-hover:text-[#E0BD55] transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold font-mono tabular-nums text-[#E0BD55]">
                {(summary?.outOfStockCount || 0) + (summary?.lowStockCount || 0)}
              </div>
              <p className="text-[11px] text-[#B9B5A7] mt-0.5">
                {summary?.outOfStockCount || 0} {lang === 'my' ? 'လုံးဝပြတ်' : 'out of stock'} · {summary?.lowStockCount || 0} {lang === 'my' ? 'လက်ကျန်နည်း' : 'low stock'}
              </p>
            </div>
          </button>

          {/* Action 2: Payments Pending Verification */}
          <button
            type="button"
            onClick={() => onNavigate('profile', 'payments')}
            className="bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] hover:border-[#C9A227]/60 p-4 rounded-xl text-left transition-all group cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C9A227]" />
                <span className="text-xs font-semibold text-[#F5F2E8]">
                  {lang === 'my' ? 'စိစစ်ရမည့် ငွေလွှဲပြေစာ' : 'Payments Awaiting Review'}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#817D70] group-hover:text-[#C9A227] transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold font-mono tabular-nums text-[#F5F2E8]">
                {summary?.paymentsToReviewCount || 0}
              </div>
              <p className="text-[11px] text-[#B9B5A7] mt-0.5">
                {lang === 'my' ? 'လူကိုယ်တိုင် စစ်ဆေးအတည်ပြုရန်' : 'Requires authorized human confirmation'}
              </p>
            </div>
          </button>

          {/* Action 3: Human Review Inbox */}
          <button
            type="button"
            onClick={() => onNavigate('messages', 'human_review')}
            className="bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] hover:border-[#C9A227]/60 p-4 rounded-xl text-left transition-all group cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#83A9D6]" />
                <span className="text-xs font-semibold text-[#F5F2E8]">
                  {lang === 'my' ? 'လူဖြေကြားရန် လွှဲပြောင်းထားမှု' : 'Human Review Queue'}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#817D70] group-hover:text-[#83A9D6] transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold font-mono tabular-nums text-[#F5F2E8]">
                {summary?.needsHumanReviewCount || 0}
              </div>
              <p className="text-[11px] text-[#B9B5A7] mt-0.5">
                {lang === 'my' ? 'AI မှ လွှဲပြောင်းထားသော မေးခွန်းများ' : 'Questions flagged for human staff'}
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Inventory Alerts List */}
      <section aria-label="Inventory Stock Alerts">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#B9B5A7]">
            {lang === 'my' ? 'လက်ကျန်သတိပေးချက်များ (Inventory Alerts)' : 'Inventory Stock Alerts'}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="text-xs text-[#C9A227] hover:underline font-medium cursor-pointer"
          >
            {lang === 'my' ? 'ကုန်ပစ္စည်းအားလုံး ကြည့်ရန်' : 'View all inventory'}
          </button>
        </div>

        {lowOrOutOfStockProducts.length === 0 ? (
          <div className="bg-[#181810] border border-[#393426] p-6 rounded-2xl text-center">
            <CheckCircle2 className="w-8 h-8 text-[#65B985] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#F5F2E8]">
              {lang === 'my' ? 'လက်ကျန်ပြတ်လပ်မှု မရှိပါ' : 'All product inventory is healthy'}
            </p>
            <p className="text-xs text-[#817D70] mt-1">
              {lang === 'my' ? 'ကုန်ပစ္စည်းအားလုံး သတ်မှတ်အရေအတွက်ထက် ကျော်လွန်နေပါသည်' : 'No products are out of stock or below the critical threshold'}
            </p>
          </div>
        ) : (
          <div className="bg-[#181810] border border-[#393426] rounded-2xl divide-y divide-[#393426]">
            {lowOrOutOfStockProducts.slice(0, 4).map((product) => {
              const lowVariants = (product.variants || []).filter((v) => Number(v.stock) <= 3);

              return (
                <div key={product.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#F5F2E8]">
                      {product.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#817D70] mt-1 font-mono">
                      <span>SKU: {product.sku}</span>
                      <span>·</span>
                      <span>{product.price.toLocaleString()} MMK</span>
                      <span>·</span>
                      {lowVariants.map((v) => (
                        <span
                          key={v.id}
                          className={v.stock === 0 ? 'text-[#E06B61] font-semibold' : 'text-[#E0BD55] font-semibold'}
                        >
                          {v.color}/{v.size}: {v.stock === 0 ? '0 stock' : `${v.stock} left`}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditProduct(product)}
                    className="self-start sm:self-center px-3 py-1.5 bg-[#1E1D14] hover:bg-[#2A271C] border border-[#393426] text-xs font-semibold text-[#C9A227] rounded-lg transition-colors cursor-pointer"
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
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#B9B5A7]">
            {lang === 'my' ? 'လတ်တလော အရောင်းမှတ်တမ်း (Recent Sales)' : 'Recent Sales Activity'}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('profile', 'payments')}
            className="text-xs text-[#C9A227] hover:underline font-medium cursor-pointer"
          >
            {lang === 'my' ? 'အော်ဒါအားလုံး ကြည့်ရန်' : 'View all orders'}
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="bg-[#181810] border border-[#393426] p-6 rounded-2xl text-center space-y-2">
            <ShoppingBag className="w-8 h-8 text-[#776324] mx-auto mb-1" />
            <p className="text-sm font-semibold text-[#F5F2E8]">
              {lang === 'my' ? 'အရောင်းမှတ်တမ်း မရှိသေးပါ (No sales records yet)' : 'Sales History: No sales records yet'}
            </p>
            <p className="text-xs text-[#817D70]">
              {lang === 'my' ? 'လတ်တလော အရောင်းလှုပ်ရှားမှု မရှိသေးပါ' : 'Recent Sales: No sales activity yet'}
            </p>
          </div>
        ) : (
          <div className="bg-[#181810] border border-[#393426] rounded-2xl divide-y divide-[#393426]">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#F5F2E8]">{order.id}</span>
                    <span className="text-[#817D70]">·</span>
                    <span className="font-semibold text-[#B9B5A7]">{order.customerName}</span>
                  </div>
                  <span className="text-[11px] text-[#817D70] font-mono mt-0.5 block">
                    {new Date(order.createdAt).toLocaleString()} · {order.items?.length || 0} items
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-[#F5F2E8] block tabular-nums">
                    {order.totalAmount.toLocaleString()} MMK
                  </span>
                  <span className={`text-[10px] font-semibold uppercase ${
                    order.paymentStatus === 'CONFIRMED' ? 'text-[#65B985]' : 'text-[#E0BD55]'
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
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#B9B5A7]">
            {lang === 'my' ? 'လတ်တလော စနစ်မှတ်တမ်း (Recent Activity)' : 'Recent Authorized Activity'}
          </h2>
          <span className="text-xs text-[#817D70]">
            {lang === 'my' ? 'ဆာဗာစစ်ဆေးပြီး မှတ်တမ်း' : 'Authoritative Audit Logs'}
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="bg-[#181810] border border-[#393426] p-6 rounded-2xl text-center text-xs text-[#817D70]">
            {lang === 'my' ? 'မှတ်တမ်းမရှိသေးပါ' : 'No audit log events recorded yet.'}
          </div>
        ) : (
          <div className="bg-[#181810] border border-[#393426] rounded-2xl divide-y divide-[#393426]">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-3.5 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#C9A227] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#F5F2E8] truncate">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-[#817D70] font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-[#B9B5A7] mt-0.5 break-words">
                    {log.details}
                  </p>
                  <span className="text-[10px] text-[#817D70] mt-1 block font-mono">
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
