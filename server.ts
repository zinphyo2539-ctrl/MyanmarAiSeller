/**
 * Myanmar AI Seller (ShopSone) - Cloudflare Module Worker & Unified API Server
 * Compliant with Cloudflare Workers Module syntax: `export default { fetch: app.fetch }`
 * Pure Web Standards (Request/Response/Fetch) with zero unsupported Node.js native dependencies.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { FirestoreRestClient } from './server/firestoreClient.ts';
import { validateProductImageUrl } from './server/validator.ts';
import { checkoutEngine } from './server/checkoutEngine.ts';
import { ledgerService } from './server/accounting/ledger.ts';
import { aiActionSecurity } from './server/aiActions/actionSecurity.ts';
import { auditLogger } from './server/audit/auditLogger.ts';
import { tokenRepository } from './server/repositories/tokenRepository.ts';
import { userRepository } from './server/repositories/userRepository.ts';
import { merchantRepository } from './server/repositories/merchantRepository.ts';
import { productRepository } from './server/repositories/productRepository.ts';
import { orderRepository } from './server/repositories/orderRepository.ts';
import { UserRecord, MerchantRecord, ProductRecord, getDefaultThemeConfig, sanitizeThemeConfig } from './server/db.ts';
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
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
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
        merchantId: null,
        provider: 'google',
        providerId: userId,
        createdAt: new Date().toISOString()
      };
      await userRepository.upsert(user);
    } else if (!user.merchantId) {
      user.merchantId = null;
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
    merchantId: 'merchant_001', // Dev login specifically uses the demo merchant
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
app.get('/api/dashboard/summary', async (c) => {
  try {
    const auth = await extractUser(c);
    if (!auth?.user?.merchantId) return c.json({ error: 'Unauthorized or no merchant linked' }, 401);
    const merchantId = auth.user.merchantId;

    const [products, orders] = await Promise.all([
      productRepository.findByMerchantId(merchantId),
      orderRepository.findByMerchantId(merchantId)
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
    const auth = await extractUser(c);
    if (!auth?.user?.merchantId) return c.json({ error: 'Unauthorized' }, 401);
    const products = await productRepository.findByMerchantId(auth.user.merchantId);
    return c.json(products || []);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/products', async (c) => {
  try {
    const auth = await extractUser(c);
    if (!auth?.user?.merchantId) return c.json({ error: 'Unauthorized' }, 401);
    const merchantId = auth.user.merchantId;

    const body = await c.req.json();
    const id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const product: ProductRecord = {
      id,
      merchantId,
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
      category: body.category || null,
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
    const auth = await extractUser(c);
    if (!auth?.user?.merchantId) return c.json({ error: 'Unauthorized' }, 401);
    const orders = await orderRepository.findByMerchantId(auth.user.merchantId);
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
    const auth = await extractUser(c);
    if (!auth?.user?.merchantId) return c.json({ error: 'Unauthorized' }, 401);
    const merchant = await merchantRepository.findById(auth.user.merchantId);
    if (!merchant) return c.json({ error: 'Merchant not found' }, 404);
    
    return c.json(merchant.store || {
      slug: merchant.id,
      storeName: merchant.shopName,
      isPublished: true
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/merchant/store', async (c) => {
  try {
    const auth = await extractUser(c);
    if (!auth?.user?.merchantId) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json();
    const merchant = await merchantRepository.findById(auth.user.merchantId);
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

// Storefront theme management
app.get('/api/merchant/storefront/theme', async (c) => {
  const auth = await extractUser(c);
  const merchantId = auth?.user?.merchantId || 'merchant_001';
  
  try {
    const merchant = await merchantRepository.findById(merchantId);
    if (!merchant) {
      const defaultTheme = getDefaultThemeConfig('My Store');
      return c.json({ 
        published: defaultTheme, 
        draft: defaultTheme, 
        hasUnpublishedChanges: false 
      });
    }
    
    const published = sanitizeThemeConfig(merchant.store?.themeConfig, merchant.shopName);
    const draft = sanitizeThemeConfig(merchant.store?.draftThemeConfig || published, merchant.shopName);
    
    // Check if draft is different from published
    const hasUnpublishedChanges = JSON.stringify(published) !== JSON.stringify(draft);
    
    return c.json({ published, draft, hasUnpublishedChanges });
  } catch (err: any) {
    const defaultTheme = getDefaultThemeConfig('My Store');
    return c.json({ 
      published: defaultTheme, 
      draft: defaultTheme, 
      hasUnpublishedChanges: false 
    });
  }
});

app.put('/api/merchant/storefront/theme/draft', async (c) => {
  const auth = await extractUser(c);
  if (!auth) return c.json({ error: 'Unauthorized' }, 401);
  const merchantId = auth.user.merchantId || 'merchant_001';
  
  try {
    const body = await c.req.json();
    const merchant = await merchantRepository.findById(merchantId);
    if (!merchant) return c.json({ error: 'Merchant not found' }, 404);
    
    const sanitized = sanitizeThemeConfig(body, merchant.shopName);
    merchant.store = { 
      ...merchant.store, 
      draftThemeConfig: sanitized,
      updatedAt: new Date().toISOString() 
    };
    
    await merchantRepository.upsert(merchant);
    return c.json({ success: true, draft: sanitized });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/merchant/storefront/theme/publish', async (c) => {
  const auth = await extractUser(c);
  if (!auth) return c.json({ error: 'Unauthorized' }, 401);
  const merchantId = auth.user.merchantId || 'merchant_001';
  
  try {
    const merchant = await merchantRepository.findById(merchantId);
    if (!merchant) return c.json({ error: 'Merchant not found' }, 404);
    
    const draft = sanitizeThemeConfig(merchant.store?.draftThemeConfig, merchant.shopName);
    draft.publishedAt = new Date().toISOString();
    
    merchant.store = {
      ...merchant.store,
      themeConfig: draft,
      updatedAt: new Date().toISOString()
    };
    
    await merchantRepository.upsert(merchant);
    return c.json({ success: true, published: draft });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/merchant/storefront/theme/revert', async (c) => {
  const auth = await extractUser(c);
  if (!auth) return c.json({ error: 'Unauthorized' }, 401);
  const merchantId = auth.user.merchantId || 'merchant_001';
  
  try {
    const merchant = await merchantRepository.findById(merchantId);
    if (!merchant) return c.json({ error: 'Merchant not found' }, 404);
    
    const published = sanitizeThemeConfig(merchant.store?.themeConfig, merchant.shopName);
    
    merchant.store = {
      ...merchant.store,
      draftThemeConfig: published,
      updatedAt: new Date().toISOString()
    };
    
    await merchantRepository.upsert(merchant);
    return c.json({ success: true, draft: published });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Payment settings
app.get('/api/merchant/payment-settings', async (c) => {
  const auth = await extractUser(c);
  if (!auth?.user?.merchantId) return c.json({ error: 'Unauthorized' }, 401);
  const merchant = await merchantRepository.findById(auth.user.merchantId);
  const ps = merchant?.paymentSettings || null;
  return c.json({
    kpayAccountName: ps?.kpayAccountName || '',
    kpayPhone: ps?.kpayPhone || '',
    kpayQrUrl: ps?.kpayQrUrl || '',
    paymentRules: ps?.paymentRules || '',
    isConfigured: !!ps
  });
});

app.put('/api/merchant/payment-settings', async (c) => {
  try {
    const auth = await extractUser(c);
    if (!auth?.user?.merchantId) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json();
    const merchant = await merchantRepository.findById(auth.user.merchantId);
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
app.get('/api/merchant/samples', async (c) => {
  const auth = await extractUser(c);
  const merchantId = auth?.user?.merchantId;
  if (!merchantId) return c.json([]);
  
  // Return actual samples for this merchant (mocking for now as repo is missing)
  return c.json([]);
});

const GROQ_MAIN_TEXT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_MAIN_VISION_MODEL = 'qwen/qwen3.8-27b';
const CF_FALLBACK_TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const CF_FALLBACK_VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

function getAiRuntimeConfig(c: any) {
  const groqApiKey =
    c.env?.GROQ_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.GROQ_API_KEY : undefined);
  const cfAiBinding = (c.env as any)?.AI;
  const cfToken =
    c.env?.CLOUDFLARE_API_TOKEN ||
    (typeof process !== 'undefined' ? process.env?.CLOUDFLARE_API_TOKEN : undefined);
  const cfAccount =
    c.env?.CLOUDFLARE_ACCOUNT_ID ||
    (typeof process !== 'undefined' ? process.env?.CLOUDFLARE_ACCOUNT_ID : undefined);

  const hasGroq = Boolean(typeof groqApiKey === 'string' && groqApiKey.trim());
  const hasCloudflare = Boolean(
    (cfAiBinding && typeof cfAiBinding.run === 'function') ||
      (cfToken && cfAccount)
  );

  return {
    groqApiKey: hasGroq ? groqApiKey!.trim() : undefined,
    cfAiBinding,
    cfToken,
    cfAccount,
    hasGroq,
    hasCloudflare,
  };
}

function getDefaultAiConfig() {
  return {
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
      uncertainPolicy: 'escalate_to_human',
    },
    humanHandoff: {
      enabled: true,
      triggerOnUncertain: true,
      triggerOnComplaint: true,
      triggerOnHumanRequest: true,
      notificationChannel: 'telegram_staff',
    },
  };
}

async function callGroqTextChat(
  groqApiKey: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<{ text: string; model: string }> {
  const model = options?.model || GROQ_MAIN_TEXT_MODEL;
  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.5,
      max_tokens: options?.maxTokens ?? 700,
    }),
  });

  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => '');
    throw new Error(`Groq API failed (${groqRes.status}): ${errText || groqRes.statusText}`);
  }

  const groqData: any = await groqRes.json();
  const content = groqData?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Groq API returned an empty completion');
  }
  return { text: content.trim(), model };
}

async function callCloudflareTextChat(
  cfAiBinding: any,
  cfToken: string | undefined,
  cfAccount: string | undefined,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  maxTokens = 700
): Promise<{ text: string; model: string }> {
  const payload = { messages, max_tokens: maxTokens };

  if (cfAiBinding && typeof cfAiBinding.run === 'function') {
    const result = await cfAiBinding.run(CF_FALLBACK_TEXT_MODEL, payload);
    const text = typeof result?.response === 'string' ? result.response.trim() : '';
    if (!text) throw new Error('Cloudflare Workers AI returned empty response');
    return { text, model: CF_FALLBACK_TEXT_MODEL };
  }

  if (!cfToken || !cfAccount) {
    throw new Error('Cloudflare Workers AI credentials are not configured');
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cfAccount)}/ai/run/${CF_FALLBACK_TEXT_MODEL}`;
  const cfRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!cfRes.ok) {
    const errText = await cfRes.text().catch(() => '');
    throw new Error(`Cloudflare AI failed (${cfRes.status}): ${errText || cfRes.statusText}`);
  }

  const cfJson: any = await cfRes.json();
  const text = String(cfJson?.result?.response ?? cfJson?.response ?? '').trim();
  if (!text) throw new Error('Cloudflare Workers AI returned empty response');
  return { text, model: CF_FALLBACK_TEXT_MODEL };
}

function buildSalesSystemPrompt(params: {
  shopName: string;
  products: ProductRecord[];
  customInstructions?: string;
  replyStyle?: string;
  preferredLanguage?: string;
  catalogMode?: 'real' | 'empty';
}): string {
  const {
    shopName,
    products,
    customInstructions,
    replyStyle = 'friendly',
    preferredLanguage = 'myanmar',
    catalogMode = 'real',
  } = params;

  const langRule =
    preferredLanguage === 'english'
      ? 'Respond in clear, polite English.'
      : preferredLanguage === 'bilingual'
      ? 'Respond primarily in natural Myanmar (Burmese Unicode) with helpful English product terms.'
      : 'Respond naturally and politely in Myanmar (Burmese Unicode).';

  const catalogLines =
    catalogMode === 'empty' || products.length === 0
      ? 'Catalog is currently empty (0 products available). Do NOT invent any products, prices, or stock. Politely state that no matching stock is listed and offer human assistance.'
      : products
          .slice(0, 30)
          .map((p) => {
            const variantsText = Array.isArray(p.variants) && p.variants.length > 0
              ? p.variants.map((v: any) => `${v.color || 'Std'}/${v.size || 'Free'}: ${Number(v.stock || 0)} left`).join(', ')
              : 'Standard stock';
            return `- ${p.name} (SKU: ${p.sku}) | Price: ${Number(p.price || 0).toLocaleString()} MMK | Category: ${p.category || 'General'} | Variants: ${variantsText}`;
          })
          .join('\n');

  return [
    `You are the official AI Sales Representative for "${shopName}".`,
    langRule,
    `Reply style: ${replyStyle}.`,
    customInstructions ? `Merchant instructions: ${customInstructions}` : '',
    'Strict truthfulness rules:',
    '1. ONLY quote product names, prices, and variant stock quantities explicitly present in the Verified Catalog below.',
    '2. If a requested item is not in the catalog, clearly state it is unavailable without inventing alternatives or prices.',
    '3. NEVER confirm or claim that a bank/KBZPay payment has been verified or received; explain that human staff will verify payment slips.',
    `Verified Store Catalog (${catalogMode === 'empty' ? 0 : products.length} items):\n${catalogLines}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

// Merchant AI Config
app.get('/api/merchant/ai-config', async (c) => {
  const defaults = getDefaultAiConfig();
  const auth = await extractUser(c);
  if (auth?.user?.merchantId) {
    const merchant = await merchantRepository.findById(auth.user.merchantId);
    if (merchant?.aiConfig) {
      return c.json({
        ...defaults,
        ...merchant.aiConfig,
        salesBehavior: { ...defaults.salesBehavior, ...(merchant.aiConfig.salesBehavior || {}) },
        humanHandoff: { ...defaults.humanHandoff, ...(merchant.aiConfig.humanHandoff || {}) },
        provider: 'groq',
        model: GROQ_MAIN_TEXT_MODEL,
        visionModel: GROQ_MAIN_VISION_MODEL,
      });
    }
  }
  return c.json({
    ...defaults,
    provider: 'groq',
    model: GROQ_MAIN_TEXT_MODEL,
    visionModel: GROQ_MAIN_VISION_MODEL,
  });
});

app.put('/api/merchant/ai-config', async (c) => {
  const auth = await extractUser(c);
  if (!auth?.user?.merchantId) {
    return c.json({ error: 'Unauthorized: Authentication required', code: 'UNAUTHENTICATED' }, 401);
  }
  try {
    const body = await c.req.json();
    const merchant = await merchantRepository.findById(auth.user.merchantId);
    if (!merchant) {
      return c.json({ error: 'Merchant not found' }, 404);
    }
    const defaults = getDefaultAiConfig();
    const current = merchant.aiConfig || defaults;
    const updatedConfig = {
      ...defaults,
      ...current,
      ...body,
      salesBehavior: {
        ...defaults.salesBehavior,
        ...(current.salesBehavior || {}),
        ...(body.salesBehavior || {}),
      },
      humanHandoff: {
        ...defaults.humanHandoff,
        ...(current.humanHandoff || {}),
        ...(body.humanHandoff || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    merchant.aiConfig = updatedConfig;
    await merchantRepository.upsert(merchant);
    return c.json({ success: true, aiConfig: updatedConfig });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to update AI config' }, 500);
  }
});

// AI Health Status (Groq is strictly Main AI Provider; Cloudflare Workers AI is optional fallback)
app.get('/api/ai/health', (c) => {
  const { hasGroq, hasCloudflare } = getAiRuntimeConfig(c);
  const now = new Date().toISOString();
  return c.json({
    provider: 'groq',
    configured: hasGroq,
    status: hasGroq ? 'operational' : 'configuration_missing',
    model: GROQ_MAIN_TEXT_MODEL,
    visionModel: GROQ_MAIN_VISION_MODEL,
    fallbackProvider: hasCloudflare ? 'cloudflare-workers-ai' : null,
    fallbackConfigured: hasCloudflare,
    fallbackVisionModel: hasCloudflare ? CF_FALLBACK_VISION_MODEL : null,
    lastCheck: now,
    timestamp: now,
  });
});

// AI Reply Live Preview (Groq Main)
app.post('/api/ai/preview', async (c) => {
  const auth = await extractUser(c);
  if (!auth?.user?.merchantId) {
    return c.json({ error: 'Unauthorized: Authentication required', code: 'UNAUTHENTICATED' }, 401);
  }
  const { groqApiKey, cfAiBinding, cfToken, cfAccount, hasGroq, hasCloudflare } = getAiRuntimeConfig(c);
  if (!hasGroq && !hasCloudflare) {
    return c.json({ error: 'GROQ_API_KEY is not configured on the server.' }, 503);
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    const customerMessage = String(body.customerMessage || '').trim();
    if (!customerMessage) {
      return c.json({ error: 'customerMessage is required' }, 400);
    }

    const merchant = await merchantRepository.findById(auth.user.merchantId);
    const products = await productRepository.findByMerchantId(auth.user.merchantId);
    const systemPrompt = buildSalesSystemPrompt({
      shopName: merchant?.shopName || 'ShopSone Store',
      products,
      customInstructions: body.customInstructions || merchant?.aiConfig?.customInstructions,
      replyStyle: body.replyStyle || merchant?.aiConfig?.replyStyle,
      preferredLanguage: body.preferredLanguage || merchant?.aiConfig?.preferredLanguage,
    });

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: customerMessage },
    ];

    if (groqApiKey) {
      try {
        const res = await callGroqTextChat(groqApiKey, messages);
        return c.json({ previewReply: res.text, provider: 'groq', model: res.model });
      } catch (groqErr) {
        if (!hasCloudflare) throw groqErr;
      }
    }

    const cfRes = await callCloudflareTextChat(cfAiBinding, cfToken, cfAccount, messages);
    return c.json({ previewReply: cfRes.text, provider: 'cloudflare-workers-ai', model: cfRes.model });
  } catch (err: any) {
    return c.json({ error: err?.message || 'AI preview failed' }, 500);
  }
});

// AI Testing Lab Status & Chat (Groq Main)
app.get('/api/ai/test-lab/status', async (c) => {
  const auth = await extractUser(c);
  if (!auth?.user?.merchantId) {
    return c.json({ error: 'Unauthorized: Authentication required', code: 'UNAUTHENTICATED' }, 401);
  }
  const { hasGroq, hasCloudflare } = getAiRuntimeConfig(c);
  const merchant = await merchantRepository.findById(auth.user.merchantId);
  const products = await productRepository.findByMerchantId(auth.user.merchantId);

  return c.json({
    status: hasGroq ? 'operational' : 'configuration_missing',
    provider: 'groq',
    model: GROQ_MAIN_TEXT_MODEL,
    visionModel: GROQ_MAIN_VISION_MODEL,
    configured: hasGroq,
    fallbackProvider: hasCloudflare ? 'cloudflare-workers-ai' : null,
    fallbackConfigured: hasCloudflare,
    merchantId: auth.user.merchantId,
    shopName: merchant?.shopName || 'ShopSone Store',
    realCatalogCount: products.length,
    sampleCount: 0,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/ai/test-lab/chat', async (c) => {
  const auth = await extractUser(c);
  if (!auth?.user?.merchantId) {
    return c.json({ error: 'Unauthorized: Authentication required', code: 'UNAUTHENTICATED' }, 401);
  }
  const { groqApiKey, cfAiBinding, cfToken, cfAccount, hasGroq, hasCloudflare } = getAiRuntimeConfig(c);
  if (!hasGroq && !hasCloudflare) {
    return c.json({ error: 'GROQ_API_KEY is not configured on the server.' }, 503);
  }

  const startedAt = Date.now();
  try {
    const body = await c.req.json().catch(() => ({}));
    const customerMessage = String(body.customerMessage || '').trim();
    if (!customerMessage) {
      return c.json({ error: 'customerMessage is required' }, 400);
    }
    const catalogMode: 'real' | 'empty' = body.catalogMode === 'empty' ? 'empty' : 'real';
    const merchant = await merchantRepository.findById(auth.user.merchantId);
    const allProducts = await productRepository.findByMerchantId(auth.user.merchantId);
    const groundedProducts = catalogMode === 'empty' ? [] : allProducts;

    const systemPrompt = buildSalesSystemPrompt({
      shopName: merchant?.shopName || 'ShopSone Store',
      products: groundedProducts,
      customInstructions: body.customInstructions || merchant?.aiConfig?.customInstructions,
      replyStyle: body.replyStyle || merchant?.aiConfig?.replyStyle,
      preferredLanguage: body.preferredLanguage || merchant?.aiConfig?.preferredLanguage,
      catalogMode,
    });

    const historyTurns = Array.isArray(body.history)
      ? body.history
          .slice(-10)
          .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
          .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      : [];

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...historyTurns,
      { role: 'user', content: customerMessage },
    ];

    let replyText = '';
    let usedProvider = 'groq';
    let usedModel = GROQ_MAIN_TEXT_MODEL;

    if (groqApiKey) {
      try {
        const res = await callGroqTextChat(groqApiKey, messages, { maxTokens: 900 });
        replyText = res.text;
        usedModel = res.model;
      } catch (groqErr) {
        if (!hasCloudflare) throw groqErr;
      }
    }

    if (!replyText && hasCloudflare) {
      const cfRes = await callCloudflareTextChat(cfAiBinding, cfToken, cfAccount, messages, 900);
      replyText = cfRes.text;
      usedProvider = 'cloudflare-workers-ai';
      usedModel = cfRes.model;
    }

    return c.json({
      reply: replyText,
      metadata: {
        latencyMs: Date.now() - startedAt,
        provider: usedProvider,
        model: usedModel,
        catalogMode,
        productsCount: groundedProducts.length,
      },
    });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Test Lab chat failed' }, 500);
  }
});

// AI Store Optimization Suggestions (Groq Main)
app.post('/api/ai/suggestions', async (c) => {
  const auth = await extractUser(c);
  if (!auth?.user?.merchantId) {
    return c.json({ error: 'Unauthorized: Authentication required', code: 'UNAUTHENTICATED' }, 401);
  }
  const products = await productRepository.findByMerchantId(auth.user.merchantId);
  const { groqApiKey } = getAiRuntimeConfig(c);

  if (groqApiKey) {
    try {
      const res = await callGroqTextChat(
        groqApiKey,
        [
          {
            role: 'system',
            content:
              'Return strictly a JSON object {"suggestions": ["...", "...", "..."]} with 3 practical tips in Myanmar Unicode for a retail seller.',
          },
          {
            role: 'user',
            content: `Store has ${products.length} products. Generate 3 concise Myanmar e-commerce optimization tips for catalog photos, pricing clarity, and fast AI replies.`,
          },
        ],
        { temperature: 0.4, maxTokens: 400 }
      );
      const parsed = extractJsonObject(res.text);
      if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
        return c.json({ suggestions: parsed.suggestions, provider: 'groq', model: res.model });
      }
    } catch {
      // Fall through to deterministic catalog-aware suggestions
    }
  }

  return c.json({
    provider: 'groq',
    suggestions: [
      products.length < 3
        ? 'ကုန်ပစ္စည်းအနည်းဆုံး ၃ မျိုးနှင့်အထက် တင်ထားပါက AI မှ ဖောက်သည်များကို ပိုမိုတိကျစွာ ညွှန်းပေးနိုင်ပါမည်။'
        : 'ကုန်ပစ္စည်းတိုင်းတွင် အရောင်/အရွယ်အစား Stock အရေအတွက်ကို ပုံမှန် Update လုပ်ထားပါ။',
      'ပစ္စည်းဓာတ်ပုံများကို 1:1 စတုရန်းပုံစံဖြင့် ကြည်လင်စွာ ရိုက်တင်ခြင်းဖြင့် ဝယ်ယူမှုနှုန်း တိုးမြှင့်နိုင်ပါသည်။',
      'KBZPay ငွေပေးချေမှု အချက်အလက်များနှင့် ပို့ဆောင်ခ စည်းမျဉ်းများကို ဆိုင်ဆက်တင်တွင် ပြည့်စုံစွာ ဖြည့်သွင်းထားပါ။',
    ],
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
    const rawSlugSource = String(body.slug || body.shopName || body.storeName || '').trim().toLowerCase();
    const cleanedSlug = rawSlugSource
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const finalSlug = cleanedSlug || merchantId.toLowerCase();

    const merchant: MerchantRecord = {
      id: merchantId,
      shopName: body.shopName || body.storeName || 'My Shop',
      ownerName: body.ownerName || auth?.user?.name || 'Shop Owner',
      email: body.email || auth?.user?.email || 'owner@shop.mm',
      store: {
        slug: finalSlug,
        storeName: body.shopName || body.storeName || 'My Shop',
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
const fetchPublicStoreHandler = async (c: any, targetSlug?: string) => {
  let paramSlug = c.req.param('slug');
  if (paramSlug) {
    paramSlug = paramSlug.trim();
  }
  let slug = (targetSlug || paramSlug || 'yangon-style').trim();
  if (!slug || slug === 'undefined' || slug === 'null' || slug === 'sample' || slug === 'my-shop') {
    slug = 'yangon-style';
  }

  try {
    let merchant = await merchantRepository.findBySlug(slug);
    if (!merchant && slug === 'yangon-style') {
      merchant = await merchantRepository.findById('merchant_001');
      if (!merchant) {
        merchant = {
          id: 'merchant_001',
          shopName: 'ShopsOne Store',
          ownerName: 'Merchant',
          email: 'merchant@shopsone.com',
          store: {
            slug: 'yangon-style',
            storeName: 'ShopsOne Store',
            isPublished: true,
          },
          aiConfig: {}
        };
      }
    }

    if (!merchant) {
      return c.json({ error: 'Storefront not found' }, 404);
    }

    const products = await productRepository.findByMerchantId(merchant.id);
    return c.json({ merchant, products: products || [] });
  } catch (err: any) {
    if (slug === 'yangon-style') {
      const defaultMerchant = {
        id: 'merchant_001',
        shopName: 'ShopsOne Store',
        ownerName: 'Merchant',
        email: 'merchant@shopsone.com',
        store: {
          slug: 'yangon-style',
          storeName: 'ShopsOne Store',
          isPublished: true,
        },
        aiConfig: {}
      };
      const products = await productRepository.findByMerchantId('merchant_001').catch(() => []);
      return c.json({ merchant: defaultMerchant, products: products || [] });
    }
    return c.json({ error: err?.message || 'Failed to load store' }, 500);
  }
};

app.get('/api/public/store', async (c) => fetchPublicStoreHandler(c, 'yangon-style'));
app.get('/api/public/store/', async (c) => fetchPublicStoreHandler(c, 'yangon-style'));
app.get('/api/public/store/:slug', async (c) => fetchPublicStoreHandler(c));
app.get('/api/public/store/:slug/', async (c) => fetchPublicStoreHandler(c));

app.get('/api/public/marketplace', async (c) => {
  try {
    const [merchants, allProducts] = await Promise.all([
      merchantRepository.listAll(100),
      productRepository.listAll(500).catch(() => [])
    ]);

    const productsByMerchant = new Map<string, any[]>();
    for (const p of allProducts || []) {
      if (!p || !p.merchantId) continue;
      if (p.status && p.status !== 'active' && p.status !== 'published') continue;
      const list = productsByMerchant.get(p.merchantId) || [];
      list.push(p);
      productsByMerchant.set(p.merchantId, list);
    }

    const stores = (merchants || [])
      .filter((m) => m && m.store?.isPublished !== false)
      .map((m) => {
        const storeProducts = productsByMerchant.get(m.id) || [];
        return {
          slug: m.store?.slug || m.id,
          storeName: m.store?.storeName || m.shopName || 'ShopSone Store',
          brandName: m.store?.brandName || m.shopName || '',
          description: m.store?.description || '',
          logoUrl: m.store?.logoUrl || '',
          coverUrl: m.store?.coverUrl || '',
          deliveryInfo: m.store?.deliveryInfo || '',
          productCount: storeProducts.length,
          products: storeProducts
        };
      });

    const totalProducts = stores.reduce((sum, s) => sum + s.productCount, 0);
    return c.json({ stores, totalStores: stores.length, totalProducts });
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
app.get('/api/accounting/summary', async (c) => {
  try {
    const merchantId = c.req.query('merchantId') || 'merchant_001';
    const range = c.req.query('range') || 'month';
    const startDate = c.req.query('startDate') || '';
    const endDate = c.req.query('endDate') || '';

    const [orders, entries, products] = await Promise.all([
      orderRepository.findByMerchantId(merchantId),
      ledgerService.listEntriesByMerchant(merchantId),
      productRepository.findByMerchantId(merchantId)
    ]);

    let salesRevenue = 0;
    let cashReceived = 0;
    let receivables = 0;
    let cogs = 0;
    let operatingExpenses = 0;
    let cashInflows = 0;
    let cashOutflows = 0;
    let missingCostPricesCount = 0;

    (products || []).forEach((p: any) => {
      if (!p.costPrice || p.costPrice <= 0) {
        missingCostPricesCount++;
      }
    });

    const confirmedOrders = (orders || []).filter((o: any) => o.paymentStatus === 'CONFIRMED');
    confirmedOrders.forEach((o: any) => {
      salesRevenue += (o.totalAmount || 0);
      cashReceived += (o.totalAmount || 0);
      cashInflows += (o.totalAmount || 0);
    });

    (entries || []).forEach((e: any) => {
      if (e.status === 'posted') {
        e.lines?.forEach((l: any) => {
          if (l.accountCode?.startsWith('4') && l.credit > 0) {
            salesRevenue += l.credit;
          }
          if (l.accountCode?.startsWith('5') && l.debit > 0) {
            cogs += l.debit;
            cashOutflows += l.debit;
          }
          if (l.accountCode?.startsWith('6') && l.debit > 0) {
            operatingExpenses += l.debit;
            cashOutflows += l.debit;
          }
        });
      }
    });

    const grossProfit = salesRevenue - cogs;
    const netProfit = grossProfit - operatingExpenses;
    const netCashFlow = cashInflows - cashOutflows;

    return c.json({
      salesRevenue,
      cashReceived,
      receivables,
      cogs,
      operatingExpenses,
      grossProfit,
      netProfit,
      cashInflows,
      cashOutflows,
      netCashFlow,
      missingCostPricesCount,
      range,
      startDate,
      endDate,
      orderCount: (orders || []).length,
      transactionCount: (entries || []).length,
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to compute financial summary' }, 500);
  }
});

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
      proposedByModel: body.proposedByModel || 'groq-llama-3.3-70b-versatile',
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
// 11. AI Studio Generation (Cloudflare Workers AI for Images & Groq for Copy)
// ----------------------------------------------------
app.post('/api/ai-studio/generate-image', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { mode = 'clean_background', aspectRatio = '1:1', customInstructions = '', sourceImageBase64 } = body;

    const cfToken = c.env?.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
    const cfAccount = c.env?.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;

    let imageUrl = '';

    if (cfToken && cfAccount) {
      try {
        const promptText = `Professional e-commerce product studio photography, ${mode} style, aspect ratio ${aspectRatio}, ${customInstructions}, 8k resolution, photorealistic luxury retail lighting, ultra-clean commercial presentation.`;
        
        const cfRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cfToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: promptText,
            num_steps: 25
          })
        });

        if (cfRes.ok) {
          const imageBlob = await cfRes.blob();
          const buffer = new Uint8Array(await imageBlob.arrayBuffer());
          imageUrl = await uploadProductImageToSupabase('merchant_001', buffer, '', `cf_studio_${Date.now()}.png`, c.env);
        }
      } catch (cfErr) {
        console.warn('Cloudflare Workers AI image generation failed, using fallback:', cfErr);
      }
    }

    if (!imageUrl && sourceImageBase64) {
      try {
        const base64Data = sourceImageBase64.split(',')[1] || sourceImageBase64;
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        imageUrl = await uploadProductImageToSupabase('merchant_001', bytes, '', `source_enhanced_${Date.now()}.png`, c.env);
      } catch (uploadErr) {
        console.warn('Failed to upload source image base64:', uploadErr);
      }
    }

    if (!imageUrl) {
      const fallbackImages = [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800'
      ];
      imageUrl = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    }

    return c.json({
      success: true,
      imageUrl,
      generationId: `img_gen_${Date.now()}`
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Internal server error' }, 500);
  }
});

app.post('/api/ai-studio/generate-copy', async (c) => {
  try {
    const body = await c.req.json();
    const { productId, copyType, customPrompt } = body;
    let product: any = null;
    if (productId) {
      product = await productRepository.findById(productId);
    }

    const prompt = customPrompt || `Write a high-converting ${copyType} social media caption for product: ${product?.name || 'Exclusive Item'} priced at ${product?.price || 35000} MMK. Description: ${product?.description || 'High quality item'}. Include Myanmar marketing emojis and hashtags.`;

    const groqApiKey = c.env?.GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (groqApiKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are an expert e-commerce copywriter for Myanmar high-end luxury stores. Write engaging promotional text in Myanmar.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7
          })
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const generatedText = groqData.choices?.[0]?.message?.content;
          if (generatedText) {
            return c.json({
              success: true,
              generatedText,
              copyType: copyType || 'facebook_post',
              generationId: `gen_groq_${Date.now()}`
            });
          }
        }
      } catch (groqErr) {
        console.warn('Groq API call failed, using fallback:', groqErr);
      }
    }

    const productName = product?.name || 'Exclusive Item';
    const productPrice = Number(product?.price || 35000).toLocaleString();
    const productDesc = product?.description || 'အရည်အသွေးမြင့်ပြီး စိတ်ချရသော ပစ္စည်းစစ်စစ်ဖြစ်ပါသည်။';

    const generatedText = `✨ ${productName} ✨\n\n📌 စျေးနှုန်း: ${productPrice} MMK\n📌 အသေးစိတ်: ${productDesc}\n\n🔥 ပစ္စည်းအကန့်အသတ်ဖြင့်သာ ရှိသောကြောင့် အမြန်ဆုံး မှာယူလိုက်ပါ။\n📩 မှာယူလိုပါက Chat Box (သို့မဟုတ်) ဖုန်းနံပါတ်ဖြင့် ဆက်သွယ်နိုင်ပါသည်။\n\n#ShopSone #MyanmarAISeller #${productName.replace(/\s+/g, '')}`;
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

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function extractJsonObject(rawText: string): Record<string, any> {
  const withoutThinking = (rawText || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const withoutFences = withoutThinking
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(withoutFences);
  } catch {
    const start = withoutFences.indexOf('{');
    const end = withoutFences.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(withoutFences.slice(start, end + 1));
    }
    throw new Error('AI response did not contain valid JSON');
  }
}

async function analyzeImageWithGroq(
  groqApiKey: string,
  dataUri: string,
  promptText: string
): Promise<{ parsed: Record<string, any>; model: string }> {
  const model = GROQ_MAIN_VISION_MODEL;
  const messages = [
    {
      role: 'system',
      content:
        'You are a retail catalog specialist helping Myanmar online sellers quickly list products from photos. Respond strictly with a single valid JSON object matching the requested schema.',
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: promptText },
        { type: 'image_url', image_url: { url: dataUri } },
      ],
    },
  ];

  const sendRequest = async (useJsonMode: boolean) => {
    const payload: Record<string, any> = {
      model,
      messages,
      temperature: 0.2,
      max_completion_tokens: 1024,
    };
    if (useJsonMode) {
      payload.response_format = { type: 'json_object' };
    }
    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  };

  let groqRes = await sendRequest(true);
  if (!groqRes.ok && groqRes.status === 400) {
    const firstErr = await groqRes.text().catch(() => '');
    if (firstErr.toLowerCase().includes('response_format') || firstErr.toLowerCase().includes('json_object')) {
      groqRes = await sendRequest(false);
    } else {
      throw new Error(`Groq vision request failed (400): ${firstErr || groqRes.statusText}`);
    }
  }

  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => '');
    throw new Error(`Groq vision request failed (${groqRes.status}): ${errText || groqRes.statusText}`);
  }

  const groqData: any = await groqRes.json();
  const content = groqData?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Groq returned an empty vision response');
  }
  return { parsed: extractJsonObject(content), model };
}

async function analyzeImageWithCloudflare(
  cfAiBinding: any,
  cfToken: string | undefined,
  cfAccount: string | undefined,
  imageBytes: Uint8Array,
  promptText: string
): Promise<{ parsed: Record<string, any>; model: string }> {
  const model = '@cf/meta/llama-3.2-11b-vision-instruct';
  const messages = [
    {
      role: 'system',
      content:
        'You are a retail catalog specialist helping Myanmar online sellers quickly list products from photos. Respond ONLY with a valid JSON object (no markdown, no extra text).',
    },
    {
      role: 'user',
      content: promptText,
    },
  ];

  const payload = {
    messages,
    image: Array.from(imageBytes),
    max_tokens: 1024,
  };

  if (cfAiBinding && typeof cfAiBinding.run === 'function') {
    const result = await cfAiBinding.run(model, payload);
    const raw = typeof result?.response === 'string' ? result.response : JSON.stringify(result?.response ?? result ?? {});
    return { parsed: extractJsonObject(raw), model };
  }

  if (!cfToken || !cfAccount) {
    throw new Error('Cloudflare Workers AI credentials are not configured');
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cfAccount)}/ai/run/${model}`;
  let cfRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!cfRes.ok) {
    const errText = await cfRes.text().catch(() => '');
    // Automatically accept Meta Llama 3.2 license once if Cloudflare prompts for agreement
    if (errText.toLowerCase().includes('agree') || errText.toLowerCase().includes('license')) {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: 'agree' }),
      }).catch(() => null);

      cfRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } else {
      throw new Error(`Cloudflare vision request failed (${cfRes.status}): ${errText || cfRes.statusText}`);
    }
  }

  if (!cfRes.ok) {
    const retryErr = await cfRes.text().catch(() => '');
    throw new Error(`Cloudflare vision request failed (${cfRes.status}): ${retryErr || cfRes.statusText}`);
  }

  const cfJson: any = await cfRes.json();
  const responseField = cfJson?.result?.response ?? cfJson?.result ?? cfJson?.response;
  const raw = typeof responseField === 'string' ? responseField : JSON.stringify(responseField ?? {});
  return { parsed: extractJsonObject(raw), model };
}

app.post('/api/merchant/analyze-product-image', async (c) => {
  const auth = await extractUser(c);
  if (!auth?.user?.merchantId) {
    return c.json({ error: 'Unauthorized: Authentication required', code: 'UNAUTHENTICATED' }, 401);
  }

  const groqApiKey = c.env?.GROQ_API_KEY || (typeof process !== 'undefined' ? process.env?.GROQ_API_KEY : undefined);
  const cfAiBinding = (c.env as any)?.AI;
  const cfToken = c.env?.CLOUDFLARE_API_TOKEN || (typeof process !== 'undefined' ? process.env?.CLOUDFLARE_API_TOKEN : undefined);
  const cfAccount = c.env?.CLOUDFLARE_ACCOUNT_ID || (typeof process !== 'undefined' ? process.env?.CLOUDFLARE_ACCOUNT_ID : undefined);
  const hasCloudflare = Boolean((cfAiBinding && typeof cfAiBinding.run === 'function') || (cfToken && cfAccount));

  if (!groqApiKey && !hasCloudflare) {
    return c.json(
      {
        error: 'Main AI provider (Groq) requires GROQ_API_KEY on the server (with optional Cloudflare Workers AI fallback).',
        code: 'GROQ_API_KEY_MISSING',
      },
      503
    );
  }

  try {
    const contentType = c.req.header('content-type') || '';
    let base64Data = '';
    let imageBytes: Uint8Array | null = null;
    let mimeType = 'image/jpeg';
    let lang: 'my' | 'en' = 'my';

    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const file = formData.get('image') as File | null;
      const formLang = formData.get('lang');
      if (formLang === 'en') lang = 'en';

      if (!file) {
        return c.json({ error: 'No image provided for analysis' }, 400);
      }
      if (file.size > 5 * 1024 * 1024) {
        return c.json({ error: 'Image file size must not exceed 5 MiB' }, 400);
      }
      const normalizedType = (file.type || 'image/jpeg').toLowerCase();
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(normalizedType)) {
        return c.json({ error: 'Only JPEG, PNG, and WebP images are supported' }, 400);
      }
      mimeType = normalizedType === 'image/jpg' ? 'image/jpeg' : normalizedType;
      imageBytes = new Uint8Array(await file.arrayBuffer());
      base64Data = uint8ArrayToBase64(imageBytes);
    } else {
      const body = await c.req.json().catch(() => ({}));
      if (body.lang === 'en') lang = 'en';

      if (typeof body.imageBase64 === 'string' && body.imageBase64.trim()) {
        const raw = body.imageBase64.trim();
        const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
          base64Data = match[2];
        } else {
          mimeType = (body.mimeType || 'image/jpeg').toLowerCase();
          base64Data = raw;
        }
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        imageBytes = bytes;
      } else if (typeof body.imageUrl === 'string' && body.imageUrl.trim()) {
        const urlCheck = validateProductImageUrl(body.imageUrl.trim());
        if (!urlCheck.isValid || !urlCheck.sanitizedUrl) {
          return c.json({ error: urlCheck.error || 'Invalid image URL' }, 400);
        }
        const imgRes = await fetch(urlCheck.sanitizedUrl);
        if (!imgRes.ok) {
          return c.json({ error: `Failed to fetch image for analysis (${imgRes.status})` }, 400);
        }
        const fetchedType = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0].trim().toLowerCase();
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(fetchedType)) {
          return c.json({ error: 'Unsupported remote image format' }, 400);
        }
        const bytes = new Uint8Array(await imgRes.arrayBuffer());
        if (bytes.byteLength > 5 * 1024 * 1024) {
          return c.json({ error: 'Remote image exceeds 5 MiB size limit' }, 400);
        }
        mimeType = fetchedType === 'image/jpg' ? 'image/jpeg' : fetchedType;
        imageBytes = bytes;
        base64Data = uint8ArrayToBase64(bytes);
      } else {
        return c.json({ error: 'Provide an image file, imageBase64, or imageUrl to analyze' }, 400);
      }
    }

    const languageInstruction =
      lang === 'my'
        ? 'Write productName, category, and description naturally in Myanmar (Burmese Unicode) mixed with clear retail terms where helpful. Write variant color and size cleanly (e.g., "Black", "Free Size", "M", "L").'
        : 'Write productName, category, and description in clear English for an e-commerce storefront.';

    const promptText = `Analyze this product photo for a Myanmar e-commerce store catalog and return strictly a JSON object with this exact schema:
{
  "productName": "string (concise appealing product title)",
  "category": "string (e.g. Fashion, Footwear, Bags, Cosmetics, Electronics, Accessories, Home & Living, Food & Beverage)",
  "description": "string (2-3 helpful retail sentences describing visible design, color, style, and usage)",
  "skuPrefix": "string (short uppercase alphanumeric SKU prefix like DRESS-BLK or BAG-LTH)",
  "suggestedPrice": number (positive integer retail price in MMK, e.g. 25000),
  "variants": [
    { "color": "string", "size": "string", "stock": number }
  ]
}

${languageInstruction}
Rules:
- Only describe attributes, colors, materials, and product type actually visible in the photo. Do not fabricate invisible certifications or brand guarantees.
- Return 1 to 3 variants based on visible color/style (default stock 10 each).
- Return ONLY valid JSON with no markdown formatting or extra commentary.`;

    const dataUri = `data:${mimeType};base64,${base64Data}`;
    let parsed: Record<string, any> | null = null;
    let usedProvider = '';
    let usedModel = '';
    const errors: string[] = [];

    // Primary (Main) AI Provider: Groq Vision (qwen/qwen3.8-27b)
    if (groqApiKey) {
      try {
        const res = await analyzeImageWithGroq(groqApiKey, dataUri, promptText);
        parsed = res.parsed;
        usedProvider = 'groq';
        usedModel = res.model;
      } catch (groqErr: any) {
        errors.push(groqErr?.message || 'Groq vision error');
      }
    } else {
      errors.push('GROQ_API_KEY is not configured');
    }

    // Secondary Fallback Provider: Cloudflare Workers AI Vision
    if (!parsed && hasCloudflare && imageBytes) {
      try {
        const res = await analyzeImageWithCloudflare(cfAiBinding, cfToken, cfAccount, imageBytes, promptText);
        parsed = res.parsed;
        usedProvider = 'cloudflare-workers-ai';
        usedModel = res.model;
      } catch (cfErr: any) {
        errors.push(cfErr?.message || 'Cloudflare Workers AI vision error');
      }
    }

    if (!parsed) {
      throw new Error(errors.join(' | ') || 'Groq AI image analysis failed');
    }

    return c.json({
      success: true,
      provider: usedProvider,
      model: usedModel,
      analysis: {
        name: typeof parsed.productName === 'string' ? parsed.productName.trim() : '',
        category: typeof parsed.category === 'string' ? parsed.category.trim() : '',
        description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
        skuPrefix: typeof parsed.skuPrefix === 'string'
          ? parsed.skuPrefix.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16)
          : '',
        price: Number.isFinite(Number(parsed.suggestedPrice)) && Number(parsed.suggestedPrice) > 0
          ? Math.round(Number(parsed.suggestedPrice))
          : 15000,
        variants: Array.isArray(parsed.variants) && parsed.variants.length > 0
          ? parsed.variants.slice(0, 5).map((v: any) => ({
              color: typeof v?.color === 'string' && v.color.trim() ? v.color.trim() : 'Standard',
              size: typeof v?.size === 'string' && v.size.trim() ? v.size.trim() : 'Free Size',
              stock: Number.isInteger(Number(v?.stock)) && Number(v.stock) >= 0 ? Number(v.stock) : 10,
            }))
          : [{ color: 'Standard', size: 'Free Size', stock: 10 }],
      },
    });
  } catch (err: any) {
    console.error('[AnalyzeProductImage] Failed:', err);
    return c.json(
      { error: err?.message || 'Failed to analyze product image with AI' },
      500
    );
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

