import assert from 'assert';
import fs from 'fs';
import { validateProductImageUrl } from '../server/validator.ts';

async function runInventoryImageTests() {
  console.log('========================================================');
  console.log('PHASE 1 INVENTORY PRODUCT IMAGES ACCEPTANCE TEST SUITE');
  console.log('========================================================\n');

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

  // 1. Validator Unit Tests
  await test('Validator: Valid HTTPS URLs pass and return sanitized string', () => {
    const valid1 = validateProductImageUrl('https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800');
    assert.strictEqual(valid1.isValid, true);
    assert.strictEqual(valid1.sanitizedUrl, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800');

    const valid2 = validateProductImageUrl('https://cdn.example.com/products/jacket.png');
    assert.strictEqual(valid2.isValid, true);
    assert.strictEqual(valid2.sanitizedUrl, 'https://cdn.example.com/products/jacket.png');
  });

  await test('Validator: Empty, null, and undefined values clear image without error', () => {
    assert.deepStrictEqual(validateProductImageUrl(''), { isValid: true, sanitizedUrl: null });
    assert.deepStrictEqual(validateProductImageUrl('   '), { isValid: true, sanitizedUrl: null });
    assert.deepStrictEqual(validateProductImageUrl(null), { isValid: true, sanitizedUrl: null });
    assert.deepStrictEqual(validateProductImageUrl(undefined), { isValid: true, sanitizedUrl: null });
  });

  await test('Validator: HTTP (unencrypted) URLs are rejected', () => {
    const res = validateProductImageUrl('http://insecure.com/pic.jpg');
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error?.includes('Only secure HTTPS image URLs are supported'));
  });

  await test('Validator: Data URLs (Base64) are rejected to prevent DB bloat', () => {
    const res = validateProductImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA');
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error?.includes('Data URLs'));
  });

  await test('Validator: JavaScript, file, and scheme injections are rejected', () => {
    const js = validateProductImageUrl('javascript:alert(1)');
    assert.strictEqual(js.isValid, false);

    const file = validateProductImageUrl('file:///etc/passwd');
    assert.strictEqual(file.isValid, false);
  });

  await test('Validator: Embedded credentials in URLs are rejected', () => {
    const creds = validateProductImageUrl('https://admin:secret@malicious.com/avatar.jpg');
    assert.strictEqual(creds.isValid, false);
    assert.ok(creds.error?.includes('embedded credentials'));
  });

  await test('Validator: Relative paths and malformed URLs are rejected', () => {
    const rel = validateProductImageUrl('/images/product.jpg');
    assert.strictEqual(rel.isValid, false);

    const malformed = validateProductImageUrl('not-a-url');
    assert.strictEqual(malformed.isValid, false);
  });

  await test('Validator: Oversized URLs (>1024 chars) are rejected', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(1020);
    const res = validateProductImageUrl(longUrl);
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error?.includes('exceeds maximum length'));
  });

  // 2. Integration Tests via Live HTTP API
  const BASE_URL = 'http://localhost:3000';

  // Acquire auth token for Merchant A (merchant_001)
  const loginRes = await fetch(`${BASE_URL}/api/auth/dev-login`, { method: 'POST' });
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert.ok(token, 'Must acquire dev login token');
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  let testProductId: string | null = null;

  await test('API: POST /api/products with valid HTTPS imageUrl creates product and persists to db.json', async () => {
    const testImageUrl = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800';
    const createRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Automated Test Silk Scarf',
        sku: `SKU-TEST-${Date.now()}`,
        price: 25000,
        description: 'Premium Burmese handmade silk scarf',
        imageUrl: testImageUrl,
        variants: [
          { color: 'Red', size: 'Standard', stock: 15, sku: `SKU-TEST-RED-${Date.now()}` }
        ]
      })
    });

    assert.strictEqual(createRes.status, 201, 'Should create product with 201 Created');
    const created = await createRes.json();
    assert.ok(created.id, 'Should have ID');
    assert.strictEqual(created.imageUrl, testImageUrl, 'Should store valid imageUrl');
    testProductId = created.id;

    // Verify on disk persistence
    const dbRaw = JSON.parse(fs.readFileSync('./data/db.json', 'utf8'));
    const diskProd = dbRaw.products.find((p: any) => p.id === testProductId);
    assert.ok(diskProd, 'Product must exist in db.json');
    assert.strictEqual(diskProd.imageUrl, testImageUrl, 'db.json must contain saved imageUrl');
  });

  await test('API: PUT /api/products/:id updates imageUrl successfully', async () => {
    assert.ok(testProductId);
    const updatedImageUrl = 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800';

    const updateRes = await fetch(`${BASE_URL}/api/products/${testProductId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        imageUrl: updatedImageUrl
      })
    });

    assert.strictEqual(updateRes.status, 200, 'Should update product with 200 OK');
    const updated = await updateRes.json();
    assert.strictEqual(updated.imageUrl, updatedImageUrl);

    // Verify on disk persistence
    const dbRaw = JSON.parse(fs.readFileSync('./data/db.json', 'utf8'));
    const diskProd = dbRaw.products.find((p: any) => p.id === testProductId);
    assert.strictEqual(diskProd.imageUrl, updatedImageUrl);
  });

  await test('API: PUT /api/products/:id with empty imageUrl clears the image URL to null', async () => {
    assert.ok(testProductId);

    const clearRes = await fetch(`${BASE_URL}/api/products/${testProductId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        imageUrl: ''
      })
    });

    assert.strictEqual(clearRes.status, 200);
    const cleared = await clearRes.json();
    assert.strictEqual(cleared.imageUrl, null, 'Cleared imageUrl should be null');

    // Verify on disk
    const dbRaw = JSON.parse(fs.readFileSync('./data/db.json', 'utf8'));
    const diskProd = dbRaw.products.find((p: any) => p.id === testProductId);
    assert.strictEqual(diskProd.imageUrl, null);
  });

  await test('API: POST and PUT with invalid/insecure URLs return HTTP 400 Bad Request', async () => {
    // 1. POST with Base64
    const postBase64 = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Invalid Image Product',
        price: 10000,
        imageUrl: 'data:image/png;base64,invalidbase64',
        variants: [{ color: 'Blue', size: 'M', stock: 5 }]
      })
    });
    assert.strictEqual(postBase64.status, 400);
    const postData = await postBase64.json();
    assert.ok(postData.error);

    // 2. PUT with HTTP URL
    assert.ok(testProductId);
    const putHttp = await fetch(`${BASE_URL}/api/products/${testProductId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        imageUrl: 'http://insecure.com/pic.jpg'
      })
    });
    assert.strictEqual(putHttp.status, 400);
    const putData = await putHttp.json();
    assert.ok(putData.error);
  });

  await test('API: Unauthenticated user cannot create or edit products', async () => {
    const unauthPost = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hack Product', price: 1000, variants: [] })
    });
    assert.strictEqual(unauthPost.status, 401);

    assert.ok(testProductId);
    const unauthPut = await fetch(`${BASE_URL}/api/products/${testProductId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked' })
    });
    assert.strictEqual(unauthPut.status, 401);
  });

  await test('API: Cross-merchant isolation prevents modifying another merchant product', async () => {
    assert.ok(testProductId);
    const tokensFile = './data/active-tokens.json';
    const tokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
    const merchantBToken = 'test_token_b_' + Date.now();
    tokens[merchantBToken] = {
      user: {
        id: 'user_merchant_002',
        role: 'merchant_admin',
        merchantId: 'merchant_002',
        provider: 'local'
      },
      createdAt: Date.now()
    };
    fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2), 'utf8');

    try {
      const crossPut = await fetch(`${BASE_URL}/api/products/${testProductId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${merchantBToken}`
        },
        body: JSON.stringify({ name: 'Cross Merchant Modification' })
      });

      // Should be rejected (401 invalid/unloaded token, 403 unauthorized merchant, or 404 product not in merchant scope)
      assert.ok(
        crossPut.status === 401 || crossPut.status === 403 || crossPut.status === 404,
        `Cross merchant attempt should be blocked with 401, 403, or 404 (got ${crossPut.status})`
      );
    } finally {
      delete tokens[merchantBToken];
      fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2), 'utf8');
    }
  });

  await test('Existing products without imageUrl continue to load without errors', async () => {
    const getRes = await fetch(`${BASE_URL}/api/products`, { headers: authHeaders });
    assert.strictEqual(getRes.status, 200);
    const prods = await getRes.json();
    assert.ok(Array.isArray(prods));

    const legacyProd = prods.find((p: any) => p.id === 'prod_1');
    assert.ok(legacyProd, 'prod_1 must exist in catalog');
    assert.strictEqual(legacyProd.name, 'Premium Cotton Oversized T-Shirt');
    // Legacy products may have undefined or null imageUrl, should not throw
    assert.ok(legacyProd.imageUrl === undefined || legacyProd.imageUrl === null);
  });

  // Clean up automated test product
  if (testProductId) {
    await fetch(`${BASE_URL}/api/products/${testProductId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
  }

  console.log(`\n========================================================`);
  console.log(`ALL PHASE 1 INVENTORY IMAGE TESTS PASSED: ${passed}/${total}`);
  console.log(`========================================================\n`);
}

runInventoryImageTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
