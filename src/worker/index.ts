import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { FirestoreRestClient } from '../../server/firestoreClient.ts';
import { checkoutEngine } from '../../server/checkoutEngine.ts';
import { ledgerService } from '../../server/accounting/ledger.ts';
import { aiActionSecurity } from '../../server/aiActions/actionSecurity.ts';
import { auditLogger } from '../../server/audit/auditLogger.ts';

interface Bindings {
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
  FIRESTORE_DATABASE_ID?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Session-Token', 'X-Idempotency-Key'],
  credentials: true,
}));

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    runtime: 'cloudflare-workers',
    framework: 'hono',
    timestamp: new Date().toISOString()
  });
});

// Public store lookup
app.get('/api/public/store/:slug', async (c) => {
  const slug = c.req.param('slug');
  const env = c.env;
  const projectId = env.FIREBASE_PROJECT_ID || 'gen-lang-client-0903319954';
  const client = new FirestoreRestClient({
    projectId,
    databaseId: env.FIRESTORE_DATABASE_ID || 'ai-studio-myanmaraiseller-5ecdcad1-2fa1-4433-8ee7-fae758ed7e19',
    credentials: env.FIREBASE_PRIVATE_KEY ? {
      project_id: projectId,
      client_email: env.FIREBASE_CLIENT_EMAIL || '',
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

// Public marketplace listing
app.get('/api/public/marketplace', async (c) => {
  const env = c.env;
  const projectId = env.FIREBASE_PROJECT_ID || 'gen-lang-client-0903319954';
  const client = new FirestoreRestClient({
    projectId,
    databaseId: env.FIRESTORE_DATABASE_ID || 'ai-studio-myanmaraiseller-5ecdcad1-2fa1-4433-8ee7-fae758ed7e19',
    credentials: env.FIREBASE_PRIVATE_KEY ? {
      project_id: projectId,
      client_email: env.FIREBASE_CLIENT_EMAIL || '',
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

// Atomic checkout order processing
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

// Accounting reversal endpoint
app.post('/api/accounting/entries/:id/reverse', async (c) => {
  const entryId = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  try {
    const reversal = await ledgerService.reverseJournalEntry(
      entryId, 
      body.merchantId || 'merchant_001', 
      body.actorId || 'user_admin', 
      body.reason || 'Staging Worker Reversal'
    );
    return c.json({ success: true, reversal });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// Human-in-the-loop AI actions proposal & execution
app.post('/api/merchant/ai-actions/propose', async (c) => {
  const body = await c.req.json();
  try {
    const proposal = aiActionSecurity.createSignedProposalToken({
      actionType: body.actionType,
      merchantId: body.merchantId,
      proposedByModel: body.proposedByModel || 'groq-llama-3',
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

// Tenant-scoped audit logs
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

// 404 handler for unmatched API routes
app.all('/api/*', (c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

export default {
  fetch: app.fetch,
};
