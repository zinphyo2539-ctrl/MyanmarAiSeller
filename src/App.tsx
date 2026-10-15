/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Settings,
  MessageSquare,
  Package,
  ShoppingCart,
  ShieldCheck,
  Globe,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  RefreshCw,
  Sliders,
  HelpCircle,
  Send,
  Terminal,
  Check,
  X,
  FileText,
  Lock,
  Store,
  ExternalLink,
  ShoppingBag,
  ArrowLeft,
  Eye,
  CheckSquare
} from 'lucide-react';

interface AiConfig {
  enabled: boolean;
  preferredLanguage: string;
  replyStyle: string;
  customInstructions: string;
  salesBehavior: {
    greeting: string;
    responseLength: string;
    emojiPreference: string;
    productRecommendation: string;
    followUp: string;
    salesApproach: string;
    discountBehavior: string;
    uncertainPolicy: string;
  };
  humanHandoff: {
    enabled: boolean;
    triggerOnUncertain: boolean;
    triggerOnComplaint: boolean;
    triggerOnHumanRequest: boolean;
    notificationChannel: string;
  };
}

interface SampleReply {
  id: string;
  customerMessage: string;
  preferredReply: string;
  category: string;
}

interface Variant {
  id: string;
  color: string;
  size: string;
  stock: number;
  sku: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  description: string;
  variants: Variant[];
  discount: string | null;
  status: string;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: Array<{ name: string; variant: string; price: number; qty: number }>;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  shippingAddress: string;
  status: string;
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt: string;
}

interface StoreSettings {
  slug: string;
  storeName: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  deliveryInfo: string;
  paymentInstructions: string;
  isPublished: boolean;
}

export default function App() {
  const [lang, setLang] = useState<'my' | 'en'>('my');
  const [viewMode, setViewMode] = useState<'admin' | 'public_store'>('admin');
  const [activeTab, setActiveTab] = useState<'store' | 'config' | 'preview' | 'products' | 'orders' | 'chat' | 'playground'>('playground');
  
  // State
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [samples, setSamples] = useState<SampleReply[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sample form state
  const [editingSampleId, setEditingSampleId] = useState<string | null>(null);
  const [sampleForm, setSampleForm] = useState({ customerMessage: '', preferredReply: '', category: 'Greeting' });
  const [isAddingSample, setIsAddingSample] = useState(false);

  // Product CRUD state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    price: 10000,
    description: '',
    discount: '',
    status: 'active',
    variants: [{ color: 'Black', size: 'M', stock: 10, sku: 'SKU-V1' }]
  });

  // Preview state
  const [previewQuery, setPreviewQuery] = useState('');
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Chat simulator state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'customer' | 'ai'; text: string; time: string }>>([
    { sender: 'ai', text: lang === 'my' ? 'မင်္ဂလာပါရှင်။ Myanmar AI Seller မှ ကြိုဆိုပါတယ်ရှင်။ ဘာများ ကူညီပေးရမလဲရှင်။' : 'Hello! Welcome to Myanmar AI Seller. How can I help you today?', time: 'Just now' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Customer AI Playground State
  const [playgroundSuggestions, setPlaygroundSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [playgroundMessages, setPlaygroundMessages] = useState<Array<{ sender: 'customer' | 'ai'; text: string; time: string }>>([]);
  const [playgroundInput, setPlaygroundInput] = useState('');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);

  const fetchPlaygroundSuggestions = async () => {
    if (suggestionsLoading) return;
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const res = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch suggestions');
      setPlaygroundSuggestions(data.suggestions || []);
    } catch (err: any) {
      setSuggestionsError(err.message || 'Failed to generate suggestions');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'playground' && playgroundSuggestions.length === 0 && !suggestionsLoading) {
      fetchPlaygroundSuggestions();
    }
  }, [activeTab]);

  const handlePlaygroundSend = async (questionText: string) => {
    if (!questionText.trim() || playgroundLoading) return;
    const q = questionText.trim();
    setPlaygroundInput('');
    setPlaygroundMessages(prev => [...prev, { sender: 'customer', text: q, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setPlaygroundLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ customerMessage: q })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');
      setPlaygroundMessages(prev => [...prev, { sender: 'ai', text: data.reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch (err: any) {
      setPlaygroundMessages(prev => [...prev, { sender: 'ai', text: `[Error] ${err.message}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setPlaygroundLoading(false);
    }
  };

  // Public Storefront Cart & Checkout State
  const [publicStoreData, setPublicStoreData] = useState<{ store: StoreSettings; products: Product[] } | null>(null);
  const [cart, setCart] = useState<Array<{ productId: string; variantId: string; name: string; variantName: string; price: number; qty: number; maxStock: number }>>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ customerName: '', customerPhone: '', shippingAddress: '', paymentMethod: 'KBZPay' });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  // User role for payment confirmation testing
  const [user, setUser] = useState<any>(() => {
    try {
      const savedUser = localStorage.getItem('myanmar_seller_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('myanmar_seller_token');
    } catch (e) {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const getHeaders = (overrideToken?: string) => {
    const token = overrideToken || authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('myanmar_seller_token') : null);
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const [authError, setAuthError] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [configProvider, setConfigProvider] = useState<'google' | 'facebook' | 'tiktok'>('google');
  const [providerConfigInput, setProviderConfigInput] = useState({ clientId: '', clientSecret: '' });
  const [configSaving, setConfigSaving] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState<{ google: boolean; facebook: boolean; tiktok: boolean; googleCallbackUrl?: string } | null>(null);

  // Listen for OAuth completion from popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setGoogleLoading(false);
        setAuthError(null);
        const token = event.data.token;
        if (token) {
          try {
            localStorage.setItem('myanmar_seller_token', token);
          } catch(e) {}
          setAuthToken(token);
        }
        if (event.data.user) {
          try {
            localStorage.setItem('myanmar_seller_user', JSON.stringify(event.data.user));
          } catch(e) {}
          setUser(event.data.user);
          setIsAuthenticated(true);
          fetchData(token);
        } else {
          checkAuth(token);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setGoogleLoading(false);
        setAuthError(event.data.error || 'Google Sign-In မအောင်မြင်ပါ');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Window focus listener to re-verify authentication when returning from OAuth popup tab
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated !== true) {
        checkAuth();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, authToken]);

  useEffect(() => {
    // Check URL parameters for OAuth tokens or errors
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('auth_token');
    const err = params.get('error');
    const details = params.get('details');

    if (tokenFromUrl) {
      try {
        localStorage.setItem('myanmar_seller_token', tokenFromUrl);
      } catch (e) {}
      setAuthToken(tokenFromUrl);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      checkAuth(tokenFromUrl);
    } else {
      checkAuth();
    }

    fetchProviderStatus();

    if (err) {
      if (err === 'google_not_configured') {
        setAuthError(lang === 'my' 
          ? 'Google OAuth မချိတ်ဆက်ရသေးပါ။ Google Cloud Console မှ Client ID နှင့် Secret ကို ထည့်သွင်းပေးရန် လိုအပ်ပါသည်။' 
          : 'Google OAuth is not configured yet. Please enter your Client ID and Client Secret.');
        setShowConfigModal(true);
        setConfigProvider('google');
      } else if (err === 'invalid_client') {
        setAuthError(lang === 'my' 
          ? `Google Authentication မအောင်မြင်ပါ (Error 401: invalid_client)။ Client ID သည် Google Cloud Console တွင် မရှိသေးခြင်း သို့မဟုတ် မှားယွင်းနေခြင်းကြောင့် ဖြစ်ပါသည်။ ${details ? '(' + details + ')' : ''}` 
          : `Google Authentication failed (Error 401: invalid_client). The OAuth Client was not found or the Client ID is incorrect. ${details ? '(' + details + ')' : ''}`);
      } else if (err === 'google_failed' || err === 'access_denied') {
        setAuthError(lang === 'my' 
          ? `Google Sign-In ချိတ်ဆက်မှု မအောင်မြင်ပါ (Error 403 / Access Denied)။ အကယ်၍ Google Cloud Console တွင် Publishing Status သည် "Testing" ဖြစ်နေပါက OAuth consent screen > Test users ထဲတွင် သင့် Gmail (${details || 'zinphyo2539@gmail.com'}) ကို Add ထည့်သွင်းပေးထားရပါမည်။` 
          : `Google Sign-In failed (Error 403 / Access Denied). If the OAuth consent screen status is "Testing", please add your email under Test Users in Google Cloud Console.`);
      } else if (err === 'facebook_not_configured') {
        setAuthError(lang === 'my' ? 'Facebook App ID မထည့်ရသေးပါ။' : 'Facebook App ID is not configured.');
      } else if (err === 'tiktok_not_configured') {
        setAuthError(lang === 'my' ? 'TikTok Client Key မထည့်ရသေးပါ။' : 'TikTok Client Key is not configured.');
      } else {
        setAuthError(details ? `${err}: ${details}` : err);
      }
    }
  }, [lang]);

  const fetchProviderStatus = async () => {
    try {
      const res = await fetch('/api/auth/config-status');
      if (res.ok) {
        const data = await res.json();
        setProviderStatus(data);
      }
    } catch (e) {
      console.error('Failed to load auth provider status', e);
    }
  };

  const checkAuth = async (overrideToken?: string) => {
    try {
      const token = overrideToken || authToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('myanmar_seller_token') : null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
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
          } catch(e) {}
          setAuthToken(data.token);
        }
        fetchData(data.token || token || undefined);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (providerStatus && !providerStatus.google) {
      setShowConfigModal(true);
      setConfigProvider('google');
      return;
    }
    setGoogleLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/google/url');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get Google login URL');
      }
      const { url } = await res.json();

      // In iframe preview environment, OAuth MUST open directly in popup window
      const width = 540;
      const height = 680;
      const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
      const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
      const popup = window.open(
        url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,status=no`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        const openDirect = confirm(lang === 'my'
          ? 'Browser pop-up ကို ပိတ်ထားသည့်အတွက် Google Sign-In ဝင်းဒိုး တိုက်ရိုက် မပွင့်နိုင်ပါ။ တိုက်ရိုက်ဖွင့်လိုပါသလား?'
          : 'Pop-up was blocked by browser. Open directly?');
        if (openDirect) {
          window.location.href = url;
        }
        setGoogleLoading(false);
        return;
      }

      // Poll periodically in case postMessage does not trigger across cross-origin iframe
      const timer = setInterval(async () => {
        try {
          const savedToken = localStorage.getItem('myanmar_seller_token');
          if (popup.closed) {
            clearInterval(timer);
            setGoogleLoading(false);
            checkAuth(savedToken || undefined);
          } else {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (savedToken) headers['Authorization'] = `Bearer ${savedToken}`;
            const checkUrl = savedToken ? `/api/auth/me?token=${encodeURIComponent(savedToken)}` : '/api/auth/me';
            const meRes = await fetch(checkUrl, { headers, credentials: 'include' });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData.isAuthenticated && meData.user) {
                clearInterval(timer);
                try { popup.close(); } catch(e) {}
                setGoogleLoading(false);
                setIsAuthenticated(true);
                setUser(meData.user);
                if (meData.token) {
                  try {
                    localStorage.setItem('myanmar_seller_token', meData.token);
                    localStorage.setItem('myanmar_seller_user', JSON.stringify(meData.user));
                  } catch(e) {}
                  setAuthToken(meData.token);
                }
                fetchData(meData.token || savedToken || undefined);
              }
            }
          }
        } catch(e) {}
      }, 1200);

    } catch (err: any) {
      console.error('Google login error', err);
      setAuthError(err.message || 'Google login failed');
      setGoogleLoading(false);
    }
  };

  const handleDevLogin = async () => {
    try {
      const res = await fetch('/api/auth/dev-login', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success && data.user) {
        if (data.token) {
          try {
            localStorage.setItem('myanmar_seller_token', data.token);
            localStorage.setItem('myanmar_seller_user', JSON.stringify(data.user));
          } catch(e) {}
          setAuthToken(data.token);
        }
        setUser(data.user);
        setIsAuthenticated(true);
        fetchData(data.token);
      }
    } catch (err: any) {
      alert('Developer login failed: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: getHeaders(), credentials: 'include' });
    } catch (e) {
      console.error('Logout error', e);
    }
    try {
      localStorage.removeItem('myanmar_seller_token');
      localStorage.removeItem('myanmar_seller_user');
    } catch(e) {}
    setAuthToken(null);
    setIsAuthenticated(false);
    setUser(null);
  };

  const handleSaveProviderConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerConfigInput.clientId || !providerConfigInput.clientSecret) {
      alert(lang === 'my' ? 'Client ID နှင့် Client Secret နှစ်ခုလုံး ထည့်သွင်းပေးပါ' : 'Please fill in both Client ID and Client Secret');
      return;
    }

    const trimmedId = providerConfigInput.clientId.trim().replace(/^['"]|['"]$/g, '');
    const trimmedSecret = providerConfigInput.clientSecret.trim().replace(/^['"]|['"]$/g, '');

    if (configProvider === 'google') {
      if (trimmedId.startsWith('GOCSPX-')) {
        alert(lang === 'my' 
          ? 'သတိပြုရန်: GOCSPX- သည် Client Secret ဖြစ်ပါသည်။ Client ID (xxx.apps.googleusercontent.com) ကို ထည့်သွင်းပေးပါ။' 
          : 'Notice: GOCSPX- is the Client Secret. Please paste the Client ID ending with .apps.googleusercontent.com into the Client ID field.');
        return;
      }
      if (!trimmedId.includes('.apps.googleusercontent.com')) {
        alert(lang === 'my' 
          ? 'Google Client ID သည် .apps.googleusercontent.com ဖြင့် ဆုံးရပါမည်။ Google Cloud Console > Credentials > OAuth client ID (Web application) မှ ကူးယူထည့်သွင်းပေးပါ။' 
          : 'Google Client ID must end with .apps.googleusercontent.com. Please copy the OAuth client ID for Web application from Google Cloud Console.');
        return;
      }
    }

    setConfigSaving(true);
    try {
      const res = await fetch('/api/auth/configure-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: configProvider,
          clientId: trimmedId,
          clientSecret: trimmedSecret
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save credentials');

      alert(lang === 'my' ? 'Google ဆက်တင်ကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။ Google Login စတင်ချိတ်ဆက်ပါမည်။' : 'Google credentials saved successfully! Redirecting to Google Login...');
      setShowConfigModal(false);
      setAuthError(null);
      await fetchProviderStatus();

      // Proceed to authenticate with real Google OAuth
      window.location.href = '/api/auth/google';
    } catch (err: any) {
      alert('Error saving credentials: ' + err.message);
    } finally {
      setConfigSaving(false);
    }
  };

  const LoginScreen = () => (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl border border-[#E7E5E4] shadow-xl w-full max-w-md flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
          <Bot className="w-10 h-10" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#292524]">Myanmar AI Seller</h1>
          <p className="text-xs text-[#78716C] mt-1">
            {lang === 'my' ? 'သင်၏ စျေးဆိုင်နှင့် AI အရောင်းအကူကို စတင်စီမံပါ' : 'Commercial Merchant & AI Sales System'}
          </p>
        </div>

        {authError && (
          <div className="w-full bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{authError}</span>
            </div>
            <button
              onClick={() => { setShowConfigModal(true); setConfigProvider('google'); }}
              className="text-left font-bold text-orange-700 underline text-[11px] hover:text-orange-800"
            >
              {lang === 'my' ? '👉 Google Client ID နှင့် Secret ထည့်သွင်းရန် နှိပ်ပါ' : '👉 Click here to configure Google Client ID & Secret'}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full">
          {/* Continue with Google */}
          <div className="flex flex-col gap-1">
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="flex items-center justify-center gap-3 w-full bg-white border border-[#E7E5E4] text-[#292524] py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer text-xs sm:text-sm disabled:opacity-75"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>{googleLoading ? (lang === 'my' ? 'Google ဖြင့် ဝင်နေသည်...' : 'Signing in with Google...') : 'Continue with Google'}</span>
              {providerStatus && providerStatus.google ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Ready
                </span>
              ) : (
                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                  {lang === 'my' ? 'Setup လိုအပ်' : 'Setup needed'}
                </span>
              )}
            </button>
            {googleLoading && (
              <div className="flex flex-col gap-2 p-3 mt-1 bg-orange-50 border border-orange-200 rounded-xl text-center">
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-orange-900">
                  <div className="w-3.5 h-3.5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                  <span>{lang === 'my' ? 'Google ဝင်ရောက်မှု စစ်ဆေးနေပါသည်...' : 'Completing sign-in...'}</span>
                </div>
                <p className="text-[11px] text-orange-800 leading-normal">
                  {lang === 'my'
                    ? 'Pop-up ဝင်းဒိုးတွင် အကောင့်ရွေးချယ်ပြီးပါက အောက်ပါခလုတ်ကို နှိပ်၍ တိုက်ရိုက်ဝင်ရောက်နိုင်ပါသည်:'
                    : 'If sign-in popup completed, click below to enter directly:'}
                </p>
                <button
                  type="button"
                  onClick={() => checkAuth()}
                  className="w-full py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer transition-all"
                >
                  {lang === 'my' ? '👉 Sign-In အောင်မြင်ပြီးပါပြီ (စနစ်ထဲသို့ ဝင်မည်)' : '👉 Sign-In Complete (Enter App)'}
                </button>
              </div>
            )}
          </div>

          {/* Continue with Facebook */}
          <button
            onClick={() => {
              if (providerStatus && !providerStatus.facebook) {
                setShowConfigModal(true);
                setConfigProvider('facebook');
              } else {
                window.location.href = '/api/auth/facebook';
              }
            }}
            className="flex items-center justify-center gap-3 w-full bg-[#1877F2] text-white py-3 rounded-xl font-semibold hover:bg-[#166FE5] transition-colors shadow-2xs cursor-pointer text-xs sm:text-sm"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Continue with Facebook</span>
            {providerStatus && !providerStatus.facebook && (
              <span className="text-[10px] bg-blue-800 text-white px-1.5 py-0.5 rounded font-normal">Setup</span>
            )}
          </button>

          {/* Continue with TikTok */}
          <button
            onClick={() => {
              if (providerStatus && !providerStatus.tiktok) {
                setShowConfigModal(true);
                setConfigProvider('tiktok');
              } else {
                window.location.href = '/api/auth/tiktok';
              }
            }}
            className="flex items-center justify-center gap-3 w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-900 transition-colors shadow-2xs cursor-pointer text-xs sm:text-sm"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
            </svg>
            <span>Continue with TikTok</span>
            {providerStatus && !providerStatus.tiktok && (
              <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded font-normal">Setup</span>
            )}
          </button>
        </div>

        {/* Developer Sandbox Login Option */}
        <div className="w-full pt-4 border-t border-[#E7E5E4] flex flex-col gap-2">
          <button
            onClick={handleDevLogin}
            className="w-full py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-800 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-orange-200 shadow-2xs"
          >
            <ShieldCheck className="w-4 h-4 text-orange-600" />
            <span>{lang === 'my' ? 'စမ်းသပ်အသုံးပြုရန် (Dev Sandbox Login)' : 'Merchant Sandbox Access (Instant Test)'}</span>
          </button>
          <p className="text-[11px] text-[#78716C] text-center">
            {lang === 'my' ? 'OAuth စစ်ဆေးနေချိန်အတွင်း ချက်ချင်းစမ်းသပ်အသုံးပြုနိုင်ပါသည်' : 'Quick access to test store & AI features during setup'}
          </p>
        </div>

        <div className="flex items-center justify-between w-full pt-2">
          <button
            onClick={() => { setShowConfigModal(true); setConfigProvider('google'); }}
            className="text-xs text-[#78716C] hover:text-[#292524] flex items-center gap-1 font-medium cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-orange-600" />
            <span>{lang === 'my' ? 'OAuth ဆက်တင်' : 'OAuth Settings'}</span>
          </button>

          <button onClick={() => setLang(lang === 'my' ? 'en' : 'my')} className="text-xs text-orange-600 font-semibold hover:underline cursor-pointer">
            {lang === 'my' ? 'English' : 'မြန်မာ'}
          </button>
        </div>
      </div>

      {/* OAuth Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#E7E5E4] shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-base text-[#292524]">
                  {configProvider === 'google' ? 'Google OAuth ချိတ်ဆက်ခြင်း' : `${configProvider} OAuth Configuration`}
                </h3>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="text-[#78716C] hover:text-[#292524] p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {configProvider === 'google' && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-950 flex flex-col gap-2">
                <div className="font-bold flex items-center gap-1.5 text-blue-900">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Google Cloud Console အဆင့်ဆင့်ပြုလုပ်နည်း (Step-by-Step):</span>
                </div>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-blue-900 leading-relaxed">
                  <li>Google Cloud Console တွင် Project: <strong>Myanmar AI Seller</strong> ကို ရွေးချယ်ပါ။</li>
                  <li><strong>APIs & Services &gt; Credentials</strong> သို့ သွားပါ။</li>
                  <li><strong>+ CREATE CREDENTIALS &gt; OAuth client ID</strong> ကို နှိပ်ပါ။</li>
                  <li>Application type နေရာတွင် <strong>Web application</strong> ကို ရွေးပါ။</li>
                  <li><strong>Authorized redirect URIs</strong> နေရာတွင် အောက်ပါ Direct Callback URL ကို ထည့်ပါ။</li>
                  <li>ရရှိလာသော <strong>Client ID</strong> နှင့် <strong>Client Secret</strong> ကို အောက်တွင် ဖြည့်သွင်းပါ။</li>
                  <li><strong>အရေးကြီးချက် (Error 403 ကာကွယ်ရန်):</strong> OAuth consent screen တွင် Status သည် <strong>Testing</strong> ဖြစ်နေပါက <strong>Audience &gt; Test users</strong> တွင် <strong>+ ADD USERS</strong> နှိပ်၍ သင့် Gmail (<code>zinphyo2539@gmail.com</code>) ကို ထည့်သွင်းထားပေးပါ။</li>
                </ol>
              </div>
            )}

            {/* Direct Callback URI with 1-Click Copy */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-950 text-[11px]">
                  {lang === 'my' ? 'Authorized Redirect URI (အောက်ပါခလုတ်ဖြင့် Copy ကူးပါ):' : 'Authorized Redirect URI (Clean Direct URL):'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const uri = 'https://ais-dev-fh3gru6gttblmp3nd7ykaj-1006890950889.asia-southeast1.run.app/api/auth/google/callback';
                    navigator.clipboard.writeText(uri);
                    setCopiedCallback(true);
                    setTimeout(() => setCopiedCallback(false), 2500);
                  }}
                  className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  {copiedCallback ? <Check className="w-3.5 h-3.5 text-white" /> : <FileText className="w-3.5 h-3.5" />}
                  <span>{copiedCallback ? (lang === 'my' ? 'ကူးပြီးပြီ ✓' : 'Copied! ✓') : (lang === 'my' ? 'Copy URI' : 'Copy URI')}</span>
                </button>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-orange-200 font-mono text-[11px] text-[#292524] select-all break-all shadow-2xs">
                https://ais-dev-fh3gru6gttblmp3nd7ykaj-1006890950889.asia-southeast1.run.app/api/auth/google/callback
              </div>
              <p className="text-[10px] text-orange-800 leading-normal">
                {lang === 'my' 
                  ? '⚠️ မှတ်ချက်: www.google.com/url ရှေ့ဆက် မပါဘဲ ဤ clean URL အတိအကျကိုသာ Google Cloud ထဲသို့ ထည့်သွင်းရပါမည်။' 
                  : '⚠️ Important: Do not use wrapped URLs. Use this exact direct URL.'}
              </p>
            </div>

            <form onSubmit={handleSaveProviderConfig} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#292524]">
                  {configProvider === 'google' ? 'Google Client ID (*.apps.googleusercontent.com)' : 'Client ID / App ID'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1006890950889-xxxx.apps.googleusercontent.com"
                  value={providerConfigInput.clientId}
                  onChange={(e) => setProviderConfigInput({ ...providerConfigInput, clientId: e.target.value })}
                  required
                  className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono"
                />
                {configProvider === 'google' && providerConfigInput.clientId.trim().startsWith('GOCSPX-') && (
                  <p className="text-[11px] text-red-600 font-medium">
                    ⚠️ သတိပြုရန်: GOCSPX- သည် Client Secret ဖြစ်ပါသည်။ အောက်က Client Secret ကွက်လပ်တွင် ထည့်ရပါမည်။
                  </p>
                )}
                {configProvider === 'google' && providerConfigInput.clientId.trim().length > 15 && !providerConfigInput.clientId.includes('.apps.googleusercontent.com') && (
                  <p className="text-[11px] text-amber-600 font-medium">
                    ℹ️ Client ID သည် .apps.googleusercontent.com ဖြင့် ဆုံးရပါမည်။
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#292524]">
                  {configProvider === 'google' ? 'Google Client Secret (GOCSPX-...)' : 'Client Secret / App Secret'}
                </label>
                <input
                  type="password"
                  placeholder="e.g. GOCSPX-xxxxxx"
                  value={providerConfigInput.clientSecret}
                  onChange={(e) => setProviderConfigInput({ ...providerConfigInput, clientSecret: e.target.value })}
                  required
                  className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E7E5E4]">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 border border-[#E7E5E4] rounded-xl text-xs font-medium text-[#78716C] hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={configSaving}
                  className="px-5 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {configSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{lang === 'my' ? 'သိမ်းဆည်းပြီး Login စတင်ချိတ်ဆက်မည်' : 'Save & Connect'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (isAuthenticated === null) return null;
  if (!isAuthenticated) return <LoginScreen />;

  async function fetchData(overrideToken?: string) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers = getHeaders(overrideToken);
      const [storeRes, configRes, samplesRes, productsRes, ordersRes] = await Promise.all([
        fetch('/api/merchant/store', { headers, credentials: 'include' }),
        fetch('/api/merchant/ai-config', { headers, credentials: 'include' }),
        fetch('/api/merchant/samples', { headers, credentials: 'include' }),
        fetch('/api/products', { headers, credentials: 'include' }),
        fetch('/api/orders', { headers, credentials: 'include' })
      ]);

      if (!storeRes.ok || !configRes.ok || !samplesRes.ok || !productsRes.ok || !ordersRes.ok) {
        throw new Error('Failed to fetch initial application data.');
      }

      const storeData = await storeRes.json();
      const configData = await configRes.json();
      const samplesData = await samplesRes.json();
      const productsData = await productsRes.json();
      const ordersData = await ordersRes.json();

      setStoreSettings(storeData);
      setConfig(configData);
      setSamples(samplesData);
      setProducts(productsData);
      setOrders(ordersData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const loadPublicStore = async (slug: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/store/${slug}`);
      if (!res.ok) throw new Error('Store not found or unpublished');
      const data = await res.json();
      setPublicStoreData(data);
      setViewMode('public_store');
    } catch (err: any) {
      alert(err.message);
      setViewMode('admin');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeSettings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/merchant/store', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(storeSettings)
      });
      if (!res.ok) throw new Error('Failed to update store settings');
      const data = await res.json();
      setStoreSettings(data.store);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/merchant/ai-config', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Failed to save configuration');
      const data = await res.json();
      setConfig(data.aiConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleForm.customerMessage || !sampleForm.preferredReply) return;

    try {
      if (editingSampleId) {
        const res = await fetch(`/api/merchant/samples/${editingSampleId}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(sampleForm)
        });
        if (!res.ok) throw new Error('Failed to update sample');
        const updated = await res.json();
        setSamples(samples.map(s => s.id === editingSampleId ? updated : s));
        setEditingSampleId(null);
      } else {
        const res = await fetch('/api/merchant/samples', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(sampleForm)
        });
        if (!res.ok) throw new Error('Failed to create sample');
        const created = await res.json();
        setSamples([created, ...samples]);
        setIsAddingSample(false);
      }
      setSampleForm({ customerMessage: '', preferredReply: '', category: 'Greeting' });
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteSample = async (id: string) => {
    if (!confirm(lang === 'my' ? 'ဤနမူနာအဖြေကို ဖျက်ရန် သေချာပါသလား။' : 'Are you sure you want to delete this sample?')) return;
    try {
      const res = await fetch(`/api/merchant/samples/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete sample');
      setSamples(samples.filter(s => s.id !== id));
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        const res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(productForm)
        });
        if (!res.ok) throw new Error('Failed to update product');
        const updated = await res.json();
        setProducts(products.map(p => p.id === updated.id ? updated : p));
        setEditingProduct(null);
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(productForm)
        });
        if (!res.ok) throw new Error('Failed to create product');
        const created = await res.json();
        setProducts([created, ...products]);
        setIsAddingProduct(false);
      }
      setProductForm({ name: '', sku: '', price: 10000, description: '', discount: '', status: 'active', variants: [{ color: 'Black', size: 'M', stock: 10, sku: 'SKU-V1' }] });
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete product');
      setProducts(products.filter(p => p.id !== id));
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRunPreview = async () => {
    if (!previewQuery.trim()) return;
    setPreviewLoading(true);
    setPreviewResult(null);
    try {
      const res = await fetch('/api/ai/preview', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          customerMessage: previewQuery,
          customInstructions: config?.customInstructions,
          replyStyle: config?.replyStyle,
          preferredLanguage: config?.preferredLanguage
        })
      });
      if (!res.ok) throw new Error('Preview generation failed');
      const data = await res.json();
      setPreviewResult(data.previewReply);
    } catch (err: any) {
      setPreviewResult(`Error: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'customer', text: userText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ customerMessage: userText })
      });
      if (!res.ok) throw new Error('Chat generation failed');
      const data = await res.json();
      setChatMessages(prev => [...prev, { sender: 'ai', text: data.reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: `[Error] ${err.message}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Payment confirmation failed');
        return;
      }
      setOrders(orders.map(o => o.id === orderId ? data.order : o));
      alert(lang === 'my' ? 'ငွေပေးချေမှုကို အောင်မြင်စွာ အတည်ပြုပြီးပါပြီ။' : 'Payment confirmed successfully by authorized human.');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Public Store Checkout Submission
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicStoreData || cart.length === 0) return;
    setCheckoutLoading(true);

    try {
      const res = await fetch(`/api/public/store/${publicStoreData.store.slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...checkoutForm,
          items: cart.map(i => ({ productId: i.productId, variantId: i.variantId, qty: i.qty }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      
      setLastPlacedOrder(data.order);
      setCart([]);
      setIsCartOpen(false);
      alert('Order placed successfully!');
    } catch (err: any) {
      alert(`Checkout Error: ${err.message}`);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const t = {
    title: lang === 'my' ? 'မြန်မာ AI အရောင်းအကူ စိတ်ကြိုက်သတ်မှတ်ခြင်း' : 'Myanmar AI Seller - Custom Sales Personality',
    subtitle: lang === 'my' ? 'သင့်ဆိုင်အတွက် AI အရောင်းအကူ၏ စကားပြောပုံ၊ ကိုယ်ပိုင်ညွှန်ကြားချက်နှင့် နမူနာအဖြေများကို စိတ်ကြိုက်စီမံပါ' : 'Configure your AI sales assistant communication style, custom instructions, and sample replies',
    navStore: lang === 'my' ? 'ဆိုင်စီမံခန့်ခွဲမှု (Store)' : 'Store Management',
    navConfig: lang === 'my' ? 'AI စကားပြောပုံနှင့် ဆက်တင်များ' : 'AI Personality & Settings',
    navPreview: lang === 'my' ? 'စမ်းသပ်ရန် (Preview)' : 'Test Playground',
    navProducts: lang === 'my' ? 'ပစ္စည်းစာရင်းနှင့် Stock' : 'Products & Stock',
    navOrders: lang === 'my' ? 'အော်ဒါနှင့် ငွေပေးချေမှု' : 'Orders & Payments',
    navChat: lang === 'my' ? 'ဖောက်သည် စကားပြောခန်း' : 'Live Chat Simulator',
    save: lang === 'my' ? 'ပြောင်းလဲမှုများကို သိမ်းဆည်းရန်' : 'Save Changes',
    saving: lang === 'my' ? 'သိမ်းဆည်းနေသည်...' : 'Saving...',
    saved: lang === 'my' ? 'အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!' : 'Changes saved successfully!',
    replyStyleLabel: lang === 'my' ? 'AI ၏ စကားပြောပုံစံ (Reply Style)' : 'AI Reply Style',
    langLabel: lang === 'my' ? 'AI ၏ ပင်တိုင်ဘာသာစကား' : 'AI Response Language',
    customInstrLabel: lang === 'my' ? 'AI ကို ဘယ်လိုပြန်ဖြေစေချင်သလဲ (Custom Instructions)' : 'How should your AI assistant respond?',
    customInstrHelper: lang === 'my' ? 'သင့်ဆိုင်ရဲ့ စကားပြောပုံ၊ Customer ကို ဆက်ဆံပုံနဲ့ အရောင်းပြောပုံကို ကိုယ်တိုင်ရေးသားနိုင်ပါတယ်။' : 'Describe your preferred communication style, customer service behavior, and sales approach.',
    samplesTitle: lang === 'my' ? 'နမူနာအဖြေများ (Sample Replies)' : 'Sample Replies Manager',
    samplesDesc: lang === 'my' ? 'Customer များ မေးလေ့ရှိသော မေးခွန်းများနှင့် သင်နှစ်သက်သော အဖြေပုံစံများကို ထည့်သွင်းပါ။' : 'Add common customer questions and your preferred stylistic replies.',
    behaviorTitle: lang === 'my' ? 'အရောင်းအမူအကျင့် စိတ်ကြိုက်သတ်မှတ်ခြင်း (Sales Behavior)' : 'Sales Behavior Settings',
    handoffTitle: lang === 'my' ? 'လူထံ လွှဲပြောင်းမှု (Human Handoff)' : 'Human Handoff Settings',
    securityNotice: lang === 'my' ? 'လုံခြုံရေး သတိပေးချက် - AI သည် စျေးနှုန်း၊ Stock သို့မဟုတ် ငွေပေးချေမှုများကို ကိုယ်တိုင်အတည်ပြုခွင့်မရှိပါ။ အတည်ပြုခြင်းသည် လူကိုယ်တိုင်သာ လုပ်ဆောင်ရမည်။' : 'Security Notice: AI cannot invent prices, inventory or confirm payments. Payment confirmation is strictly human-only.'
  };

  // If viewing public storefront
  if (viewMode === 'public_store' && publicStoreData) {
    const totalCartItems = cart.reduce((acc, i) => acc + i.qty, 0);
    const cartTotal = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);

    return (
      <div className="min-h-screen bg-[#FAFAF9] text-[#292524] flex flex-col font-sans">
        {/* Public Store Header */}
        <header className="bg-white border-b border-[#E7E5E4] sticky top-0 z-30 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F97316] flex items-center justify-center text-white font-bold text-lg">
              {publicStoreData.store.storeName.charAt(0)}
            </div>
            <div>
              <h1 className="font-bold text-base text-[#292524]">{publicStoreData.store.storeName}</h1>
              <p className="text-xs text-[#78716C]">Public Storefront</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('admin')}
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#78716C] flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Merchant Admin</span>
            </button>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative bg-[#F97316] hover:bg-[#EA580C] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Cart</span>
              {totalCartItems > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-[#F97316] flex items-center justify-center text-[10px] font-bold">
                  {totalCartItems}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Store Hero Banner */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-12 px-6 text-center shadow-md">
          <div className="max-w-3xl mx-auto flex flex-col items-center gap-3">
            <h2 className="text-3xl font-extrabold">{publicStoreData.store.storeName}</h2>
            <p className="text-sm opacity-90 max-w-xl leading-relaxed">{publicStoreData.store.description}</p>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xs">
              <span>🚚 {publicStoreData.store.deliveryInfo}</span>
            </div>
          </div>
        </div>

        {/* Product Catalog */}
        <div className="max-w-6xl w-full mx-auto p-4 lg:p-8 flex-1 flex flex-col gap-6">
          <h3 className="font-bold text-lg text-[#292524] border-b border-[#E7E5E4] pb-3">Available Products</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {publicStoreData.products.map(p => {
              const [selectedVariant, setSelectedVariant] = useState(p.variants[0]);
              const [qty, setQty] = useState(1);

              return (
                <div key={p.id} className="bg-white border border-[#E7E5E4] rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-[#292524]">{p.name}</h4>
                      <span className="font-extrabold text-orange-600 text-sm">{p.price.toLocaleString()} MMK</span>
                    </div>
                    <p className="text-xs text-[#78716C] leading-relaxed">{p.description}</p>
                    {p.discount && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md w-fit">
                        🎁 {p.discount}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#E7E5E4] flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[#78716C]">Select Variant & Size:</label>
                      <select
                        onChange={(e) => {
                          const v = p.variants.find(item => item.id === e.target.value);
                          if (v) setSelectedVariant(v);
                        }}
                        className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-orange-500"
                      >
                        {p.variants.map(v => (
                          <option key={v.id} value={v.id} disabled={v.stock <= 0}>
                            {v.color} / {v.size} ({v.stock > 0 ? `${v.stock} in stock` : 'Out of stock'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      disabled={selectedVariant.stock <= 0}
                      onClick={() => {
                        setCart(prev => {
                          const existing = prev.find(i => i.productId === p.id && i.variantId === selectedVariant.id);
                          if (existing) {
                            return prev.map(i => i.productId === p.id && i.variantId === selectedVariant.id ? { ...i, qty: i.qty + 1 } : i);
                          }
                          return [...prev, {
                            productId: p.id,
                            variantId: selectedVariant.id,
                            name: p.name,
                            variantName: `${selectedVariant.color} / ${selectedVariant.size}`,
                            price: p.price,
                            qty: 1,
                            maxStock: selectedVariant.stock
                          }];
                        });
                        alert('Added to cart!');
                      }}
                      className="w-full bg-[#F97316] hover:bg-[#EA580C] disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{selectedVariant.stock > 0 ? 'Add to Cart' : 'Out of Stock'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart & Checkout Slide-Over Modal */}
        {isCartOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
            <div className="w-full max-w-md bg-white h-full flex flex-col p-6 shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-4">
                <h3 className="font-bold text-lg text-[#292524]">Shopping Cart</h3>
                <button onClick={() => setIsCartOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5 text-[#78716C]" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                  <ShoppingBag className="w-12 h-12 text-[#78716C] opacity-40" />
                  <p className="text-sm text-[#78716C]">Your cart is empty.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-6 py-4">
                  <div className="flex flex-col gap-3">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#FAFAF9] p-3 rounded-xl border border-[#E7E5E4]">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-[#292524]">{item.name}</span>
                          <span className="text-[11px] text-[#78716C]">{item.variantName} • {item.price.toLocaleString()} MMK</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold">Qty: {item.qty}</span>
                          <button
                            onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#E7E5E4] pt-4 flex flex-col gap-4">
                    <div className="flex justify-between items-center font-bold text-base">
                      <span>Total:</span>
                      <span className="text-orange-600">{cartTotal.toLocaleString()} MMK</span>
                    </div>

                    <form onSubmit={handleCheckoutSubmit} className="flex flex-col gap-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[#78716C]">Customer Checkout Details</h4>
                      <input
                        type="text"
                        placeholder="Your Name (e.g. Ma Mya)"
                        value={checkoutForm.customerName}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerName: e.target.value })}
                        required
                        className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500"
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number (e.g. 09-456789123)"
                        value={checkoutForm.customerPhone}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerPhone: e.target.value })}
                        required
                        className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500"
                      />
                      <textarea
                        rows={2}
                        placeholder="Shipping Address"
                        value={checkoutForm.shippingAddress}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, shippingAddress: e.target.value })}
                        required
                        className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl p-3 text-xs focus:outline-none focus:border-orange-500"
                      />

                      <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl text-xs text-orange-900 flex flex-col gap-1">
                        <span className="font-bold">Payment Instructions:</span>
                        <p className="whitespace-pre-wrap">{publicStoreData.store.paymentInstructions}</p>
                      </div>

                      <button
                        type="submit"
                        disabled={checkoutLoading}
                        className="mt-2 w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-medium py-3 rounded-xl text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {checkoutLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        <span>Confirm & Place Order</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Merchant Admin View
  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#292524] flex flex-col font-sans">
      {/* Top Bar */}
      <header className="bg-white border-b border-[#E7E5E4] sticky top-0 z-30 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-[#292524] flex items-center gap-2">
              <span>Myanmar AI Seller</span>
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">Premium Orange</span>
            </h1>
            <p className="text-xs text-[#78716C]">{storeSettings?.storeName || 'Yangon Style Fashion & Apparel'}</p>
          </div>
        </div>

        {/* Role switcher & Language Toggle & View Public Store */}
        <div className="flex items-center gap-3">
          {storeSettings && (
            <button
              onClick={() => loadPublicStore(storeSettings.slug)}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-800 text-xs font-semibold hover:bg-orange-100 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View Public Store</span>
            </button>
          )}

          {/* Language Toggle & View Public Store */}
          <div className="flex items-center gap-3">
            {storeSettings && (
              <button
                onClick={() => loadPublicStore(storeSettings.slug)}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-800 text-xs font-semibold hover:bg-orange-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View Public Store</span>
              </button>
            )}

            <button
              onClick={() => setLang(lang === 'my' ? 'en' : 'my')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E5E4] bg-white text-xs font-semibold hover:bg-[#F5F5F4] transition-colors"
            >
              <Globe className="w-4 h-4 text-orange-600" />
              <span>{lang === 'my' ? 'မြန်မာ | English' : 'English | မြန်မာ'}</span>
            </button>
          </div>

          <button
            onClick={() => setLang(lang === 'my' ? 'en' : 'my')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E5E4] bg-white text-xs font-semibold hover:bg-[#F5F5F4] transition-colors"
          >
            <Globe className="w-4 h-4 text-orange-600" />
            <span>{lang === 'my' ? 'မြန်မာ | English' : 'English | မြန်မာ'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 lg:p-6 gap-6">
        
        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-2">
          <div className="bg-white rounded-2xl border border-[#E7E5E4] p-3 shadow-xs flex flex-col gap-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] px-3 py-1">
              {lang === 'my' ? 'ဆိုင်နှင့် AI စီမံခန့်ခွဲမှု' : 'Merchant Navigation'}
            </p>

            <button
              onClick={() => setActiveTab('store')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'store'
                  ? 'bg-orange-50 text-orange-600 font-semibold shadow-2xs border-l-4 border-orange-500'
                  : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#292524]'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>{t.navStore}</span>
            </button>
            
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'config'
                  ? 'bg-orange-50 text-orange-600 font-semibold shadow-2xs border-l-4 border-orange-500'
                  : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#292524]'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>{t.navConfig}</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'preview'
                  ? 'bg-orange-50 text-orange-600 font-semibold shadow-2xs border-l-4 border-orange-500'
                  : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#292524]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{t.navPreview}</span>
            </button>

            <button
              onClick={() => setActiveTab('playground')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'playground'
                  ? 'bg-orange-50 text-orange-600 font-semibold shadow-2xs border-l-4 border-orange-500'
                  : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#292524]'
              }`}
            >
              <Bot className="w-4 h-4 text-orange-600" />
              <span>{lang === 'my' ? 'ဖောက်သည် AI စမ်းသပ်ခန်း' : 'Customer AI Playground'}</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-orange-50 text-orange-600 font-semibold shadow-2xs border-l-4 border-orange-500'
                  : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#292524]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t.navChat}</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'products'
                  ? 'bg-orange-50 text-orange-600 font-semibold shadow-2xs border-l-4 border-orange-500'
                  : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#292524]'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>{t.navProducts}</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'orders'
                  ? 'bg-orange-50 text-orange-600 font-semibold shadow-2xs border-l-4 border-orange-500'
                  : 'text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#292524]'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{t.navOrders}</span>
            </button>
          </div>

          {/* Security Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Security Invariant</span>
            </div>
            <p className="leading-relaxed">
              {t.securityNotice}
            </p>
          </div>
        </aside>

        {/* Main Panel Area */}
        <main className="flex-1 flex flex-col gap-6">
          
          {loading && (
            <div className="bg-white rounded-2xl p-12 text-center border border-[#E7E5E4] text-[#78716C]">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-500 mb-2" />
              <p>Loading store management data...</p>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-sm flex items-center gap-3 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{t.saved}</span>
            </div>
          )}

          {/* 1. Store Management Tab */}
          {!loading && storeSettings && activeTab === 'store' && (
            <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-xs flex flex-col gap-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7E5E4] pb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#292524]">Store Management & Public Storefront</h2>
                  <p className="text-sm text-[#78716C] mt-1">Configure your online storefront branding, publication status, and payment instructions.</p>
                </div>
                <button
                  onClick={() => loadPublicStore(storeSettings.slug)}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Preview Public Store</span>
                </button>
              </div>

              <form onSubmit={handleSaveStore} className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-[#292524]">Store Name</label>
                    <input
                      type="text"
                      value={storeSettings.storeName}
                      onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                      required
                      className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-[#292524]">Store Slug (Public URL)</label>
                    <div className="flex items-center bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl overflow-hidden">
                      <span className="px-3 text-xs text-[#78716C] bg-gray-100 py-2.5 border-r border-[#E7E5E4]">/store/</span>
                      <input
                        type="text"
                        value={storeSettings.slug}
                        onChange={(e) => setStoreSettings({ ...storeSettings, slug: e.target.value })}
                        required
                        className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#292524]">Store Description</label>
                  <textarea
                    rows={3}
                    value={storeSettings.description}
                    onChange={(e) => setStoreSettings({ ...storeSettings, description: e.target.value })}
                    className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-[#292524]">Delivery Policy & Info</label>
                    <textarea
                      rows={3}
                      value={storeSettings.deliveryInfo}
                      onChange={(e) => setStoreSettings({ ...storeSettings, deliveryInfo: e.target.value })}
                      className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-[#292524]">Payment Instructions for Customers</label>
                    <textarea
                      rows={3}
                      value={storeSettings.paymentInstructions}
                      onChange={(e) => setStoreSettings({ ...storeSettings, paymentInstructions: e.target.value })}
                      className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 p-4 rounded-xl">
                  <input
                    type="checkbox"
                    id="isPublished"
                    checked={storeSettings.isPublished}
                    onChange={(e) => setStoreSettings({ ...storeSettings, isPublished: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <label htmlFor="isPublished" className="text-xs font-semibold text-orange-900 cursor-pointer">
                    Publish Store Online (Make storefront and active products publicly accessible at /store/{storeSettings.slug})
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#F97316] hover:bg-[#EA580C] text-white font-medium px-6 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 w-fit cursor-pointer"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Store Settings</span>
                </button>
              </form>
            </div>
          )}

          {/* 2. AI Config Tab */}
          {!loading && config && activeTab === 'config' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#292524]">{t.title}</h2>
                  <p className="text-sm text-[#78716C] mt-1">{t.subtitle}</p>
                </div>
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="bg-[#F97316] hover:bg-[#EA580C] text-white font-medium px-6 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? t.saving : t.save}</span>
                </button>
              </div>

              {/* Language & Reply Style */}
              <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-xs flex flex-col gap-6">
                <h3 className="font-bold text-base text-[#292524] flex items-center gap-2 border-b border-[#E7E5E4] pb-3">
                  <Globe className="w-5 h-5 text-orange-600" />
                  <span>{lang === 'my' ? 'ဘာသာစကားနှင့် စကားပြောပုံ (Language & Reply Style)' : 'Language & Reply Style'}</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-[#292524]">{t.langLabel}</label>
                    <select
                      value={config.preferredLanguage}
                      onChange={(e) => setConfig({ ...config, preferredLanguage: e.target.value })}
                      className="w-full bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-orange-500"
                    >
                      <option value="myanmar">Myanmar (မြန်မာ)</option>
                      <option value="english">English</option>
                      <option value="customer_auto">Customer's Language (Auto)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-[#292524]">{t.replyStyleLabel}</label>
                    <select
                      value={config.replyStyle}
                      onChange={(e) => setConfig({ ...config, replyStyle: e.target.value })}
                      className="w-full bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-orange-500"
                    >
                      <option value="friendly">Friendly (ဖော်ရွေပျူငှာသော)</option>
                      <option value="professional">Professional (လုပ်ငန်းသုံး ကျွမ်းကျင်သော)</option>
                      <option value="concise">Concise (တိုတိုနှင့်လိုရင်း)</option>
                      <option value="sales_focused">Sales Focused (အရောင်းဦးတည်သော)</option>
                      <option value="detailed">Detailed (အသေးစိတ်ရှင်းလင်းသော)</option>
                      <option value="custom">Custom Instructions Priority</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
                  <h3 className="font-bold text-base text-[#292524] flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-orange-600" />
                    <span>{t.customInstrLabel}</span>
                  </h3>
                  <span className="text-xs text-[#78716C]">{config.customInstructions.length} / 3000 chars</span>
                </div>
                <p className="text-xs text-[#78716C]">{t.customInstrHelper}</p>
                <textarea
                  rows={5}
                  value={config.customInstructions}
                  onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })}
                  maxLength={3000}
                  className="w-full bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl p-4 text-sm font-sans focus:outline-none focus:border-orange-500 leading-relaxed"
                />
              </div>

              {/* Sample Replies Manager */}
              <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-xs flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-3">
                  <div>
                    <h3 className="font-bold text-base text-[#292524] flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-orange-600" />
                      <span>{t.samplesTitle}</span>
                    </h3>
                    <p className="text-xs text-[#78716C] mt-1">{t.samplesDesc}</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingSampleId(null);
                      setSampleForm({ customerMessage: '', preferredReply: '', category: 'Greeting' });
                      setIsAddingSample(!isAddingSample);
                    }}
                    className="bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'my' ? 'နမူနာအသစ်ထည့်ရန်' : 'Add Sample'}</span>
                  </button>
                </div>

                {isAddingSample && (
                  <form onSubmit={handleSaveSample} className="bg-orange-50/50 border border-orange-200 rounded-xl p-4 flex flex-col gap-4">
                    <h4 className="font-semibold text-xs text-orange-900 uppercase tracking-wider">
                      {editingSampleId ? 'Edit Sample Reply' : 'New Sample Reply'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#292524]">Customer Message</label>
                        <textarea
                          rows={2}
                          value={sampleForm.customerMessage}
                          onChange={(e) => setSampleForm({ ...sampleForm, customerMessage: e.target.value })}
                          className="bg-white border border-[#E7E5E4] rounded-lg p-2.5 text-xs focus:outline-none focus:border-orange-500"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#292524]">Preferred Reply</label>
                        <textarea
                          rows={2}
                          value={sampleForm.preferredReply}
                          onChange={(e) => setSampleForm({ ...sampleForm, preferredReply: e.target.value })}
                          className="bg-white border border-[#E7E5E4] rounded-lg p-2.5 text-xs focus:outline-none focus:border-orange-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <select
                        value={sampleForm.category}
                        onChange={(e) => setSampleForm({ ...sampleForm, category: e.target.value })}
                        className="bg-white border border-[#E7E5E4] rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-orange-500"
                      >
                        <option value="Greeting">Greeting</option>
                        <option value="Price">Price</option>
                        <option value="Stock and variants">Stock and variants</option>
                        <option value="Delivery">Delivery</option>
                        <option value="Payment instructions">Payment instructions</option>
                        <option value="General">General</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingSample(false)}
                          className="px-3 py-1.5 rounded-lg border border-[#E7E5E4] text-xs font-medium hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-[#F97316] text-white rounded-lg text-xs font-semibold hover:bg-[#EA580C]"
                        >
                          Save Sample
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                <div className="flex flex-col gap-3">
                  {samples.map((s) => (
                    <div key={s.id} className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-col gap-1.5 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md w-fit">
                          {s.category}
                        </span>
                        <p className="text-xs font-medium text-[#292524]">
                          <span className="text-[#78716C]">Customer:</span> "{s.customerMessage}"
                        </p>
                        <p className="text-xs font-semibold text-emerald-800">
                          <span className="text-[#78716C]">Reply:</span> "{s.preferredReply}"
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingSampleId(s.id);
                            setSampleForm({ customerMessage: s.customerMessage, preferredReply: s.preferredReply, category: s.category });
                            setIsAddingSample(true);
                          }}
                          className="p-2 rounded-lg border border-[#E7E5E4] bg-white text-[#78716C] hover:text-[#292524]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSample(s.id)}
                          className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Customer AI Playground Tab */}
          {!loading && activeTab === 'playground' && (
            <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-xs flex flex-col gap-6 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7E5E4] pb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#292524] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-600" />
                    <span>{lang === 'my' ? 'ဖောက်သည် AI စမ်းသပ်ခန်း (Customer AI Playground)' : 'Customer AI Playground'}</span>
                  </h2>
                  <p className="text-sm text-[#78716C] mt-1">
                    {lang === 'my' 
                      ? 'AI အရောင်းအကူ၏ တုံ့ပြန်ပုံနှင့် verified product catalog အချက်အလက်များကို တိုက်ရိုက် စမ်းသပ်လေ့လာပါ' 
                      : 'Explore and test the live merchant AI sales assistant powered by Gemini 2.5 Flash and verified business data.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-semibold text-emerald-700">Gemini 2.5 Flash Connected</span>
                </div>
              </div>

              {/* Dynamic Suggested Questions Section */}
              <div className="bg-orange-50/60 border border-orange-200 rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-900">
                      {lang === 'my' ? 'AI ဖြင့် ထုတ်လုပ်ထားသော အကြံပြုမေးခွန်းများ (Dynamic Suggestions)' : 'Dynamic Suggested Questions (AI Generated)'}
                    </span>
                  </div>
                  <button
                    onClick={fetchPlaygroundSuggestions}
                    disabled={suggestionsLoading}
                    className="text-xs font-semibold text-orange-700 hover:text-orange-900 flex items-center gap-1 cursor-pointer bg-white px-3 py-1 rounded-lg border border-orange-200 shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${suggestionsLoading ? 'animate-spin' : ''}`} />
                    <span>{lang === 'my' ? 'အသစ်ဆန်းသစ်မည်' : 'Refresh Suggestions'}</span>
                  </button>
                </div>

                {suggestionsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-orange-800 py-3">
                    <RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
                    <span>{lang === 'my' ? 'Gemini ဖြင့် မေးခွန်းအသစ်များ ဖန်တီးနေပါသည်...' : 'Generating dynamic suggestions from product catalog...'}</span>
                  </div>
                ) : suggestionsError ? (
                  <div className="flex flex-col gap-2 py-2 text-xs text-red-700">
                    <span>{suggestionsError}</span>
                    <button
                      onClick={fetchPlaygroundSuggestions}
                      className="w-fit px-3 py-1 bg-red-600 text-white rounded-lg font-medium shadow-2xs"
                    >
                      Retry Suggestions
                    </button>
                  </div>
                ) : playgroundSuggestions.length === 0 ? (
                  <p className="text-xs text-[#78716C]">No suggestions available. Click refresh to generate.</p>
                ) : (
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {playgroundSuggestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePlaygroundSend(q)}
                        disabled={playgroundLoading}
                        className="bg-white hover:bg-orange-100 text-orange-900 border border-orange-200 px-3.5 py-2 rounded-xl text-xs font-medium transition-all shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <span className="text-orange-600 font-bold">Q{idx+1}:</span>
                        <span>{q}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Conversation Interface */}
              <div className="flex flex-col gap-4 border border-[#E7E5E4] rounded-2xl p-4 bg-[#FAFAF9] h-[500px] flex-1">
                <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-2">
                  {playgroundMessages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-[#78716C] py-16">
                      <Bot className="w-12 h-12 text-orange-400 opacity-60" />
                      <p className="text-sm font-medium">
                        {lang === 'my' ? 'အထက်ပါ အကြံပြုမေးခွန်းများကို နှိပ်ပါ သို့မဟုတ် အောက်တွင် မေးခွန်းရိုက်ထည့်ပါ။' : 'Select a suggested question above or type your own question below to test the AI assistant.'}
                      </p>
                      <span className="text-xs opacity-75">All answers are grounded in real merchant inventory and configured personality.</span>
                    </div>
                  ) : (
                    playgroundMessages.map((m, idx) => (
                      <div key={idx} className={`flex flex-col ${m.sender === 'customer' ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 mb-1 text-[11px] text-[#78716C]">
                          <span>{m.sender === 'customer' ? 'Customer (You)' : 'AI Sales Assistant'}</span>
                          <span>•</span>
                          <span>{m.time}</span>
                        </div>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          m.sender === 'customer'
                            ? 'bg-[#F97316] text-white rounded-tr-xs shadow-xs'
                            : 'bg-white border border-[#E7E5E4] text-[#292524] rounded-tl-xs shadow-2xs whitespace-pre-wrap'
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    ))
                  )}

                  {playgroundLoading && (
                    <div className="flex items-center gap-2 text-xs text-[#78716C] bg-white p-3 rounded-xl border border-[#E7E5E4] w-fit shadow-2xs">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-500" />
                      <span>{lang === 'my' ? 'AI မှ ကုန်ပစ္စည်းအချက်အလက်များကို စစ်ဆေး၍ ဖြေကြားနေပါသည်...' : 'Gemini is querying verified product stock & database context...'}</span>
                    </div>
                  )}
                </div>

                {/* Manual Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlePlaygroundSend(playgroundInput);
                  }}
                  className="flex gap-2 pt-2 border-t border-[#E7E5E4]"
                >
                  <input
                    type="text"
                    value={playgroundInput}
                    onChange={(e) => setPlaygroundInput(e.target.value)}
                    placeholder={lang === 'my' ? 'မေးခွန်းတစ်ခု ရိုက်ထည့်ပါ (ဥပမာ - ဒီအင်္ကျီ အနက်ရောင် M size ရှိလား)...' : 'Type your question here (e.g. Is the black M size shirt available?)...'}
                    className="flex-1 bg-white border border-[#E7E5E4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={playgroundLoading || !playgroundInput.trim()}
                    className="bg-[#F97316] hover:bg-[#EA580C] text-white px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <span>{lang === 'my' ? 'မေးမည်' : 'Send'}</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 3. Preview Playground Tab */}
          {!loading && activeTab === 'preview' && (
            <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-xs flex flex-col gap-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-[#292524]">AI Test Playground & Preview</h2>
                <p className="text-sm text-[#78716C] mt-1">Test your current custom instructions, reply style, and verified products before going live.</p>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-[#292524]">Hypothetical Customer Question</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={previewQuery}
                    onChange={(e) => setPreviewQuery(e.target.value)}
                    placeholder="e.g. ဒီအင်္ကျီ အနက်ရောင် M Size ရှိလား၊ စျေးဘယ်လောက်လဲ။"
                    className="flex-1 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={handleRunPreview}
                    disabled={previewLoading || !previewQuery.trim()}
                    className="bg-[#F97316] hover:bg-[#EA580C] text-white px-6 py-3 rounded-xl font-medium text-sm flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {previewLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Generate AI Reply</span>
                  </button>
                </div>
              </div>

              {previewResult && (
                <div className="bg-orange-50/60 border border-orange-200 rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-800">Proposed AI Response (Simulated)</span>
                    <span className="text-[10px] bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full font-medium">Side Effects Disabled</span>
                  </div>
                  <p className="text-sm text-[#292524] leading-relaxed whitespace-pre-wrap font-sans bg-white p-4 rounded-xl border border-orange-100 shadow-2xs">
                    {previewResult}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 4. Live Chat Simulator Tab */}
          {!loading && activeTab === 'chat' && (
            <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-xs flex flex-col h-[650px] animate-fade-in">
              <div className="border-b border-[#E7E5E4] pb-4 mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#292524]">Live Chat Simulator</h2>
                  <p className="text-xs text-[#78716C]">Chat with your configured AI sales assistant in real-time.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-semibold text-emerald-700">AI Agent Online</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 bg-[#FAFAF9] rounded-xl border border-[#E7E5E4]">
                {chatMessages.map((m, idx) => (
                  <div key={idx} className={`flex flex-col ${m.sender === 'customer' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-[#78716C]">
                      <span>{m.sender === 'customer' ? 'Customer' : 'AI Sales Assistant'}</span>
                      <span>•</span>
                      <span>{m.time}</span>
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.sender === 'customer'
                        ? 'bg-[#F97316] text-white rounded-tr-xs shadow-xs'
                        : 'bg-white border border-[#E7E5E4] text-[#292524] rounded-tl-xs shadow-2xs'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-2 text-xs text-[#78716C] bg-white p-3 rounded-xl border border-[#E7E5E4] w-fit">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-500" />
                    <span>AI is formulating response with verified product data...</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendChat} className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message as customer (e.g. ဒီအင်္ကျီ စျေးဘယ်လောက်လဲ)..."
                  className="flex-1 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-[#F97316] hover:bg-[#EA580C] text-white px-5 py-3 rounded-xl flex items-center justify-center shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* 5. Products & Inventory Tab */}
          {!loading && activeTab === 'products' && (
            <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-xs flex flex-col gap-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#292524]">Product Catalog & Inventory (Source of Truth)</h2>
                  <p className="text-sm text-[#78716C] mt-1">Manage products, variants, and real-time stock levels.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProductForm({ name: '', sku: '', price: 15000, description: '', discount: '', status: 'active', variants: [{ color: 'Black', size: 'M', stock: 10, sku: 'SKU-V1' }] });
                    setIsAddingProduct(true);
                  }}
                  className="bg-[#F97316] hover:bg-[#EA580C] text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>

              {isAddingProduct && (
                <form onSubmit={handleSaveProduct} className="bg-orange-50/50 border border-orange-200 rounded-2xl p-6 flex flex-col gap-4">
                  <h3 className="font-bold text-sm text-orange-900">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Product Name"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      required
                      className="bg-white border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500"
                    />
                    <input
                      type="text"
                      placeholder="SKU Code"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      required
                      className="bg-white border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500"
                    />
                    <input
                      type="number"
                      placeholder="Price (MMK)"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                      required
                      className="bg-white border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500"
                    />
                    <input
                      type="text"
                      placeholder="Discount Promo (optional)"
                      value={productForm.discount || ''}
                      onChange={(e) => setProductForm({ ...productForm, discount: e.target.value })}
                      className="bg-white border border-[#E7E5E4] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Product Description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="bg-white border border-[#E7E5E4] rounded-xl p-3 text-xs focus:outline-none focus:border-orange-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingProduct(false)}
                      className="px-4 py-2 border border-[#E7E5E4] rounded-xl text-xs font-medium bg-white hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#F97316] text-white rounded-xl text-xs font-semibold hover:bg-[#EA580C]"
                    >
                      Save Product
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map(p => (
                  <div key={p.id} className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl p-5 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-[#292524]">{p.name}</h3>
                        <p className="text-xs text-[#78716C] font-mono">SKU: {p.sku}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-orange-700 text-sm bg-orange-50 px-2.5 py-1 rounded-lg">
                          {p.price.toLocaleString()} MMK
                        </span>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#78716C]">{p.description}</p>
                    {p.discount && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md w-fit">
                        🎁 {p.discount}
                      </span>
                    )}
                    <div className="border-t border-[#E7E5E4] pt-3 flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">Variants & Stock</span>
                      <div className="flex flex-wrap gap-2">
                        {p.variants.map(v => (
                          <span key={v.id} className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                            v.stock > 0 ? 'bg-white border-[#E7E5E4] text-[#292524]' : 'bg-gray-100 border-gray-200 text-gray-400 line-through'
                          }`}>
                            {v.color} / {v.size}: {v.stock} in stock
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Orders Tab */}
          {!loading && activeTab === 'orders' && (
            <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-xs flex flex-col gap-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#292524]">Orders & Payment Review</h2>
                  <p className="text-sm text-[#78716C] mt-1">Strict Human-Only Payment Confirmation Invariant Enforced.</p>
                </div>
                <div className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Access: Authorized</span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {orders.map(o => (
                  <div key={o.id} className="bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#292524]">Order #{o.id}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          o.paymentStatus === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          Payment: {o.paymentStatus}
                        </span>
                      </div>
                      <p className="text-xs text-[#78716C]">Customer: <span className="font-semibold text-[#292524]">{o.customerName}</span> ({o.customerPhone})</p>
                      <p className="text-xs text-[#78716C]">Address: {o.shippingAddress}</p>
                      <div className="text-xs font-semibold text-orange-700 mt-1">
                        Total: {o.totalAmount.toLocaleString()} MMK via {o.paymentMethod}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {o.paymentStatus !== 'CONFIRMED' ? (
                        <button
                          onClick={() => handleConfirmPayment(o.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Confirm Payment (Human Staff)</span>
                        </button>
                      ) : (
                        <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Confirmed by Human Staff</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
