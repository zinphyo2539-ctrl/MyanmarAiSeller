import assert from 'assert';
import fs from 'fs';

async function runPhase2StorefrontTests() {
  console.log('========================================================');
  console.log('PHASE 2 CUSTOMER STOREFRONT ACCEPTANCE TEST SUITE');
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
    // 1. Public Storefront Data Retrieval
    await test('GET /api/public/store/:slug returns 200 with store details and active products without auth', async () => {
      const res = await fetch(`${BASE_URL}/api/public/store/yangon-style`);
      assert.strictEqual(res.status, 200, 'Public storefront endpoint must return 200 OK');

      const data = await res.json();
      assert.ok(data.store, 'Response must contain store object');
      assert.strictEqual(data.store.slug, 'yangon-style');
      assert.strictEqual(data.store.isPublished, true);
      assert.ok(data.store.storeName, 'Store must have a name');

      assert.ok(Array.isArray(data.products), 'Products must be an array');
      assert.ok(data.products.length > 0, 'Must contain active products');

      // Verify that all returned products have status === 'active'
      for (const prod of data.products) {
        assert.strictEqual(prod.status, 'active', 'Only active products must be returned in public catalog');
        assert.ok(Array.isArray(prod.variants), 'Product must have variants');
      }
    });

    await test('GET /api/public/store/:slug with invalid slug returns 404 Not Found', async () => {
      const res = await fetch(`${BASE_URL}/api/public/store/non-existent-store-slug-9999`);
      assert.strictEqual(res.status, 404, 'Non-existent store slug must return 404');
      const data = await res.json();
      assert.ok(data.error?.includes('not found') || data.error?.includes('unpublished'));
    });

    await test('GET /api/public/store/:slug when store is unpublished returns 404', async () => {
      // Temporarily mark store as unpublished
      const db = JSON.parse(fs.readFileSync('./data/db.json', 'utf8'));
      const originalPublished = db.merchants.merchant_001.store.isPublished;
      db.merchants.merchant_001.store.isPublished = false;
      fs.writeFileSync('./data/db.json', JSON.stringify(db, null, 2), 'utf8');

      try {
        const res = await fetch(`${BASE_URL}/api/public/store/yangon-style`);
        assert.strictEqual(res.status, 404, 'Unpublished store must return 404');
      } finally {
        // Restore
        db.merchants.merchant_001.store.isPublished = originalPublished;
        fs.writeFileSync('./data/db.json', JSON.stringify(db, null, 2), 'utf8');
      }
    });

    // 2. Public Order Placement & Stock Decrement
    let createdOrderId: string | null = null;
    let targetVariantId: string | null = null;
    let initialStock = 0;

    await test('POST /api/public/store/:slug/orders successfully places order, decrements stock authoritatively', async () => {
      // Find an active product with stock
      const storeRes = await fetch(`${BASE_URL}/api/public/store/yangon-style`);
      const storeData = await storeRes.json();
      const product = storeData.products.find((p: any) => p.variants && p.variants.some((v: any) => v.stock >= 2));
      assert.ok(product, 'Must find a product with at least 2 units in stock');

      const variant = product.variants.find((v: any) => v.stock >= 2);
      targetVariantId = variant.id;
      initialStock = variant.stock;

      const orderQty = 1;
      const orderPayload = {
        customerName: 'Ma Hnin Nu',
        customerPhone: '09798765432',
        shippingAddress: 'No. 45, Bogyoke Road, Pabedan Township, Yangon',
        paymentMethod: 'KBZPay',
        items: [
          {
            productId: product.id,
            variantId: variant.id,
            qty: orderQty
          }
        ]
      };

      const orderRes = await fetch(`${BASE_URL}/api/public/store/yangon-style/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      assert.strictEqual(orderRes.status, 201, 'Order creation must return 201 Created');
      const orderData = await orderRes.json();
      assert.strictEqual(orderData.success, true);
      assert.ok(orderData.order, 'Order data must be returned');
      assert.ok(orderData.order.id.startsWith('ord_'), 'Order ID must follow ord_ convention');
      assert.strictEqual(orderData.order.customerName, 'Ma Hnin Nu');
      assert.strictEqual(orderData.order.customerPhone, '09798765432');
      assert.strictEqual(orderData.order.paymentStatus, 'PENDING');
      assert.strictEqual(orderData.order.totalAmount, product.price * orderQty);
      createdOrderId = orderData.order.id;

      // Verify stock was authoritatively decremented in db.json
      const dbNow = JSON.parse(fs.readFileSync('./data/db.json', 'utf8'));
      const dbProduct = dbNow.products.find((p: any) => p.id === product.id);
      const dbVariant = dbProduct.variants.find((v: any) => v.id === variant.id);
      assert.strictEqual(dbVariant.stock, initialStock - orderQty, 'Stock must decrement in database');
    });

    // 3. Validation and Error Cases
    await test('POST /api/public/store/:slug/orders rejects empty cart or missing items', async () => {
      const res = await fetch(`${BASE_URL}/api/public/store/yangon-style/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Ko Kyaw',
          customerPhone: '09123456789',
          shippingAddress: 'Yangon',
          paymentMethod: 'KBZPay',
          items: []
        })
      });

      assert.strictEqual(res.status, 400, 'Empty cart must return 400');
      const data = await res.json();
      assert.ok(data.error?.includes('empty cart') || data.error?.includes('Invalid'));
    });

    await test('POST /api/public/store/:slug/orders rejects missing customer details', async () => {
      const res = await fetch(`${BASE_URL}/api/public/store/yangon-style/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: '',
          customerPhone: '09123456789',
          shippingAddress: 'Yangon',
          paymentMethod: 'KBZPay',
          items: [{ productId: 'prod_1', variantId: 'var_1', qty: 1 }]
        })
      });

      assert.strictEqual(res.status, 400, 'Missing customerName must return 400');
    });

    await test('POST /api/public/store/:slug/orders rejects non-existent variantId', async () => {
      const res = await fetch(`${BASE_URL}/api/public/store/yangon-style/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Ko Kyaw',
          customerPhone: '09123456789',
          shippingAddress: 'Yangon',
          paymentMethod: 'KBZPay',
          items: [{ productId: 'prod_1', variantId: 'non_existent_var_999', qty: 1 }]
        })
      });

      assert.strictEqual(res.status, 400, 'Invalid variantId must return 400');
      const data = await res.json();
      assert.ok(data.error?.includes('variant not found'));
    });

    await test('POST /api/public/store/:slug/orders rejects order exceeding available stock', async () => {
      const res = await fetch(`${BASE_URL}/api/public/store/yangon-style/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Ko Kyaw',
          customerPhone: '09123456789',
          shippingAddress: 'Yangon',
          paymentMethod: 'KBZPay',
          items: [{ productId: 'prod_1', variantId: 'v1', qty: 99999 }]
        })
      });

      assert.strictEqual(res.status, 400, 'Over-stock order must return 400');
      const data = await res.json();
      assert.ok(data.error?.includes('Insufficient stock'));
    });

    await test('POST /api/public/store/:slug/orders for invalid store returns 404', async () => {
      const res = await fetch(`${BASE_URL}/api/public/store/invalid-store-999/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Ko Kyaw',
          customerPhone: '09123456789',
          shippingAddress: 'Yangon',
          paymentMethod: 'KBZPay',
          items: [{ productId: 'prod_1', variantId: 'v1', qty: 1 }]
        })
      });

      assert.strictEqual(res.status, 404, 'Invalid store must return 404');
    });

  } finally {
    // Restore db.json backup to leave system completely clean
    fs.writeFileSync('./data/db.json', dbBackup, 'utf8');
    console.log('\n  [CLEANUP] db.json restored to pristine state.');
  }

  console.log(`\n========================================================`);
  console.log(`ALL PHASE 2 STOREFRONT TESTS PASSED: ${passed}/${total}`);
  console.log(`========================================================\n`);
}

runPhase2StorefrontTests().catch((err) => {
  console.error('Phase 2 test failed:', err);
  process.exit(1);
});
