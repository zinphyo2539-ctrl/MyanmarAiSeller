/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  Bot,
  Store,
  RefreshCw,
  Globe,
  LogOut,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Lock,
  FlaskConical
} from 'lucide-react';

import {
  NavigationDestination,
  DashboardSummary,
  Product,
  Order,
  StoreSettings,
  AiConfig,
  SampleReply,
  Conversation,
  AuditLog,
  ProviderStatus,
  AiHealth
} from './types';

import { Navigation } from './components/Navigation';
import { HomeView } from './components/HomeView';
import { MessagesView } from './components/MessagesView';
import { InventoryView } from './components/InventoryView';
import { AiSellerView } from './components/AiSellerView';
import { ProfileView } from './components/ProfileView';
import { AiTestingLabView } from './components/AiTestingLabView';
import { ConfigureModal } from './components/ConfigureModal';
import { PublicStoreModal } from './components/PublicStoreModal';

export default function App() {
  const [lang, setLang] = useState<'my' | 'en'>('my');
  const [currentTab, setCurrentTab] = useState<NavigationDestination>('home');
  const [subFilter, setSubFilter] = useState<string | undefined>(undefined);

  // Authenticated User State
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('myanmar_seller_token');
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<any>(() => {
    try {
      const u = localStorage.getItem('myanmar_seller_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Authoritative Business State
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [samples, setSamples] = useState<SampleReply[]>([]);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [aiHealth, setAiHealth] = useState<AiHealth | null>(null);

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Modals state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configTargetProvider, setConfigTargetProvider] = useState<'google' | 'facebook' | 'tiktok'>('google');
  const [isPublicStoreOpen, setIsPublicStoreOpen] = useState(false);

  const getHeaders = useCallback((): Record<string, string> => {
    const token = authToken || localStorage.getItem('myanmar_seller_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }, [authToken]);

  // Check Authentication Status
  const checkAuth = useCallback(async (tokenToTest?: string) => {
    try {
      const token = tokenToTest || authToken || localStorage.getItem('myanmar_seller_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const checkUrl = token ? `/api/auth/me?token=${encodeURIComponent(token)}` : '/api/auth/me';
      const res = await fetch(checkUrl, { headers, credentials: 'include' });
      const data = await res.json();

      if (data.isAuthenticated && data.user) {
        setIsAuthenticated(true);
        setUser(data.user);
        if (data.token) {
          try {
            localStorage.setItem('myanmar_seller_token', data.token);
            localStorage.setItem('myanmar_seller_user', JSON.stringify(data.user));
          } catch {}
          setAuthToken(data.token);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }, [authToken]);

  // Load All Authoritative Data
  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);

    const headers = getHeaders();

    try {
      const [
        summaryRes,
        productsRes,
        ordersRes,
        conversationsRes,
        samplesRes,
        configRes,
        storeRes,
        logsRes,
        statusRes,
        healthRes
      ] = await Promise.all([
        fetch('/api/dashboard/summary', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/products', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/orders', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/conversations', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/merchant/samples', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/merchant/ai-config', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/merchant/store', { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/audit-logs', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/auth/config-status').then(r => r.ok ? r.json() : null),
        fetch('/api/ai/health', { headers }).then(r => r.ok ? r.json() : null)
      ]);

      if (summaryRes) setSummary(summaryRes);
      if (Array.isArray(productsRes)) setProducts(productsRes);
      if (Array.isArray(ordersRes)) setOrders(ordersRes);
      if (Array.isArray(conversationsRes)) setConversations(conversationsRes);
      if (Array.isArray(samplesRes)) setSamples(samplesRes);
      if (configRes) setAiConfig(configRes);
      if (storeRes) setStore(storeRes);
      if (Array.isArray(logsRes)) setAuditLogs(logsRes);
      if (statusRes) setProviderStatus(statusRes);
      if (healthRes) setAiHealth(healthRes);
    } catch (err: any) {
      console.error('Failed to load business data', err);
      setDataError(err.message || 'Failed to communicate with authoritative backend.');
    } finally {
      setDataLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated, fetchAllData]);

  // Listen for OAuth messages from popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setAuthLoading(false);
        setAuthError(null);
        const token = event.data.token;
        if (token) {
          try {
            localStorage.setItem('myanmar_seller_token', token);
          } catch {}
          setAuthToken(token);
        }
        if (event.data.user) {
          try {
            localStorage.setItem('myanmar_seller_user', JSON.stringify(event.data.user));
          } catch {}
          setUser(event.data.user);
          setIsAuthenticated(true);
        } else {
          checkAuth(token);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setAuthLoading(false);
        setAuthError(event.data.error || 'Authentication Failed');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkAuth]);

  // Google Login Trigger
  const handleGoogleLogin = async () => {
    if (providerStatus && !providerStatus.google) {
      setConfigTargetProvider('google');
      setIsConfigModalOpen(true);
      return;
    }
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/google/url');
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to get OAuth URL');
      }
      const { url } = await res.json();

      const width = 540;
      const height = 680;
      const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
      const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
      const popup = window.open(
        url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,status=no`
      );

      if (!popup || popup.closed) {
        window.location.href = url;
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to start Google Sign-In');
      setAuthLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Failed to authenticate');
      }
      try {
        localStorage.setItem('myanmar_seller_token', data.token);
        localStorage.setItem('myanmar_seller_user', JSON.stringify(data.user));
      } catch {}
      setAuthToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: getHeaders() });
    } catch {}
    localStorage.removeItem('myanmar_seller_token');
    localStorage.removeItem('myanmar_seller_user');
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Business Mutation Handlers
  const handleUpdateAiConfig = async (newConfig: Partial<AiConfig>) => {
    const res = await fetch('/api/merchant/ai-config', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(newConfig)
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to update AI config');
    }
    await fetchAllData();
  };

  const handleAddProduct = async (productData: any) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(productData)
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to add product');
    }
    await fetchAllData();
  };

  const handleUpdateProduct = async (id: string, updates: any) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to update product');
    }
    await fetchAllData();
  };

  const handleDeleteProduct = async (id: string) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to delete product');
    }
    await fetchAllData();
  };

  const handleAddSample = async (sampleData: any) => {
    const res = await fetch('/api/merchant/samples', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(sampleData)
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to add sample reply');
    }
    await fetchAllData();
  };

  const handleUpdateSample = async (id: string, sampleData: any) => {
    const res = await fetch(`/api/merchant/samples/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(sampleData)
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to update sample reply');
    }
    await fetchAllData();
  };

  const handleDeleteSample = async (id: string) => {
    const res = await fetch(`/api/merchant/samples/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to delete sample reply');
    }
    await fetchAllData();
  };

  const handleConfirmPayment = async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}/confirm-payment`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to confirm payment');
    }
    await fetchAllData();
  };

  const handleSendConversationReply = async (convId: string, text: string) => {
    const res = await fetch(`/api/conversations/${convId}/reply`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to send reply');
    }
    await fetchAllData();
  };

  const handleControlAi = async (convId: string, action: string) => {
    const res = await fetch(`/api/conversations/${convId}/control`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to update conversation control');
    }
    await fetchAllData();
  };

  const handleUpdateStore = async (storeData: Partial<StoreSettings>) => {
    const res = await fetch('/api/merchant/store', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(storeData)
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to update store settings');
    }
    await fetchAllData();
  };

  const handleSaveProvider = async (provider: string, clientId: string, clientSecret: string, callbackUrl?: string) => {
    const res = await fetch('/api/auth/configure-provider', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ provider, clientId, clientSecret, callbackUrl })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to configure provider');
    }
    await fetchAllData();
  };

  const handleTestPreview = async (customerMessage: string, customInstructions?: string, replyStyle?: string): Promise<string> => {
    const res = await fetch('/api/ai/preview', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        customerMessage,
        customInstructions,
        replyStyle,
        preferredLanguage: aiConfig?.preferredLanguage || 'myanmar'
      })
    });

    const contentType = res.headers.get('content-type') || '';
    let d: any;
    if (contentType.includes('application/json')) {
      try {
        d = await res.json();
      } catch (parseErr: any) {
        throw new Error(`Failed to parse AI response as JSON: ${parseErr.message}`);
      }
    } else {
      const rawText = await res.text();
      throw new Error(`Server returned non-JSON response (${res.status}): ${rawText.slice(0, 100)}`);
    }

    if (!res.ok) {
      throw new Error(d.error || 'AI generation failed');
    }
    return d.previewReply;
  };

  const handleNavigateWithFilter = (destination: NavigationDestination, filter?: string) => {
    setCurrentTab(destination);
    setSubFilter(filter);
  };

  // Badges Calculation from Real Database Records
  const messagesReviewCount = conversations.filter(c => c.status === 'needs_human_review' || c.humanReviewReason).length;
  const inventoryAlertCount = products.filter(p => p.variants && p.variants.some(v => Number(v.stock) === 0)).length;
  const paymentsReviewCount = orders.filter(o => o.paymentStatus !== 'CONFIRMED' && o.status !== 'cancelled').length;

  // Unauthenticated Login Screen
  if (isAuthenticated === false) {
    return (
      <main className="min-h-screen bg-[#0B0B09] text-[#F5F2E8] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-[#181810] border border-[#393426] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-[#1E1D14] border border-[#C9A227]/40 rounded-2xl flex items-center justify-center mx-auto text-[#C9A227]">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F2E8]">
              Myanmar AI Seller
            </h1>
            <p className="text-xs text-[#B9B5A7] max-w-xs mx-auto">
              {lang === 'my'
                ? 'လူမှုကွန်ရက် ကုန်သည်များအတွက် သီးသန့် AI အရောင်းကွပ်ကဲမှု စနစ်'
                : 'Mobile-First AI Sales Operating System for Social Merchants.'}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 bg-[#E06B61]/15 border border-[#E06B61]/40 rounded-xl text-xs text-[#E06B61] space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{lang === 'my' ? 'ချိတ်ဆက်မှု မအောင်မြင်ပါ' : 'Sign-In Error'}</span>
              </div>
              <p className="text-[11px] leading-relaxed">{authError}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              disabled={authLoading}
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              <span>{authLoading ? (lang === 'my' ? 'ဝင်ရောက်နေသည်...' : 'Connecting...') : (lang === 'my' ? 'Google ဖြင့် အကောင့်ဝင်မည်' : 'Sign In with Google')}</span>
            </button>

            <button
              type="button"
              disabled={authLoading}
              onClick={handleDevLogin}
              className="w-full py-2.5 px-4 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-xs font-semibold text-[#B9B5A7] hover:text-[#F5F2E8] rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
              <span>{lang === 'my' ? 'စတိုးအကောင့်ဖြင့် ဝင်ရောက်မည် (Yangon Style)' : 'Sign In to Merchant Workspace (Yangon Style)'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setConfigTargetProvider('google');
                setIsConfigModalOpen(true);
              }}
              className="w-full py-2 px-4 bg-[#11110D] hover:bg-[#181810] border border-[#393426] text-xs font-medium text-[#817D70] hover:text-[#B9B5A7] rounded-xl transition-colors cursor-pointer"
            >
              {lang === 'my' ? 'OAuth Credentials ပြင်ဆင်ရန်' : 'Configure OAuth Credentials'}
            </button>
          </div>

          <div className="pt-2 border-t border-[#393426] flex items-center justify-between text-xs text-[#817D70]">
            <span>{lang === 'my' ? 'လုံခြုံစိတ်ချရသော စနစ်' : 'Authoritative Security'}</span>
            <button
              type="button"
              onClick={() => setLang(lang === 'my' ? 'en' : 'my')}
              className="hover:text-[#F5F2E8] text-[#C9A227] font-semibold"
            >
              {lang === 'my' ? 'English' : 'မြန်မာ'}
            </button>
          </div>
        </div>

        <ConfigureModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          configProvider={configTargetProvider}
          providerStatus={providerStatus}
          lang={lang}
          onSaveProvider={handleSaveProvider}
        />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B09] text-[#F5F2E8] flex flex-col font-sans">
      {/* Top Application Header Bar */}
      <header className="sticky top-0 z-40 bg-[#0B0B09]/95 backdrop-blur-md border-b border-[#393426] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Wordmark (Zone 1) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-[#181810] border border-[#C9A227]/40 flex items-center justify-center text-[#C9A227]">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold tracking-tight text-[#F5F2E8] block leading-tight">
                Myanmar AI Seller
              </span>
              <span className="text-[10px] text-[#A88419] font-mono block leading-none">
                Groq AI · Dark Yellow Edition
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (Zone 2 - Single line, clean typography) */}
          <nav
            aria-label="Desktop Primary Navigation"
            className="hidden md:flex items-center gap-1 bg-[#11110D] p-1 rounded-xl border border-[#393426]/70"
          >
            {((user?.role === 'merchant_admin' || user?.role === 'admin' || user?.provider === 'local')
              ? ['home', 'messages', 'inventory', 'ai', 'profile', 'lab']
              : ['home', 'messages', 'inventory', 'ai', 'profile']
            ).map((tab) => {
              const isActive = currentTab === tab;
              const labels: Record<string, { my: string; en: string }> = {
                home: { my: 'ပင်မ', en: 'Home' },
                messages: { my: 'မက်ဆေ့ခ်ျ', en: 'Messages' },
                inventory: { my: 'စတော့', en: 'Inventory' },
                ai: { my: 'AI စနစ်', en: 'AI Seller' },
                profile: { my: 'ပရိုဖိုင်', en: 'Profile' },
                lab: { my: 'AI စမ်းသပ်ခန်း', en: 'AI Testing Lab' }
              };

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCurrentTab(tab as NavigationDestination)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#C9A227] text-[#0B0B09] shadow-sm'
                      : tab === 'lab'
                      ? 'text-[#C9A227] hover:text-[#E0BD55]'
                      : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
                  }`}
                >
                  {tab === 'lab' && <FlaskConical className="w-3.5 h-3.5" />}
                  <span>{lang === 'my' ? labels[tab].my : labels[tab].en}</span>
                </button>
              );
            })}
          </nav>

          {/* Action Zone (Zone 3 - Testing Lab Quick Access, Language & Logout) */}
          <div className="flex items-center gap-2 shrink-0">
            {(user?.role === 'merchant_admin' || user?.role === 'admin' || user?.provider === 'local') && (
              <button
                type="button"
                onClick={() => setCurrentTab('lab')}
                className={`md:hidden px-2.5 py-1.5 border text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'lab'
                    ? 'bg-[#C9A227] text-[#0B0B09] border-[#C9A227]'
                    : 'bg-[#181810] hover:bg-[#252419] border-[#C9A227]/40 text-[#C9A227] hover:text-[#F5F2E8]'
                }`}
                title={lang === 'my' ? 'AI Chat စမ်းသပ်ခန်း' : 'AI Testing Lab'}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Lab</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setLang(lang === 'my' ? 'en' : 'my')}
              className="px-2.5 py-1.5 bg-[#181810] hover:bg-[#252419] border border-[#393426] text-xs font-semibold text-[#B9B5A7] hover:text-[#F5F2E8] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-[#C9A227]" />
              <span className="font-mono uppercase">{lang}</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 bg-[#181810] hover:bg-[#252419] border border-[#393426] text-[#817D70] hover:text-[#E06B61] rounded-lg transition-colors cursor-pointer"
              title={lang === 'my' ? 'အကောင့်ထွက်မည်' : 'Sign Out'}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content View Container (Padding bottom ensures persistent bottom nav never hides content) */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-24">
        {dataError && (
          <div className="mb-4 p-3 bg-[#E06B61]/10 border border-[#E06B61]/40 rounded-xl text-xs text-[#E06B61] flex items-center justify-between gap-2">
            <span>{dataError}</span>
            <button
              type="button"
              onClick={fetchAllData}
              className="text-[#F5F2E8] font-bold underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Five Persistent Primary Destinations */}
        {currentTab === 'home' && (
          <HomeView
            summary={summary}
            loading={dataLoading}
            error={dataError}
            products={products}
            orders={orders}
            auditLogs={auditLogs}
            aiHealth={aiHealth}
            storeName={store?.storeName || 'Yangon Style Fashion & Apparel'}
            lang={lang}
            onNavigate={handleNavigateWithFilter}
            onEditProduct={() => {
              setCurrentTab('inventory');
            }}
            onRefresh={fetchAllData}
          />
        )}

        {currentTab === 'messages' && (
          <MessagesView
            conversations={conversations}
            loading={dataLoading}
            providerStatus={providerStatus}
            lang={lang}
            onSendReply={handleSendConversationReply}
            onControlAi={handleControlAi}
            onOpenConfig={(provider) => {
              setConfigTargetProvider(provider);
              setIsConfigModalOpen(true);
            }}
            onRefresh={fetchAllData}
            initialFilter={subFilter}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryView
            products={products}
            loading={dataLoading}
            lang={lang}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            initialFilter={subFilter}
          />
        )}

        {currentTab === 'ai' && (
          <AiSellerView
            config={aiConfig}
            samples={samples}
            products={products}
            aiHealth={aiHealth}
            lang={lang}
            onUpdateConfig={handleUpdateAiConfig}
            onAddSample={handleAddSample}
            onUpdateSample={handleUpdateSample}
            onDeleteSample={handleDeleteSample}
            onTestPreview={handleTestPreview}
            onOpenLab={() => setCurrentTab('lab')}
          />
        )}

        {currentTab === 'lab' && (user?.role === 'merchant_admin' || user?.role === 'admin' || user?.provider === 'local') && (
          <AiTestingLabView
            lang={lang}
            user={user}
            products={products}
            samples={samples}
            aiConfig={aiConfig}
            aiHealth={aiHealth}
            getHeaders={getHeaders}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileView
            store={store}
            orders={orders}
            providerStatus={providerStatus}
            user={user}
            lang={lang}
            onUpdateStore={handleUpdateStore}
            onConfirmPayment={handleConfirmPayment}
            onOpenConfig={(provider) => {
              setConfigTargetProvider(provider);
              setIsConfigModalOpen(true);
            }}
            onLogout={handleLogout}
            onOpenPublicStore={() => setIsPublicStoreOpen(true)}
            initialTab={subFilter}
          />
        )}
      </main>

      {/* Persistent Mobile Bottom Navigation (Strict 5 items with authoritative badges) */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSubFilter(undefined);
        }}
        lang={lang}
        badges={{
          messagesReviewCount,
          inventoryAlertCount,
          paymentsReviewCount
        }}
      />

      {/* Modals */}
      <ConfigureModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        configProvider={configTargetProvider}
        providerStatus={providerStatus}
        lang={lang}
        onSaveProvider={handleSaveProvider}
      />

      <PublicStoreModal
        isOpen={isPublicStoreOpen}
        onClose={() => setIsPublicStoreOpen(false)}
        store={store}
        products={products}
        lang={lang}
        onOrderCreated={fetchAllData}
      />
    </div>
  );
}
