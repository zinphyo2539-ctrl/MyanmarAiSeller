import workerApp from '../src/worker/index.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runWorkerTests() {
  console.log('--- STARTING HONO CLOUDFLARE WORKER RUNTIME TESTS ---');

  // Test 1: Health check
  const healthReq = new Request('http://localhost/api/health', { method: 'GET' });
  const healthRes = await workerApp.fetch(healthReq, {}, {} as any);
  assert(healthRes.status === 200, 'Health endpoint returns HTTP 200');
  const healthData: any = await healthRes.json();
  assert(healthData.status === 'healthy', 'Health status is healthy');
  assert(healthData.runtime === 'cloudflare-workers', 'Runtime identifies as cloudflare-workers');
  assert(healthData.framework === 'hono', 'Framework identifies as hono');

  // Test 2: Marketplace public endpoint
  const marketplaceReq = new Request('http://localhost/api/public/marketplace', { method: 'GET' });
  const marketplaceRes = await workerApp.fetch(marketplaceReq, {}, {} as any);
  assert(marketplaceRes.status === 200, 'Marketplace endpoint returns HTTP 200');
  const marketplaceData: any = await marketplaceRes.json();
  assert(Array.isArray(marketplaceData.products), 'Marketplace returns products array');

  // Test 3: Audit logs missing merchantId
  const auditReq = new Request('http://localhost/api/audit-logs', { method: 'GET' });
  const auditRes = await workerApp.fetch(auditReq, {}, {} as any);
  assert(auditRes.status === 400, 'Audit logs without merchantId returns HTTP 400');

  // Test 4: Unmatched route 404
  const notFoundReq = new Request('http://localhost/api/nonexistent', { method: 'GET' });
  const notFoundRes = await workerApp.fetch(notFoundReq, {}, {} as any);
  assert(notFoundRes.status === 404, 'Unmatched API route returns HTTP 404');

  console.log('--- HONO WORKER RUNTIME TESTS COMPLETED: ALL PASSED ---');
}

runWorkerTests().catch((err) => {
  console.error('Worker test failed:', err);
  process.exit(1);
});
