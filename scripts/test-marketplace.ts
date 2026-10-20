import assert from 'assert';
import fs from 'fs';

async function runMarketplaceTests() {
  console.log('========================================================');
  console.log('MULTI-STORE MARKETPLACE ACCEPTANCE TEST SUITE');
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

  // Backup original db.json before tests to guarantee perfect restoration
  const dbBackup = fs.readFileSync('./data/db.json', 'utf8');

  try {
    // 1. Basic Public Retrieval without Auth
    await test('GET /api/public/marketplace returns 200 with published stores and active products', async () => {
      const res = await fetch(`${BASE_URL}/api/public/marketplace`);
      assert.strictEqual(res.status, 200, 'Marketplace endpoint must return 200 OK');

      const data = await res.json();
      assert.ok(Array.isArray(data.stores), 'stores must be an array');
      assert.ok(data.stores.length > 0, 'Must contain at least 1 published store');
      assert.strictEqual(data.totalStores, data.stores.length);

      const store = data.stores[0];
      assert.ok(store.slug, 'Store must have slug');
      assert.ok(store.storeName, 'Store must have storeName');
      assert.ok(Array.isArray(store.products), 'Store must have products array');
      assert.strictEqual(store.productCount, store.products.length);

      // Verify no sensitive fields are leaked
      assert.strictEqual((store as any).aiConfig, undefined, 'aiConfig must never be exposed');
      assert.strictEqual((store as any).password, undefined, 'password must never be exposed');
      assert.strictEqual((store as any).tokens, undefined, 'tokens must never be exposed');
      assert.strictEqual((store as any).credentials, undefined, 'credentials must never be exposed');
      assert.strictEqual((store as any).paymentInstructions, undefined, 'paymentInstructions must not be exposed in public list');
    });

    // 2. Exclusion of Unpublished Stores
    await test('Unpublished stores (isPublished: false) are strictly excluded from marketplace', async () => {
      const db = JSON.parse(fs.readFileSync('./data/db.json', 'utf8'));
      // Add a temporary unpublished merchant store
      db.merchants['merchant_unpub'] = {
        id: 'merchant_unpub',
        store: {
          slug: 'unpublished-draft-store',
          storeName: 'Draft Secret Store',
          description: 'This store is draft and should not appear',
          isPublished: false
        }
      };
      db.products.push({
        id: 'prod_unpub_1',
        merchantId: 'merchant_unpub',
        name: 'Hidden Draft Product',
        price: 10000,
        status: 'active',
        variants: [{ id: 'v_unpub', color: 'Black', size: 'M', stock: 10 }]
      });
      fs.writeFileSync('./data/db.json', JSON.stringify(db, null, 2), 'utf8');

      try {
        const res = await fetch(`${BASE_URL}/api/public/marketplace`);
        const data = await res.json();
        const found = data.stores.find((s: any) => s.slug === 'unpublished-draft-store');
        assert.strictEqual(found, undefined, 'Unpublished store must NOT be in marketplace');
      } finally {
        // Remove temporary merchant
        delete db.merchants['merchant_unpub'];
        db.products = db.products.filter((p: any) => p.merchantId !== 'merchant_unpub');
        fs.writeFileSync('./data/db.json', JSON.stringify(db, null, 2), 'utf8');
      }
    });

    // 3. Exclusion of Inactive / Unpublished Products
    await test('Inactive products (status !== active) are strictly excluded from store previews', async () => {
      const db = JSON.parse(fs.readFileSync('./data/db.json', 'utf8'));
      db.products.push({
        id: 'prod_inactive_temp',
        merchantId: 'merchant_001',
        name: 'Archived Legacy Product',
        price: 50000,
        status: 'archived',
        variants: [{ id: 'v_inact', color: 'Gray', size: 'L', stock: 5 }]
      });
      fs.writeFileSync('./data/db.json', JSON.stringify(db, null, 2), 'utf8');

      try {
        const res = await fetch(`${BASE_URL}/api/public/marketplace`);
        const data = await res.json();
        const store = data.stores.find((s: any) => s.slug === 'yangon-style');
        assert.ok(store, 'Must find yangon-style store');
        const foundInactive = store.products.find((p: any) => p.id === 'prod_inactive_temp');
        assert.strictEqual(foundInactive, undefined, 'Archived product must NOT be returned in marketplace');
      } finally {
        db.products = db.products.filter((p: any) => p.id !== 'prod_inactive_temp');
        fs.writeFileSync('./data/db.json', JSON.stringify(db, null, 2), 'utf8');
      }
    });

    // 4. Search Filtering by Store Name and Product Name
    await test('GET /api/public/marketplace?q=yangon filters by store name', async () => {
      const res = await fetch(`${BASE_URL}/api/public/marketplace?q=yangon`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.stores.length > 0, 'Must match yangon-style store');
      assert.strictEqual(data.stores[0].slug, 'yangon-style');
    });

    await test('GET /api/public/marketplace?q=non_existent_query_xyz returns empty stores list', async () => {
      const res = await fetch(`${BASE_URL}/api/public/marketplace?q=non_existent_query_xyz`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.stores.length, 0, 'No stores should match non-existent query');
      assert.strictEqual(data.totalStores, 0);
      assert.strictEqual(data.totalProducts, 0);
    });

    await test('GET /api/public/marketplace?q=cotton filters to matching products', async () => {
      const res = await fetch(`${BASE_URL}/api/public/marketplace?q=cotton`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.stores.length > 0, 'Must return store with cotton product');
      const store = data.stores[0];
      assert.ok(store.products.every((p: any) => p.name.toLowerCase().includes('cotton') || (p.description || '').toLowerCase().includes('cotton')));
    });

    // 5. Multi-Store Coexistence and Isolation
    await test('Multiple published stores coexist independently without cross-contamination', async () => {
      const db = JSON.parse(fs.readFileSync('./data/db.json', 'utf8'));
      db.merchants['merchant_002'] = {
        id: 'merchant_002',
        store: {
          slug: 'mandalay-crafts',
          storeName: 'Mandalay Heritage Crafts',
          description: 'Authentic handmade traditional Burmese wood & tapestry crafts.',
          deliveryInfo: 'Mandalay same day delivery. All Myanmar postal delivery.',
          isPublished: true
        }
      };
      db.products.push({
        id: 'prod_mandalay_1',
        merchantId: 'merchant_002',
        name: 'Hand-carved Teak Elephant',
        price: 45000,
        currency: 'MMK',
        status: 'active',
        variants: [{ id: 'v_m1', color: 'Natural Wood', size: 'Medium', stock: 10 }]
      });
      fs.writeFileSync('./data/db.json', JSON.stringify(db, null, 2), 'utf8');

      try {
        const res = await fetch(`${BASE_URL}/api/public/marketplace`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.stores.length, 2, 'Both published stores must appear in marketplace');

        const s1 = data.stores.find((s: any) => s.slug === 'yangon-style');
        const s2 = data.stores.find((s: any) => s.slug === 'mandalay-crafts');
        assert.ok(s1, 'Must find store 1');
        assert.ok(s2, 'Must find store 2');

        // Isolation: Store 1 must not contain Store 2 products
        assert.ok(!s1.products.some((p: any) => p.id === 'prod_mandalay_1'), 'Store 1 must NOT contain Store 2 products');
        assert.ok(!s2.products.some((p: any) => p.id === 'prod_1'), 'Store 2 must NOT contain Store 1 products');

        // Direct store links for each store must work independently
        const r1 = await fetch(`${BASE_URL}/api/public/store/yangon-style`);
        assert.strictEqual(r1.status, 200);
        const r2 = await fetch(`${BASE_URL}/api/public/store/mandalay-crafts`);
        assert.strictEqual(r2.status, 200);
      } finally {
        delete db.merchants['merchant_002'];
        db.products = db.products.filter((p: any) => p.merchantId !== 'merchant_002');
        fs.writeFileSync('./data/db.json', JSON.stringify(db, null, 2), 'utf8');
      }
    });

    // 6. Direct Purchase Flow via Individual Store Endpoint
    await test('Direct store checkout via /api/public/store/:slug/orders functions as expected', async () => {
      const orderPayload = {
        customerName: 'Daw Khin Khin',
        customerPhone: '09450001122',
        shippingAddress: 'No. 12, Strand Road, Yangon',
        paymentMethod: 'KBZPay',
        items: [
          {
            productId: 'prod_1',
            variantId: 'v1',
            qty: 1
          }
        ]
      };

      const res = await fetch(`${BASE_URL}/api/public/store/yangon-style/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      assert.strictEqual(res.status, 201, 'Order must be created with 201');
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.order.paymentStatus, 'PENDING', 'Payment status must remain PENDING until merchant verification');
      assert.strictEqual(data.order.customerName, 'Daw Khin Khin');
    });

  } finally {
    // Restore db.json backup to leave system completely clean
    fs.writeFileSync('./data/db.json', dbBackup, 'utf8');
    console.log('\n  [CLEANUP] db.json restored to pristine state.');
  }

  console.log(`\n========================================================`);
  console.log(`ALL MARKETPLACE TESTS PASSED: ${passed}/${total}`);
  console.log(`========================================================\n`);
}

runMarketplaceTests().catch((err) => {
  console.error('Marketplace test suite failed:', err);
  process.exit(1);
});
