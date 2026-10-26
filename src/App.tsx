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
import { CustomerStorefrontView } from './components/CustomerStorefrontView';
import { MarketplaceView } from './components/MarketplaceView';
import { OnboardingView } from './components/OnboardingView';
import { AccountingView } from './components/AccountingView';
import { AiStudioView } from './components/AiStudioView';

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

  // Dedicated Public Storefront & Marketplace Routing Detection
  const [publicStoreSlug, setPublicStoreSlug] = useState<string | null>(() => {
    try {
      if (typeof window === 'undefined') return null;
      const pathMatch = window.location.pathname.match(/^\/store\/([a-zA-Z0-9_-]+)/);
      if (pathMatch) return pathMatch[1];

      const params = new URLSearchParams(window.location.search);
      const querySlug = params.get('store');
      if (querySlug) return querySlug;

      const hashMatch = window.location.hash.match(/#\/?store\/([a-zA-Z0-9_-]+)/) || window.location.hash.match(/#.*store=([a-zA-Z0-9_-]+)/);
      if (hashMatch) return hashMatch[1];

      return null;
    } catch {
      return null;
    }
  });

  const [isMarketplace, setIsMarketplace] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      if (window.location.pathname.startsWith('/marketplace')) return true;
      const params = new URLSearchParams(window.location.search);
      if (params.get('page') === 'marketplace' || params.has('marketplace')) return true;
      if (window.location.hash.includes('marketplace')) return true;
      return false;
    } catch {
      return false;
    }
  });

  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => {
    try {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      return params.get('product') || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleLocationChange = () => {
      try {
        const path = window.location.pathname;
        const search = window.location.search;
        const hash = window.location.hash;

        if (path.startsWith('/marketplace') || search.includes('page=marketplace') || hash.includes('marketplace')) {
          setIsMarketplace(true);
          setPublicStoreSlug(null);
          setSelectedProductId(null);
          return;
        }

        const pathMatch = path.match(/^\/store\/([a-zA-Z0-9_-]+)/);
        if (pathMatch) {
          setPublicStoreSlug(pathMatch[1]);
          setIsMarketplace(false);
          const params = new URLSearchParams(search);
          setSelectedProductId(params.get('product') || null);
          return;
        }

        const params = new URLSearchParams(search);
        const querySlug = params.get('store');
        if (querySlug) {
          setPublicStoreSlug(querySlug);
          setIsMarketplace(false);
          setSelectedProductId(params.get('product') || null);
          return;
        }

        const hashMatch = hash.match(/#\/?store\/([a-zA-Z0-9_-]+)/) || hash.match(/#.*store=([a-zA-Z0-9_-]+)/);
        if (hashMatch) {
          setPublicStoreSlug(hashMatch[1]);
          setIsMarketplace(false);
          return;
        }

        setPublicStoreSlug(null);
        setIsMarketplace(false);
        setSelectedProductId(null);
      } catch {
        setPublicStoreSlug(null);
        setIsMarketplace(false);
        setSelectedProductId(null);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Sync document title with active customer or merchant context
  useEffect(() => {
    if (isMarketplace) {
      document.title = 'ShopSone (ဆိုင်စုံ) - ဆိုင်စုံ၊ ပစ္စည်းစုံ၊ တစ်နေရာတည်း | Powered by Myanmar AI Seller';
    } else if (publicStoreSlug) {
      document.title = `${publicStoreSlug} | Powered by Myanmar AI Seller`;
    } else {
      document.title = 'Myanmar AI Seller - Merchant Platform';
    }
  }, [isMarketplace, publicStoreSlug]);

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

  // Facebook Login Trigger
  const handleFacebookLogin = () => {
    setAuthLoading(true);
    setAuthError(null);
    const width = 540;
    const height = 680;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
    const popup = window.open(
      '/api/auth/facebook',
      'facebook_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,status=no`
    );
    if (!popup || popup.closed) {
      window.location.href = '/api/auth/facebook';
    }
  };

  // TikTok Login Trigger
  const handleTiktokLogin = () => {
    setAuthLoading(true);
    setAuthError(null);
    const width = 540;
    const height = 680;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
    const popup = window.open(
      '/api/auth/tiktok',
      'tiktok_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,status=no`
    );
    if (!popup || popup.closed) {
      window.location.href = '/api/auth/tiktok';
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

  // Dedicated Public Customer Storefront (Accessible to all shoppers without merchant authentication)
  if (publicStoreSlug) {
    return (
      <CustomerStorefrontView
        slug={publicStoreSlug}
        initialProductId={selectedProductId}
        onNavigateToMarketplace={() => {
          try {
            window.history.pushState({}, '', '/marketplace');
          } catch {}
          setIsMarketplace(true);
          setPublicStoreSlug(null);
          setSelectedProductId(null);
        }}
        onNavigateToMerchant={() => {
          try {
            window.history.pushState({}, '', '/');
          } catch {}
          setPublicStoreSlug(null);
          setIsMarketplace(false);
          setSelectedProductId(null);
        }}
      />
    );
  }

  // Dedicated Public Multi-Store Marketplace (Accessible to all shoppers without merchant authentication)
  if (isMarketplace) {
    return (
      <MarketplaceView
        onSelectStore={(slug, productId) => {
          try {
            const url = productId ? `/store/${slug}?product=${productId}` : `/store/${slug}`;
            window.history.pushState({}, '', url);
          } catch {}
          setPublicStoreSlug(slug);
          setSelectedProductId(productId || null);
          setIsMarketplace(false);
        }}
        onNavigateToMerchant={() => {
          try {
            window.history.pushState({}, '', '/');
          } catch {}
          setIsMarketplace(false);
          setPublicStoreSlug(null);
          setSelectedProductId(null);
        }}
      />
    );
  }

  // Authenticated but requires shop onboarding
  if (isAuthenticated === true && user && !user.merchantId) {
    return (
      <OnboardingView
        user={user}
        lang={lang}
        onCompleteOnboarding={async (onboardingData) => {
          const res = await fetch('/api/merchant/onboard', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(onboardingData)
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Onboarding failed');
          }
          if (data.token) {
            try {
              localStorage.setItem('myanmar_seller_token', data.token);
              localStorage.setItem('myanmar_seller_user', JSON.stringify(data.user));
            } catch {}
            setAuthToken(data.token);
            setUser(data.user);
          }
          await fetchAllData();
        }}
        onLogout={handleLogout}
      />
    );
  }

  // Unauthenticated Login Screen (Only the Login Box is displayed)
  if (isAuthenticated === false) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white border border-[#CBD5E1] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center mx-auto text-[#2563EB] shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
              ShopSone (ဆိုင်စုံ)
            </h1>
            <p className="text-xs text-[#2563EB] font-mono font-semibold">
              Myanmar AI Seller
            </p>
            <p className="text-xs text-[#64748B] max-w-xs mx-auto">
              {lang === 'my'
                ? 'လူမှုကွန်ရက် ကုန်သည်များအတွက် သီးသန့် AI အရောင်းကွပ်ကဲမှု စနစ်'
                : 'Mobile-First AI Sales Operating System for Social Merchants.'}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
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
              className="w-full py-3 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
              <span>{authLoading ? (lang === 'my' ? 'ဝင်ရောက်နေသည်...' : 'Connecting...') : (lang === 'my' ? 'Google ဖြင့် အကောင့်ဝင်မည်' : 'Sign In with Google')}</span>
            </button>

            <button
              type="button"
              disabled={authLoading}
              onClick={handleFacebookLogin}
              className="w-full py-3 px-4 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              <span>{lang === 'my' ? 'Facebook ဖြင့် အကောင့်ဝင်မည်' : 'Sign In with Facebook'}</span>
            </button>

            <button
              type="button"
              disabled={authLoading}
              onClick={handleTiktokLogin}
              className="w-full py-3 px-4 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              <span>{lang === 'my' ? 'TikTok ဖြင့် အကောင့်ဝင်မည်' : 'Sign In with TikTok'}</span>
            </button>
          </div>

          <div className="pt-2 border-t border-[#CBD5E1] flex items-center justify-between text-xs text-[#64748B]">
            <span>{lang === 'my' ? 'လုံခြုံစိတ်ချရသော စနစ်' : 'Authoritative Security'}</span>
            <button
              type="button"
              onClick={() => setLang(lang === 'my' ? 'en' : 'my')}
              className="hover:text-[#0F172A] text-[#2563EB] font-semibold cursor-pointer"
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
    <div className="min-h-screen bg-[#E9EEF5] text-[#0F172A] flex flex-col font-sans">
      {/* Top Application Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#CBD5E1] px-4 sm:px-6 py-4 sm:py-5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Wordmark (Zone 1) */}
          <div className="flex items-center gap-3 sm:gap-3.5 shrink-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-[#DBEAFE] flex items-center justify-center overflow-hidden shadow-sm">
              <img
                src="/assets/aistudio/1792178753519_42de44bf.jpg"
                alt="ShopSone"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-[#0F172A] block leading-tight">
                ShopSone (ဆိုင်စုံ)
              </span>
              <span className="text-[11px] sm:text-xs text-[#2563EB] font-mono block leading-none font-semibold mt-1">
                Myanmar AI Seller
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (Zone 2 - Single line, clean typography) */}
          <nav
            aria-label="Desktop Primary Navigation"
            className="hidden md:flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl border border-[#CBD5E1]"
          >
            {((user?.role === 'merchant_admin' || user?.role === 'admin' || user?.provider === 'local')
              ? ['home', 'messages', 'inventory', 'accounting', 'aistudio', 'ai', 'profile', 'lab']
              : ['home', 'messages', 'inventory', 'accounting', 'aistudio', 'ai', 'profile']
            ).map((tab) => {
              const isActive = currentTab === tab;
              const labels: Record<string, { my: string; en: string }> = {
                home: { my: 'ပင်မ', en: 'Home' },
                messages: { my: 'မက်ဆေ့ခ်ျ', en: 'Messages' },
                inventory: { my: 'စတော့', en: 'Inventory' },
                accounting: { my: 'စာရင်းကိုင်', en: 'Accounting' },
                aistudio: { my: 'AI Studio', en: 'AI Studio' },
                ai: { my: 'AI စနစ်', en: 'AI Seller' },
                profile: { my: 'ပရိုဖိုင်', en: 'Profile' },
                lab: { my: 'AI စမ်းသပ်ခန်း', en: 'AI Testing Lab' }
              };

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCurrentTab(tab as NavigationDestination)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : tab === 'lab'
                      ? 'text-[#2563EB] hover:text-[#1D4ED8] font-bold'
                      : 'text-[#475569] hover:text-[#0F172A]'
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
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'bg-white hover:bg-[#F8FAFC] border-[#CBD5E1] text-[#2563EB] hover:text-[#1D4ED8]'
                }`}
                title={lang === 'my' ? 'AI Chat စမ်းသပ်ခန်း' : 'AI Testing Lab'}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Lab</span>
              </button>
            )}

            {/* Public Marketplace Link */}
            <button
              type="button"
              onClick={() => {
                try {
                  window.history.pushState({}, '', '/marketplace');
                } catch {}
                setIsMarketplace(true);
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              title={lang === 'my' ? 'ဆိုင်စုံ (ShopSone) သို့ သွားမည်' : 'View ShopSone Marketplace'}
            >
              <Store className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="hidden sm:inline">{lang === 'my' ? 'ဆိုင်စုံ' : 'ShopSone'}</span>
            </button>

            <button
              type="button"
              onClick={() => setLang(lang === 'my' ? 'en' : 'my')}
              className="px-2.5 py-1.5 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-semibold text-[#475569] hover:text-[#0F172A] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="font-mono uppercase">{lang}</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#64748B] hover:text-[#E06B61] rounded-lg transition-colors cursor-pointer"
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
            getHeaders={getHeaders}
          />
        )}

        {currentTab === 'accounting' && (
          <AccountingView
            lang={lang}
            getHeaders={getHeaders}
            products={products}
            onNavigateToInventory={() => setCurrentTab('inventory')}
          />
        )}

        {currentTab === 'aistudio' && (
          <AiStudioView
            products={products}
            lang={lang}
            getHeaders={getHeaders}
            onProductUpdated={() => fetchAllData()}
            onNavigateToInventory={() => setCurrentTab('inventory')}
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
