import assert from 'assert';
import fs from 'fs';

async function runAetherIntegrationTests() {
  console.log('========================================================');
  console.log('AETHER VIRTUAL MARKET PUBLIC API INTEGRATION TEST SUITE');
  console.log('========================================================\n');

  const BASE_URL = 'http://localhost:3000';
  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}`);
      console.error(`    Error: ${err.message}`);
      throw err;
    }
  }

  const dbBackup = fs.readFileSync('./data/db.json', 'utf8');

  try {
    // 1. CORS Headers and OPTIONS Preflight
    await test('CORS headers are correctly set on public GET /api/public/marketplace', async () => {
      const res = await fetch(`${BASE_URL}/api/public/marketplace`);
      assert.strictEqual(res.status, 200);
      const allowOrigin = res.headers.get('access-control-allow-origin');
      assert.ok(allowOrigin, 'Access-Control-Allow-Origin header must be present');
    });

    await test('CORS OPTIONS preflight request to /api/public/marketplace returns 204 No Content', async () => {
      const res = await fetch(`${BASE_URL}/api/public/marketplace`, { method: 'OPTIONS' });
      assert.strictEqual(res.status, 204);
      assert.ok(res.headers.get('access-control-allow-methods')?.includes('GET'));
    });

    // 2. Summary Mode vs Default Mode for Marketplace
    await test('GET /api/public/marketplace default returns products array', async () => {
      const res = await fetch(`${BASE_URL}/api/public/marketplace`);
      const data = await res.json();
      assert.ok(data.stores.length > 0);
      assert.ok(Array.isArray(data.stores[0].products));
      assert.ok(data.stores[0].products.length > 0);
    });

    await test('GET /api/public/marketplace?summary=true returns empty products array for performance', async () => {
      const res = await fetch(`${BASE_URL}/api/public/marketplace?summary=true`);
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.ok(data.stores.length > 0);
      assert.strictEqual(data.stores[0].products.length, 0, 'Summary mode must return empty products array');
      assert.ok(typeof data.stores[0].productCount === 'number');
    });

    // 3. Merchant Catalog API GET /api/public/store/:slug
    await test('GET /api/public/store/yangon-style returns store and active products', async () => {
      const res = await fetch(`${BASE_URL}/api/public/store/yangon-style`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.store.slug, 'yangon-style');
      assert.ok(Array.isArray(data.products));
      for (const p of data.products) {
        assert.ok(p.id);
        assert.ok(p.name);
        assert.ok(typeof p.price === 'number');
        assert.ok(Array.isArray(p.variants));
      }
    });

    // 4. Invalid Store Slug
    await test('GET /api/public/store/non-existent-store-xyz returns 404', async () => {
      const res = await fetch(`${BASE_URL}/api/public/store/non-existent-store-xyz`);
      assert.strictEqual(res.status, 404);
    });

    // 5. Data Privacy & Leakage Prevention
    await test('Public endpoints do not leak private merchant config, tokens, or credentials', async () => {
      const res = await fetch(`${BASE_URL}/api/public/marketplace`);
      const data = await res.json();
      for (const s of data.stores) {
        assert.strictEqual((s as any).aiConfig, undefined);
        assert.strictEqual((s as any).tokens, undefined);
        assert.strictEqual((s as any).password, undefined);
      }
    });

    console.log(`\n========================================================`);
    console.log(`RESULTS: ${passed}/${total} AETHER INTEGRATION TESTS PASSED`);
    console.log(`========================================================\n`);
  } finally {
    fs.writeFileSync('./data/db.json', dbBackup, 'utf8');
  }
}

runAetherIntegrationTests().catch((err) => {
  console.error('Aether integration test suite failed:', err);
  process.exit(1);
});
