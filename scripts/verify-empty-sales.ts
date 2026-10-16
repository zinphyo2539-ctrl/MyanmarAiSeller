import assert from 'assert';

console.log("=== RUNNING AUTHORITATIVE ZERO-ORDERS & EMPTY-SALES VERIFICATION (DEFAULT WORKSPACE) ===");

const BASE_URL = 'http://localhost:3000';

async function runEmptySalesVerification() {
  const results: any[] = [];

  // Helper fetch function
  async function api(path: string, options: { method?: string; body?: any; token?: string } = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }
    const res = await fetch(`${BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const status = res.status;
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status, data };
  }

  // 1. Normal Application Login Flow (Default Workspace)
  console.log("\n[Step 1] Executing standard normal login flow...");
  const loginRes = await api('/api/auth/dev-login', { method: 'POST' });
  assert.strictEqual(loginRes.status, 200, "Default login must succeed with 200");
  assert.ok(loginRes.data?.token, "Token must be returned");
  const defaultMerchantId = loginRes.data?.user?.merchantId;
  const token = loginRes.data.token;
  console.log(`  -> Default Authenticated Merchant ID: ${defaultMerchantId}`);
  assert.strictEqual(defaultMerchantId, 'merchant_001', "Default workspace merchant must be merchant_001");
  results.push({ test: 'DEFAULT_LOGIN_AUTH', merchantId: defaultMerchantId, passed: true });

  // 2. Authoritative Verification via GET /api/auth/me
  console.log("\n[Step 2] Verifying server session identity via GET /api/auth/me...");
  const meRes = await api('/api/auth/me', { token });
  assert.strictEqual(meRes.status, 200, "GET /api/auth/me must return 200");
  assert.strictEqual(meRes.data?.isAuthenticated, true, "Must be authenticated");
  assert.strictEqual(meRes.data?.user?.merchantId, 'merchant_001', "Session merchantId must be merchant_001");
  console.log(`  -> Verified Server Identity: ${meRes.data.user.name} (${meRes.data.user.email}), Merchant: ${meRes.data.user.merchantId}`);
  results.push({ test: 'VERIFIED_SESSION_IDENTITY', passed: true });

  // 3. Authoritative Orders Query GET /api/orders
  console.log("\n[Step 3] Querying authoritative orders endpoint GET /api/orders...");
  const ordersRes = await api('/api/orders', { token });
  assert.strictEqual(ordersRes.status, 200, "GET /api/orders must return 200");
  assert.ok(Array.isArray(ordersRes.data), "Orders response must be an array");
  const orderCount = ordersRes.data.length;
  console.log(`  -> Actual Orders Count returned: ${orderCount} records`);
  assert.strictEqual(orderCount, 0, "Default workspace merchant_001 must have exactly 0 orders");
  results.push({ test: 'ORDERS_COUNT_ZERO', count: orderCount, passed: true });

  // 4. Authoritative Dashboard Summary Query GET /api/dashboard/summary
  console.log("\n[Step 4] Querying authoritative dashboard summary GET /api/dashboard/summary...");
  const summaryRes = await api('/api/dashboard/summary', { token });
  assert.strictEqual(summaryRes.status, 200, "GET /api/dashboard/summary must return 200");
  const s = summaryRes.data;
  console.log("  -> Dashboard Summary data received:", JSON.stringify(s, null, 2));

  assert.strictEqual(s.todaySalesAmount, 0, "Today's sales must be exactly 0 MMK");
  assert.strictEqual(s.todayConfirmedOrdersCount, 0, "Today's confirmed orders must be exactly 0");
  assert.strictEqual(s.totalOrdersCount, 0, "Total orders must be exactly 0");
  assert.strictEqual(s.ordersByStatus?.confirmed, 0, "Confirmed orders count must be 0");
  assert.strictEqual(s.ordersByStatus?.pending, 0, "Pending orders count must be 0");
  assert.strictEqual(s.ordersByStatus?.cancelled, 0, "Cancelled orders count must be 0");
  assert.strictEqual(s.paymentsToReviewCount, 0, "Payments to review must be 0");
  assert.strictEqual(s.paymentsToReviewAmount, 0, "Payments to review amount must be 0 MMK");
  assert.strictEqual(s.confirmedPaymentsCount, 0, "Confirmed payments count must be 0");
  assert.strictEqual(s.confirmedPaymentsAmount, 0, "Confirmed payments amount must be 0 MMK");
  assert.strictEqual(s.salesComparison, null, "Sales comparison must be null (truthful, no fabrication)");
  assert.strictEqual(s.profit, null, "Profit must be null (truthful, no fabrication)");
  results.push({ test: 'DASHBOARD_METRICS_ZERO', passed: true });

  // 5. Product Catalog Preservation Check
  console.log("\n[Step 5] Checking product catalog preservation for merchant_001...");
  const productsRes = await api('/api/products', { token });
  assert.strictEqual(productsRes.status, 200, "GET /api/products must return 200");
  assert.ok(Array.isArray(productsRes.data), "Products must be an array");
  console.log(`  -> Preserved active products count: ${productsRes.data.length}`);
  assert.strictEqual(productsRes.data.length, 2, "Products must remain intact (prod_1 and prod_2)");
  results.push({ test: 'CATALOG_PRESERVED', count: productsRes.data.length, passed: true });

  // 6. Security Invariant: Unauthenticated Requests Return 401
  console.log("\n[Step 6] Verifying unauthenticated requests return 401 (preventing error masking)...");
  const unauthOrders = await api('/api/orders');
  assert.strictEqual(unauthOrders.status, 401, "Unauthenticated /api/orders must return 401");
  const unauthSummary = await api('/api/dashboard/summary');
  assert.strictEqual(unauthSummary.status, 401, "Unauthenticated /api/dashboard/summary must return 401");
  console.log("  -> Unauthenticated requests correctly rejected with HTTP 401");
  results.push({ test: 'UNAUTH_REJECTION', passed: true });

  console.log("\n=== ALL ZERO-ORDERS VERIFICATION CHECKS PASSED ===");
  console.log(`Total tests: ${results.length}, Passed: ${results.filter(r => r.passed).length}`);
}

runEmptySalesVerification().catch((err) => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});
