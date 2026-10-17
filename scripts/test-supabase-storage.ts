import assert from 'assert';
import fs from 'fs';
import {
  validateSupabaseConfig,
  initSupabaseStorageAdapter,
  getSupabaseStorageStatus,
  validateImageBuffer,
  resetSupabaseStorageForTesting
} from '../server/supabaseStorage.ts';

async function runSupabaseStorageTests() {
  console.log('========================================================');
  console.log('PHASE 3 SUPABASE STORAGE & UPLOAD ACCEPTANCE TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void> | void, skipCondition?: boolean, skipReason?: string) {
    total++;
    if (skipCondition) {
      console.log(`  ⚠ [SKIP] ${name} — (${skipReason || 'Condition met'})`);
      skipped++;
      return;
    }
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
      throw err;
    }
  }

  // Save original env
  const origUrl = process.env.SUPABASE_URL;
  const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origBucket = process.env.SUPABASE_BUCKET_PRODUCT_IMAGES;

  try {
    // 1. Configuration Validation Unit Tests
    await test('Config: Missing Supabase URL & Key reports invalid configuration safely', async () => {
      process.env.SUPABASE_URL = '';
      process.env.SUPABASE_SERVICE_ROLE_KEY = '';
      process.env.SUPABASE_BUCKET_PRODUCT_IMAGES = 'product-images';

      await resetSupabaseStorageForTesting();
      const config = validateSupabaseConfig();
      assert.strictEqual(config.isValid, false);
      assert.ok(config.missing.includes('SUPABASE_URL'));
      assert.ok(config.missing.includes('SUPABASE_SERVICE_ROLE_KEY'));

      const status = initSupabaseStorageAdapter();
      assert.strictEqual(status.available, false);
      assert.strictEqual(status.status, 'unconfigured');
      assert.ok(status.reason?.includes('Missing required Supabase environment variables'));
      // Ensure no secret leakage in reason
      assert.strictEqual(status.reason?.includes('undefined'), false);
    });

    // 2. File Buffer & Signature Validation Unit Tests
    await test('Validator: Valid JPEG buffer and JPEG MIME type passes', () => {
      // JPEG magic bytes: FF D8 FF
      const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const res = validateImageBuffer(jpegBuf, 'image/jpeg');
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.detectedExtension, 'jpg');
    });

    await test('Validator: Valid PNG buffer and PNG MIME type passes', () => {
      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      const res = validateImageBuffer(pngBuf, 'image/png');
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.detectedExtension, 'png');
    });

    await test('Validator: Valid WebP buffer and WebP MIME type passes', () => {
      // WebP magic bytes: RIFF [4 bytes] WEBP
      const webpBuf = Buffer.alloc(32);
      webpBuf.write('RIFF', 0);
      webpBuf.writeUInt32LE(24, 4);
      webpBuf.write('WEBP', 8);
      const res = validateImageBuffer(webpBuf, 'image/webp');
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.detectedExtension, 'webp');
    });

    await test('Validator: MIME type and file signature mismatch is rejected', () => {
      // PNG buffer with JPEG mime type
      const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
      const res = validateImageBuffer(pngBuf, 'image/jpeg');
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.includes('MIME type does not match'));
    });

    await test('Validator: SVG and HTML injection attempts are rejected', () => {
      const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      const res = validateImageBuffer(svgBuf, 'image/svg+xml');
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.includes('SVG, HTML, and script files are strictly prohibited'));
    });

    await test('Validator: Oversized files (> 5 MiB) are rejected', () => {
      const largeBuf = Buffer.alloc(6 * 1024 * 1024); // 6 MB
      const res = validateImageBuffer(largeBuf, 'image/jpeg');
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.includes('File size exceeds 5 MiB'));
    });

    await test('Validator: Empty files are rejected', () => {
      const emptyBuf = Buffer.alloc(0);
      const res = validateImageBuffer(emptyBuf, 'image/jpeg');
      assert.strictEqual(res.isValid, false);
      assert.ok(res.error?.includes('empty or invalid'));
    });

    // 3. API Integration Authorization Tests
    const BASE_URL = 'http://localhost:3000';

    await test('API: Unauthenticated upload to /api/merchant/upload-image is rejected with 401', async () => {
      const formData = new FormData();
      // create a dummy blob
      const blob = new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' });
      formData.append('image', blob, 'test.jpg');

      const res = await fetch(`${BASE_URL}/api/merchant/upload-image`, {
        method: 'POST',
        body: formData
      });

      assert.strictEqual(res.status, 401, 'Unauthenticated request must return 401 Unauthorized');
    });

    // 4. Live Supabase Integration Test (conditional on credentials)
    const hasLiveCredentials = Boolean(origUrl && origKey && !origUrl.includes('placeholder'));
    await test(
      'API (Live): Authenticated upload with valid credentials produces Supabase public URL',
      async () => {
        // Get dev login token for merchant_001
        const loginRes = await fetch(`${BASE_URL}/api/auth/dev-login`, { method: 'POST' });
        const loginData = await loginRes.json();
        const token = loginData.token;
        assert.ok(token, 'Must acquire dev login token');

        const formData = new FormData();
        const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
        const blob = new Blob([jpegBuf], { type: 'image/jpeg' });
        formData.append('image', blob, 'integration_test.jpg');

        const uploadRes = await fetch(`${BASE_URL}/api/merchant/upload-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const uploadData = await uploadRes.json();
        assert.strictEqual(uploadRes.status, 201, `Live upload must return 201 Created (got status ${uploadRes.status}: ${JSON.stringify(uploadData)})`);
        assert.strictEqual(uploadData.success, true);
        assert.ok(uploadData.imageUrl, 'Must return imageUrl');
        assert.ok(uploadData.imageUrl.startsWith('https://'), 'imageUrl must be valid https URL');
      },
      !hasLiveCredentials,
      'Supabase credentials not configured in environment (skipped live integration test)'
    );

  } finally {
    // Restore original env
    process.env.SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
    process.env.SUPABASE_BUCKET_PRODUCT_IMAGES = origBucket;
    await resetSupabaseStorageForTesting();
  }

  console.log(`\n========================================================`);
  console.log(`SUPABASE STORAGE TEST RESULTS: PASSED: ${passed}, FAILED: ${failed}, SKIPPED: ${skipped}, TOTAL: ${total}`);
  console.log(`========================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSupabaseStorageTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
