import workerApp from '../src/worker/index.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runWorkerTests() {
  console.log('--- STARTING COMPREHENSIVE HONO CLOUDFLARE WORKER TESTS ---');

  // Test 1: Health check
  const healthReq = new Request('http://localhost/api/health', { method: 'GET' });
  const healthRes = await workerApp.fetch(healthReq, {}, {} as any);
  assert(healthRes.status === 200, 'Health endpoint returns HTTP 200');
  const healthData: any = await healthRes.json();
  assert(healthData.status === 'healthy', 'Health status is healthy');
  assert(healthData.runtime === 'cloudflare-workers', 'Runtime identifies as cloudflare-workers');
  assert(healthData.framework === 'hono', 'Framework identifies as hono');

  // Test 2: Auth config status
  const configReq = new Request('http://localhost/api/auth/config-status', { method: 'GET' });
  const configRes = await workerApp.fetch(configReq, {}, {} as any);
  assert(configRes.status === 200, 'Config status endpoint returns HTTP 200');
  const configData: any = await configRes.json();
  assert(configData.google === true, 'Google provider is reported as configured');
  assert(typeof configData.googleCallbackUrl === 'string', 'Google callback URL is provided');

  // Test 3: Auth google url
  const urlReq = new Request('http://localhost/api/auth/google/url', { method: 'GET' });
  const urlRes = await workerApp.fetch(urlReq, {}, {} as any);
  assert(urlRes.status === 200, 'Google auth URL endpoint returns HTTP 200');
  const urlData: any = await urlRes.json();
  assert(urlData.url.startsWith('https://accounts.google.com/o/oauth2/v2/auth'), 'Returns valid Google OAuth consent URL');

  // Test 4: Auth me (unauthenticated check)
  const meUnauthReq = new Request('http://localhost/api/auth/me', { method: 'GET' });
  const meUnauthRes = await workerApp.fetch(meUnauthReq, {}, {} as any);
  assert(meUnauthRes.status === 200, 'Unauthenticated /api/auth/me returns HTTP 200 JSON');
  const meUnauthData: any = await meUnauthRes.json();
  assert(meUnauthData.isAuthenticated === false, 'isAuthenticated is false when no token provided');

  // Test 5: Dev login & Authenticated check
  const devLoginReq = new Request('http://localhost/api/auth/dev-login', { method: 'POST' });
  const devLoginRes = await workerApp.fetch(devLoginReq, {}, {} as any);
  assert(devLoginRes.status === 200, 'Dev login returns HTTP 200');
  const devLoginData: any = await devLoginRes.json();
  assert(devLoginData.success === true && !!devLoginData.token, 'Dev login returns token');

  const meAuthReq = new Request('http://localhost/api/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${devLoginData.token}` }
  });
  const meAuthRes = await workerApp.fetch(meAuthReq, {}, {} as any);
  assert(meAuthRes.status === 200, 'Authenticated /api/auth/me returns HTTP 200');
  const meAuthData: any = await meAuthRes.json();
  assert(meAuthData.isAuthenticated === true, 'isAuthenticated is true with valid session token');
  assert(meAuthData.user?.merchantId === 'merchant_001', 'User has merchantId attached');

  // Test 6: Dashboard summary
  const summaryReq = new Request('http://localhost/api/dashboard/summary', { method: 'GET' });
  const summaryRes = await workerApp.fetch(summaryReq, {}, {} as any);
  assert(summaryRes.status === 200, 'Dashboard summary returns HTTP 200');
  const summaryData: any = await summaryRes.json();
  assert(typeof summaryData.totalStockUnits === 'number', 'Summary returns numerical stock units');

  // Test 7: Store profile
  const storeReq = new Request('http://localhost/api/merchant/store', { method: 'GET' });
  const storeRes = await workerApp.fetch(storeReq, {}, {} as any);
  assert(storeRes.status === 200, 'Merchant store profile returns HTTP 200');
  const storeData: any = await storeRes.json();
  assert(!!storeData.slug, 'Store has slug configured');

  // Test 8: Marketplace public endpoint
  const marketplaceReq = new Request('http://localhost/api/public/marketplace', { method: 'GET' });
  const marketplaceRes = await workerApp.fetch(marketplaceReq, {}, {} as any);
  assert(marketplaceRes.status === 200, 'Marketplace endpoint returns HTTP 200');
  const marketplaceData: any = await marketplaceRes.json();
  assert(Array.isArray(marketplaceData.products), 'Marketplace returns products array');

  // Test 9: Audit logs missing merchantId
  const auditReq = new Request('http://localhost/api/audit-logs', { method: 'GET' });
  const auditRes = await workerApp.fetch(auditReq, {}, {} as any);
  assert(auditRes.status === 400, 'Audit logs without merchantId returns HTTP 400');

  // Test 10: Unmatched route 404 JSON (NOT HTML)
  const notFoundReq = new Request('http://localhost/api/nonexistent', { method: 'GET' });
  const notFoundRes = await workerApp.fetch(notFoundReq, {}, {} as any);
  assert(notFoundRes.status === 404, 'Unmatched API route returns HTTP 404');
  const notFoundData: any = await notFoundRes.json();
  assert(notFoundData.error === 'Not Found', 'Returns JSON error instead of HTML fallback');

  console.log('--- HONO WORKER RUNTIME TESTS COMPLETED: ALL 10 TESTS PASSED ---');
}

runWorkerTests().catch((err) => {
  console.error('Worker test failed:', err);
  process.exit(1);
});
