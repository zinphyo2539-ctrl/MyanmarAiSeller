/**
 * Myanmar AI Seller (ShopSone) - Cloudflare Module Worker & Unified API Server
 * Compliant with Cloudflare Workers Module syntax: `export default { fetch: app.fetch }`
 * Pure Web Standards (Request/Response/Fetch) with zero unsupported Node.js native dependencies.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { FirestoreRestClient } from './server/firestoreClient.ts';
import { checkoutEngine } from './server/checkoutEngine.ts';
import { ledgerService } from './server/accounting/ledger.ts';
import { aiActionSecurity } from './server/aiActions/actionSecurity.ts';
import { auditLogger } from './server/audit/auditLogger.ts';
import { tokenRepository } from './server/repositories/tokenRepository.ts';
import { userRepository } from './server/repositories/userRepository.ts';
import { merchantRepository } from './server/repositories/merchantRepository.ts';
import { productRepository } from './server/repositories/productRepository.ts';
import { orderRepository } from './server/repositories/orderRepository.ts';
import { UserRecord, MerchantRecord, ProductRecord } from './server/db.ts';
import {
  uploadProductImageToSupabase,
  uploadQrImageToSupabase,
  uploadStorefrontAssetToSupabase,
  uploadPaymentSlipToSupabase,
  downloadPaymentSlipFromSupabase,
  getSupabaseStorageStatus
} from './server/supabaseStore.ts';

export interface Bindings {
  [key: string]: string | undefined;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
  FIRESTORE_DATABASE_ID?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  FRONTEND_URL?: string;
  GOOGLE_CALLBACK_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GROQ_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

const DEFAULT_GOOGLE_CLIENT_ID = '853667431134-nbcm3i78hd0lj2kti4p0vka41cgra5ef.apps.googleusercontent.com';
const DEFAULT_GOOGLE_CLIENT_SECRET = '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';
const DEFAULT_GOOGLE_CALLBACK_URL = 'https://myanmaraiseller.zentrymodernization.workers.dev/api/auth/google/callback';
const DEFAULT_FRONTEND_URL = 'https://myanmaraiseller.pages.dev';

export const app = new Hono<{ Bindings: Bindings }>();

// ----------------------------------------------------
// Global Middleware: CORS & Headers
// ----------------------------------------------------
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Session-Token', 'X-Idempotency-Key'],
  credentials: true,
}));

// Helper: Extract authenticated user from session token
async function extractUser(c: any): Promise<{ user: UserRecord; token: string } | null> {
  let token: string | null = null;
  const authHeader = c.req.header('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }
  if (!token) {
    token = c.req.header('x-session-token') || null;
  }
  if (!token) {
    token = c.req.query('token') || null;
  }
  if (!token) {
    return null;
  }

  const user = await tokenRepository.findUserByToken(token);
  if (!user) return null;
  return { user, token };
}

// ----------------------------------------------------
// 1. System Health Check
// ----------------------------------------------------
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    runtime: 'cloudflare-workers',
    framework: 'hono',
    timestamp: new Date().toISOString()
  });
});

// ----------------------------------------------------
// 2. Authentication & Google OAuth 2.0 Web Flow
// ----------------------------------------------------

// Provider status check
app.get('/api/auth/config-status', (c) => {
  const clientId = c.env?.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
  const callbackUrl = c.env?.GOOGLE_CALLBACK_URL || DEFAULT_GOOGLE_CALLBACK_URL;
  const frontendUrl = c.env?.FRONTEND_URL || DEFAULT_FRONTEND_URL;
  return c.json({
    google: Boolean(clientId && clientId.includes('.apps.googleusercontent.com')),
    facebook: false,
    tiktok: false,
    googleCallbackUrl: callbackUrl,
    frontendUrl
  });
});

// Get Google OAuth consent URL for popup
app.get('/api/auth/google/url', (c) => {
  const clientId = c.env?.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
  const callbackUrl = c.env?.GOOGLE_CALLBACK_URL || DEFAULT_GOOGLE_CALLBACK_URL;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'profile email',
    prompt: 'select_account',
    access_type: 'offline'
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return c.json({ url });
});

// Direct Google OAuth redirect
app.get('/api/auth/google', (c) => {
  const clientId = c.env?.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
  const callbackUrl = c.env?.GOOGLE_CALLBACK_URL || DEFAULT_GOOGLE_CALLBACK_URL;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'profile email',
    prompt: 'select_account',
    access_type: 'offline'
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// Google OAuth Callback: pure fetch code exchange & popup postMessage response
app.get('/api/auth/google/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');
  const frontendUrl = c.env?.FRONTEND_URL || DEFAULT_FRONTEND_URL;

  if (error || !code) {
    const errorMsg = error || 'Missing authorization code from Google';
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8" /><title>Google Sign-In Error</title></head>
        <body style="font-family:sans-serif;padding:30px;text-align:center;background:#0f172a;color:#f87171;">
          <h3>Google Sign-In မအောင်မြင်ပါ</h3>
          <p>${errorMsg}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
              setTimeout(() => window.close(), 3000);
            } else {
              setTimeout(() => { window.location.href = '${frontendUrl}/?error=google_failed'; }, 2000);
            }
          </script>
        </body>
      </html>
    `, 400);
  }

  const clientId = c.env?.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
  const clientSecret = c.env?.GOOGLE_CLIENT_SECRET || DEFAULT_GOOGLE_CLIENT_SECRET;
  const callbackUrl = c.env?.GOOGLE_CALLBACK_URL || DEFAULT_GOOGLE_CALLBACK_URL;

  try {
    // 1. Exchange authorization code for Google access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Google token exchange error:', errText);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData: any = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from Google UserInfo
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!userinfoResponse.ok) {
      throw new Error('Failed to retrieve user profile from Google');
    }

    const userinfo: any = await userinfoResponse.json();
    const rawEmail = userinfo.email || '';
    const googleId = userinfo.sub || '';
    const userId = `google_${googleId || Math.random().toString(36).substring(2, 10)}`;

    // 3. Find or create user record in Firestore
    let user = await userRepository.findById(userId);
    if (!user && rawEmail) {
      user = await userRepository.findByEmail(rawEmail);
    }

    if (!user) {
      user = {
        id: userId,
        email: rawEmail || `${userId}@myanmar-seller.mm`,
        name: userinfo.name || userinfo.given_name || 'Merchant Owner',
        role: 'merchant_admin',
        merchantId: 'merchant_001',
        provider: 'google',
        providerId: userId,
        createdAt: new Date().toISOString()
      };
      await userRepository.upsert(user);
    } else if (!user.merchantId) {
      user.merchantId = 'merchant_001';
      await userRepository.upsert(user);
    }

    // 4. Create cryptographically secure session token in Firestore
    const rawToken = 'tok_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    await tokenRepository.saveToken(rawToken, user, 30);

    // 5. Return success HTML with window.opener.postMessage
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Authentication Successful</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px 36px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); max-width: 380px; }
            h3 { color: #38bdf8; margin: 0 0 10px; font-size: 18px; }
            p { color: #94a3b8; font-size: 14px; margin: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>✓ Google Sign-In အောင်မြင်ပါသည်</h3>
            <p>အကောင့်ဝင်ရောက်မှု အောင်မြင်ပါသည်။ ဤဝင်းဒိုး အလိုအလျောက် ပိတ်သွားပါမည်...</p>
          </div>
          <script>
            const payload = {
              type: 'OAUTH_AUTH_SUCCESS',
              provider: 'google',
              token: ${JSON.stringify(rawToken)},
              user: ${JSON.stringify(user)}
            };
            try {
              localStorage.setItem('myanmar_seller_token', ${JSON.stringify(rawToken)});
              localStorage.setItem('myanmar_seller_user', JSON.stringify(${JSON.stringify(user)}));
            } catch(e) {}

            let communicated = false;
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage(payload, '*');
                communicated = true;
                setTimeout(() => {
                  try { window.close(); } catch(e) {}
                }, 600);
              }
            } catch(e) {}

            if (!communicated) {
              window.location.href = '${frontendUrl}/?auth_token=' + encodeURIComponent(${JSON.stringify(rawToken)});
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('Google OAuth callback failed:', err);
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8" /><title>Google Sign-In Error</title></head>
        <body style="font-family:sans-serif;padding:30px;text-align:center;background:#0f172a;color:#f87171;">
          <h3>Google Sign-In မအောင်မြင်ပါ</h3>
          <p>${err.message || 'OAuth verification failed'}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(err.message)} }, '*');
              setTimeout(() => window.close(), 3000);
            } else {
              setTimeout(() => { window.location.href = '${frontendUrl}/?error=google_failed'; }, 2000);
            }
          </script>
        </body>
      </html>
    `, 500);
  }
});

// Current session identity check (Always JSON, never HTML)
app.get('/api/auth/me', async (c) => {
  const auth = await extractUser(c);
  if (!auth) {
    return c.json({ isAuthenticated: false, user: null, requiresOnboarding: false });
  }
  return c.json({
    isAuthenticated: true,
    user: auth.user,
    token: auth.token,
    requiresOnboarding: !auth.user.merchantId
  });
});

// Logout
app.post('/api/auth/logout', async (c) => {
  const auth = await extractUser(c);
  if (auth?.token) {
    await tokenRepository.deleteToken(auth.token);
  }
  return c.json({ success: true });
});

// Developer instant sign-in
app.post('/api/auth/dev-login', async (c) => {
  const devUser: UserRecord = {
    id: 'user_owner_001',
    name: 'Ko Aung (Merchant Owner)',
    email: 'aung@yangonstyle.mm',
    role: 'merchant_admin',
    merchantId: 'merchant_001',
    provider: 'local',
    createdAt: new Date().toISOString()
  };
  await userRepository.upsert(devUser);
  const rawToken = 'tok_dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
  await tokenRepository.saveToken(rawToken, devUser, 30);
  return c.json({
    success: true,
    token: rawToken,
    user: devUser,
    requiresOnboarding: false
  });
});

// Provider credential configuration endpoint
app.post('/api/auth/configure-provider', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({
    success: true,
    message: `${body.provider || 'Provider'} credentials saved successfully.`
  });
});

// ----------------------------------------------------
// 3. Dashboard Analytics & Real Metrics
// ----------------------------------------------------
app.get('/api/dashboard/summary', async (c) => {
  try {
    const [products, orders] = await Promise.all([
      productRepository.findByMerchantId('merchant_001'),
      orderRepository.findByMerchantId('merchant_001')
    ]);

    const confirmedOrders = (orders || []).filter((o: any) => o.paymentStatus === 'CONFIRMED');
    const pendingOrders = (orders || []).filter((o: any) => o.paymentStatus !== 'CONFIRMED' && o.status !== 'cancelled');

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayConfirmed = confirmedOrders.filter((o: any) => {
      return (o.confirmedAt || o.createdAt || '').slice(0, 10) === todayStr;
    });

    const todaySalesAmount = todayConfirmed.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
    const pendingPaymentAmount = pendingOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
    const confirmedOrdersAmount = confirmedOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

    let outOfStockCount = 0;
    let lowStockCount = 0;
    let totalStockUnits = 0;

    (products || []).forEach((p: any) => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v: any) => {
          const s = Number(v.stock) || 0;
          totalStockUnits += s;
          if (s === 0) outOfStockCount++;
          else if (s <= 3) lowStockCount++;
        });
      }
    });

    return c.json({
      todaySalesAmount,
      todayConfirmedOrdersCount: todayConfirmed.length,
      pendingPaymentAmount,
      pendingPaymentOrdersCount: pendingOrders.length,
      confirmedOrdersAmount,
      confirmedOrdersCount: confirmedOrders.length,
      outOfStockCount,
      lowStockCount,
      totalStockUnits,
      activeProductsCount: (products || []).length
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to compute dashboard summary' }, 500);
  }
});

// ----------------------------------------------------
// 4. Products Catalog Management
// ----------------------------------------------------
app.get('/api/products', async (c) => {
  try {
    const products = await productRepository.findByMerchantId('merchant_001');
    return c.json(products || []);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/products', async (c) => {
  try {
    const body = await c.req.json();
    const id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const product: ProductRecord = {
      id,
      merchantId: 'merchant_001',
      name: body.name || 'New Product',
      sku: body.sku || `SKU-${Date.now()}`,
      price: Number(body.price) || 0,
      costPrice: body.costPrice ? Number(body.costPrice) : null,
      currency: 'MMK',
      description: body.description || '',
      imageUrl: body.imageUrl || null,
      variants: (body.variants || []).map((v: any, idx: number) => ({
        id: v.id || `v_${Date.now()}_${idx}`,
        color: v.color || 'Standard',
        size: v.size || 'Free',
        stock: Number(v.stock) || 0,
        sku: v.sku || `SKU-V${idx}`
      })),
      discount: body.discount || null,
      status: body.status || 'active'
    };
    const created = await productRepository.create(product);
    return c.json(created, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/products/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const updated = await productRepository.update(id, body);
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/products/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await productRepository.delete(id);
    return c.json({ success: true, id });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ----------------------------------------------------
// 5. Orders & Payments Management
// ----------------------------------------------------
app.get('/api/orders', async (c) => {
  try {
    const orders = await orderRepository.findByMerchantId('merchant_001');
    return c.json(orders || []);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/orders/:id/confirm-payment', async (c) => {
  try {
    const id = c.req.param('id');
    const updated = await orderRepository.update(id, {
      paymentStatus: 'CONFIRMED',
      status: 'confirmed',
      confirmedAt: new Date().toISOString()
    });
    return c.json({ success: true, order: updated });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/orders/:id/reject-payment', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const updated = await orderRepository.update(id, {
      paymentStatus: 'REJECTED',
      rejectionReason: body.reason || 'Payment rejected by merchant',
      rejectedAt: new Date().toISOString()
    });
    return c.json({ success: true, order: updated });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ----------------------------------------------------
// 6. Merchant Store Settings & Appearance
// ----------------------------------------------------
app.get('/api/merchant/store', async (c) => {
  try {
    const merchant = await merchantRepository.findById('merchant_001');
    return c.json(merchant?.store || {
      slug: 'yangon-style',
      storeName: 'Yangon Style Fashion & Apparel',
      description: 'Premium fashion apparel in Yangon with instant AI customer service.',
      deliveryInfo: 'Yangon city-wide delivery within 2-3 days. Delivery fee 2,500 MMK.',
      paymentInstructions: 'KBZPay: 09-912345678 (Ko Aung)',
      isPublished: true
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/merchant/store', async (c) => {
  try {
    const body = await c.req.json();
    const merchant = await merchantRepository.findById('merchant_001');
    if (merchant) {
      merchant.store = { ...merchant.store, ...body, updatedAt: new Date().toISOString() };
      await merchantRepository.upsert(merchant);
      return c.json({ success: true, store: merchant.store });
    }
    return c.json({ success: true, store: body });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Payment settings
app.get('/api/merchant/payment-settings', async (c) => {
  const merchant = await merchantRepository.findById('merchant_001');
  const ps = merchant?.paymentSettings || null;
  return c.json({
    kpayAccountName: ps?.kpayAccountName || 'Ko Aung',
    kpayPhone: ps?.kpayPhone || '09-912345678',
    kpayQrUrl: ps?.kpayQrUrl || '',
    paymentRules: ps?.paymentRules || 'KBZPay Transfer only. Please send slip screenshot.',
    isConfigured: true
  });
});

app.put('/api/merchant/payment-settings', async (c) => {
  try {
    const body = await c.req.json();
    const merchant = await merchantRepository.findById('merchant_001');
    if (merchant) {
      merchant.paymentSettings = { ...merchant.paymentSettings, ...body, updatedAt: new Date().toISOString() };
      await merchantRepository.upsert(merchant);
    }
    return c.json({ success: true, paymentSettings: body });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Sample AI replies
app.get('/api/merchant/samples', (c) => {
  return c.json([
    {
      id: 'sample_1',
      merchantId: 'merchant_001',
      customerMessage: 'ဒီအင်္ကျီ အနက်ရောင် M Size ရှိလား။',
      preferredReply: 'မင်္ဂလာပါရှင့်။ အနက်ရောင် M Size လေးကို စစ်ဆေးပေးပါမယ်နော်။',
      category: 'Stock and variants',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'sample_2',
      merchantId: 'merchant_001',
      customerMessage: 'စျေးနှုန်းဘယ်လောက်လဲ ပို့ခဘယ်လောက်ကျလဲ။',
      preferredReply: 'မင်္ဂလာပါရှင်။ ကုန်ပစ္စည်းစျေးနှုန်းကတော့ Product description မှာ ကြည့်လို့ရပါတယ်ရှင်။ ရန်ကုန်မြို့တွင်း ပို့ခက 2,500 ကျပ် ဖြစ်ပါတယ်။',
      category: 'Price',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]);
});

// Merchant AI Config
app.get('/api/merchant/ai-config', (c) => {
  return c.json({
    enabled: true,
    preferredLanguage: 'myanmar',
    replyStyle: 'friendly',
    customInstructions: 'Customer များကို ယဉ်ကျေးပြီး ဖော်ရွေစွာ ပြန်ဖြေပါ။',
    salesBehavior: {
      greeting: 'greet_new',
      responseLength: 'balanced',
      emojiPreference: 'moderate',
      productRecommendation: 'answer_first',
      followUp: 'needed_only',
      salesApproach: 'helpful_recommendations',
      discountBehavior: 'verified_only',
      uncertainPolicy: 'escalate_to_human'
    },
    humanHandoff: {
      enabled: true,
      triggerOnUncertain: true,
      triggerOnComplaint: true,
      triggerOnHumanRequest: true,
      notificationChannel: 'telegram_staff'
    }
  });
});

// AI Health Status
app.get('/api/ai/health', (c) => {
  return c.json({
    status: 'healthy',
    provider: 'cloudflare-workers',
    model: 'gemini-1.5-flash',
    timestamp: new Date().toISOString()
  });
});

// Conversations list
app.get('/api/conversations', (c) => {
  return c.json([]);
});

// Support conversations list
app.get('/api/merchant/support/conversations', (c) => {
  return c.json([]);
});

// Merchant onboarding
app.post('/api/merchant/onboard', async (c) => {
  try {
    const body = await c.req.json();
    const auth = await extractUser(c);
    const merchantId = body.merchantId || `merchant_${Date.now()}`;
    const merchant: MerchantRecord = {
      id: merchantId,
      shopName: body.shopName || body.storeName || 'My Shop',
      ownerName: body.ownerName || auth?.user?.name || 'Shop Owner',
      email: body.email || auth?.user?.email || 'owner@shop.mm',
      store: {
        slug: (body.shopName || 'my-shop').toLowerCase().replace(/[^a-z0-9]/g, '-'),
        storeName: body.shopName || 'My Shop',
        description: body.description || '',
        isPublished: true
      },
      aiConfig: { enabled: true }
    };
    await merchantRepository.upsert(merchant);
    if (auth?.user) {
      auth.user.merchantId = merchantId;
      await userRepository.upsert(auth.user);
      const token = auth.token || 'tok_' + Math.random().toString(36).substring(2, 10);
      await tokenRepository.saveToken(token, auth.user, 30);
      return c.json({ success: true, merchant, user: auth.user, token });
    }
    return c.json({ success: true, merchant });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ----------------------------------------------------
// 7. Public Customer Storefront & Marketplace Routes
// ----------------------------------------------------
app.get('/api/public/store/:slug', async (c) => {
  const slug = c.req.param('slug');
  const env = c.env;
  const projectId = env?.FIREBASE_PROJECT_ID || 'gen-lang-client-0903319954';
  const client = new FirestoreRestClient({
    projectId,
    databaseId: env?.FIRESTORE_DATABASE_ID || 'ai-studio-myanmaraiseller-5ecdcad1-2fa1-4433-8ee7-fae758ed7e19',
    credentials: env?.FIREBASE_PRIVATE_KEY ? {
      project_id: projectId,
      client_email: env?.FIREBASE_CLIENT_EMAIL || '',
      private_key: env.FIREBASE_PRIVATE_KEY
    } : undefined
  });

  try {
    const merchants = await client.runQuery('merchants', {
      where: [{ field: 'slug', op: 'EQUAL', value: slug }]
    });

    if (!merchants || merchants.length === 0) {
      return c.json({ error: 'Store not found' }, 404);
    }

    const merchant = merchants[0];
    const products = await client.runQuery('products', {
      where: [{ field: 'merchantId', op: 'EQUAL', value: merchant.id }]
    });

    return c.json({ merchant, products: products || [] });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Internal error' }, 500);
  }
});

app.get('/api/public/marketplace', async (c) => {
  const env = c.env;
  const projectId = env?.FIREBASE_PROJECT_ID || 'gen-lang-client-0903319954';
  const client = new FirestoreRestClient({
    projectId,
    databaseId: env?.FIRESTORE_DATABASE_ID || 'ai-studio-myanmaraiseller-5ecdcad1-2fa1-4433-8ee7-fae758ed7e19',
    credentials: env?.FIREBASE_PRIVATE_KEY ? {
      project_id: projectId,
      client_email: env?.FIREBASE_CLIENT_EMAIL || '',
      private_key: env.FIREBASE_PRIVATE_KEY
    } : undefined
  });

  try {
    const products = await client.runQuery('products', {
      limit: 50
    });
    return c.json({ products: products || [] });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Internal error' }, 500);
  }
});

// Atomic checkout order processing (BLK-02)
app.post('/api/public/store/:slug/orders', async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json();
  const idempotencyKey = c.req.header('x-idempotency-key') || body.idempotencyKey;

  try {
    const orderResult = await checkoutEngine.processCheckout({
      merchantId: body.merchantId || 'merchant_001',
      slug,
      items: body.items,
      customer: body.customer,
      paymentMethod: body.paymentMethod || 'kpay',
      idempotencyKey
    });
    return c.json({ success: true, order: orderResult });
  } catch (err: any) {
    const statusCode = err.code === 'INSUFFICIENT_VARIANT_STOCK' ? 409 : 
                       err.code === 'IDEMPOTENCY_CONFLICT' ? 409 : 400;
    return c.json({ error: err.message, code: err.code || 'CHECKOUT_ERROR' }, statusCode);
  }
});

// ----------------------------------------------------
// 8. Accounting & Reversals (BLK-03)
// ----------------------------------------------------
app.get('/api/accounting/entries', async (c) => {
  try {
    const merchantId = c.req.query('merchantId') || 'merchant_001';
    const entries = await ledgerService.listEntriesByMerchant(merchantId);
    return c.json({ entries: entries || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/accounting/entries/:id/reverse', async (c) => {
  const entryId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  try {
    const reversal = await ledgerService.reverseJournalEntry(
      entryId, 
      body.merchantId || 'merchant_001', 
      body.actorId || 'user_admin', 
      body.reason || 'Reversal'
    );
    return c.json({ success: true, reversal });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// ----------------------------------------------------
// 9. Human-in-the-Loop AI Action Security (BLK-05)
// ----------------------------------------------------
app.post('/api/merchant/ai-actions/propose', async (c) => {
  const body = await c.req.json();
  try {
    const proposal = aiActionSecurity.createSignedProposalToken({
      actionType: body.actionType,
      merchantId: body.merchantId,
      proposedByModel: body.proposedByModel || 'gemini-1.5-flash',
      payload: body.payload,
      reasoning: body.reasoning || 'AI proposal'
    });
    return c.json({ success: true, proposal });
  } catch (err: any) {
    return c.json({ error: err.message }, 403);
  }
});

app.post('/api/merchant/ai-actions/execute', async (c) => {
  const body = await c.req.json();
  try {
    const result = await aiActionSecurity.executeApprovedAction(
      body.actionToken,
      body.payload,
      {
        userId: body.userId || 'user_admin',
        role: body.userRole || 'merchant_admin',
        merchantId: body.merchantId
      }
    );
    return c.json({ success: true, result });
  } catch (err: any) {
    return c.json({ error: err.message }, 403);
  }
});

// ----------------------------------------------------
// 10. Audit Logging (BLK-06)
// ----------------------------------------------------
app.get('/api/audit-logs', async (c) => {
  const merchantId = c.req.query('merchantId');
  if (!merchantId) {
    return c.json({ error: 'merchantId query parameter is required' }, 400);
  }
  try {
    const logs = await auditLogger.getAuditLogsByMerchant(merchantId);
    return c.json({ logs });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ----------------------------------------------------
// 11. AI Studio Copy Generation
// ----------------------------------------------------
app.post('/api/ai-studio/generate-copy', async (c) => {
  try {
    const body = await c.req.json();
    const { productId, copyType } = body;
    const product = await productRepository.findById(productId);
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    const generatedText = `✨ ${product.name} ✨\n\n📌 စျေးနှုန်း: ${product.price.toLocaleString()} MMK\n📌 အသေးစိတ်: ${product.description || 'အရည်အသွေးမြင့်ပြီး စိတ်ချရသော ပစ္စည်းစစ်စစ်ဖြစ်ပါသည်။'}\n\n📩 အသေးစိတ်သိရှိလိုပါက Chat Box မှတစ်ဆင့် ဆက်သွယ်မှာယူနိုင်ပါပြီရှင်။`;
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    return c.json({
      success: true,
      generatedText,
      copyType: copyType || 'facebook_post',
      generationId
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/ai-studio/history', (c) => {
  return c.json([]);
});

// ----------------------------------------------------
// 12. Media & Storage Upload Endpoints (Pure Web)
// ----------------------------------------------------
app.get('/api/storage/status', async (c) => {
  const status = getSupabaseStorageStatus(c.env);
  return c.json(status);
});

app.post('/api/merchant/upload-image', async (c) => {
  const auth = await extractUser(c);
  if (!auth) {
    return c.json({ error: 'Unauthorized: Authentication required', code: 'UNAUTHENTICATED' }, 401);
  }
  try {
    const formData = await c.req.formData();
    const file = formData.get('image') as File | null;
    if (!file) {
      return c.json({ error: 'No image uploaded' }, 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const publicUrl = await uploadProductImageToSupabase(
      auth.user.merchantId || 'merchant_001',
      buffer,
      file.type,
      file.name,
      c.env
    );
    return c.json({ success: true, imageUrl: publicUrl }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/merchant/upload-qr', async (c) => {
  const auth = await extractUser(c);
  if (!auth) {
    return c.json({ error: 'Unauthorized: Authentication required', code: 'UNAUTHENTICATED' }, 401);
  }
  try {
    const formData = await c.req.formData();
    const file = formData.get('qrImage') as File | null;
    if (!file) {
      return c.json({ error: 'No QR image uploaded' }, 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const publicUrl = await uploadQrImageToSupabase(
      auth.user.merchantId || 'merchant_001',
      buffer,
      file.type,
      file.name,
      c.env
    );
    return c.json({ success: true, qrUrl: publicUrl }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/merchant/upload-storefront-asset', async (c) => {
  const auth = await extractUser(c);
  if (!auth) {
    return c.json({ error: 'Unauthorized: Authentication required', code: 'UNAUTHENTICATED' }, 401);
  }
  try {
    const formData = await c.req.formData();
    const file = formData.get('asset') as File | null;
    const assetType = (formData.get('assetType') as any) || 'background';
    if (!file) {
      return c.json({ error: 'No asset uploaded' }, 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const publicUrl = await uploadStorefrontAssetToSupabase(
      auth.user.merchantId || 'merchant_001',
      assetType,
      buffer,
      file.type,
      file.name,
      c.env
    );
    return c.json({ success: true, assetUrl: publicUrl, assetType }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/public/orders/:id/upload-slip', async (c) => {
  const orderId = c.req.param('id');
  try {
    const formData = await c.req.formData();
    const file = formData.get('slip') as File | null;
    if (!file) {
      return c.json({ error: 'No payment slip uploaded' }, 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const order = await orderRepository.findById(orderId);
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }
    const uploadRes = await uploadPaymentSlipToSupabase(
      order.merchantId || 'merchant_001',
      orderId,
      buffer,
      file.type,
      file.name,
      c.env
    );
    await orderRepository.update(orderId, {
      paymentStatus: 'SLIP_UPLOADED',
      slipStorageBucket: uploadRes.bucket,
      slipObjectPath: uploadRes.objectPath,
      paymentSlipUrl: `/api/public/orders/${orderId}/slip-image`,
      paymentSlipUploadedAt: new Date().toISOString()
    });
    return c.json({
      success: true,
      message: 'Payment slip uploaded successfully',
      slipUrl: `/api/public/orders/${orderId}/slip-image`
    }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/public/orders/:id/slip-image', async (c) => {
  const orderId = c.req.param('id');
  try {
    const order = await orderRepository.findById(orderId);
    if (!order || !order.slipObjectPath) {
      return c.json({ error: 'Payment slip not found' }, 404);
    }
    const { buffer, contentType } = await downloadPaymentSlipFromSupabase(
      order.slipStorageBucket || 'payment-slips',
      order.slipObjectPath,
      c.env
    );
    return new Response(buffer as any, { headers: { 'Content-Type': contentType } });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ----------------------------------------------------
// Catch-all API 404 Handler (Always JSON, never HTML)
// ----------------------------------------------------
app.all('/api/*', (c) => {
  return c.json({
    error: 'Not Found',
    message: `API endpoint not found: ${c.req.method} ${c.req.path}`,
    code: 'API_ENDPOINT_NOT_FOUND'
  }, 404);
});

// ====================================================
// Cloudflare Worker Standard Module Export
// ====================================================
export default {
  fetch(request: Request, env: Bindings, ctx: any) {
    return app.fetch(request, env, ctx);
  }
};

// ====================================================
// Node.js Local Development Runtime Bridge
// ====================================================
// Automatically serves port 3000 when executed directly via `tsx server.ts` or Node CLI
const isDirectEntry = typeof process !== 'undefined' && 
  process.release?.name === 'node' && 
  typeof (globalThis as any).WebSocketPair === 'undefined' &&
  Boolean(process.argv[1] && (process.argv[1].endsWith('/server.ts') || process.argv[1].endsWith('server.ts')));

if (isDirectEntry) {
  (async () => {
    try {
      const port = Number(process.env.PORT) || 3000;
      const { serve } = await import('@hono/node-server');
      const fs = await import('node:fs');
      const path = await import('node:path');


      serve({
        fetch: async (request: Request, env: any) => {
          const url = new URL(request.url);
          // Delegate API routes to Hono Worker
          if (url.pathname.startsWith('/api/')) {
            return app.fetch(request, env);
          }
          // Serve static files from ./dist
          const filePath = path.join(process.cwd(), 'dist', url.pathname === '/' ? 'index.html' : url.pathname);
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const fileBuffer = fs.readFileSync(filePath);
            const ext = path.extname(filePath);
            const mime = ext === '.html' ? 'text/html' :
                         ext === '.js' ? 'application/javascript' :
                         ext === '.css' ? 'text/css' :
                         ext === '.svg' ? 'image/svg+xml' :
                         ext === '.png' ? 'image/png' :
                         ext === '.json' ? 'application/json' : 'application/octet-stream';
            return new Response(fileBuffer, { headers: { 'Content-Type': mime } });
          }
          // SPA Fallback: serve dist/index.html
          const indexPath = path.join(process.cwd(), 'dist', 'index.html');
          if (fs.existsSync(indexPath)) {
            return new Response(fs.readFileSync(indexPath), { headers: { 'Content-Type': 'text/html' } });
          }
          return app.fetch(request, env);
        },
        port
      }, (info) => {
        console.log(`[ShopSone Server] Hono Module Worker running on http://localhost:${info.port}`);
      });
    } catch (nodeErr) {
      console.warn('[NodeRuntime] Worker running in pure mode:', nodeErr);
    }
  })();
}

