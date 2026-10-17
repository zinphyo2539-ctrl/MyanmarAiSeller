import assert from 'assert';
import {
  initStorageAdapter,
  getStorageStatus,
  getStorageBucket,
  ensureStorageReady,
  validateStorageConfig,
  resetStorageAdapterForTesting,
  StorageUnavailableError,
  STORAGE_ENV_VARS
} from '../server/storage.ts';

async function runPhase1StorageTests() {
  console.log('====================================================');
  console.log('RUNNING PHASE 1 FIREBASE STORAGE FOUNDATION TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    totalTests++;
    return (async () => {
      try {
        await fn();
        console.log(`  ✓ [PASS] ${name}`);
        passedTests++;
      } catch (err: any) {
        console.error(`  ✗ [FAIL] ${name}`);
        console.error(`    Error: ${err.message}`);
        throw err;
      }
    })();
  }

  // Preserve initial environment
  const originalBucket = process.env[STORAGE_ENV_VARS.BUCKET];
  const originalProjectId = process.env[STORAGE_ENV_VARS.PROJECT_ID];
  const originalClientEmail = process.env[STORAGE_ENV_VARS.CLIENT_EMAIL];
  const originalPrivateKey = process.env[STORAGE_ENV_VARS.PRIVATE_KEY];

  try {
    // ----------------------------------------------------
    // TEST 1: Missing Configuration Returns Controlled Unavailable Status
    // ----------------------------------------------------
    await test('Test 1: Missing configuration detected cleanly and marks status unconfigured', async () => {
      delete process.env[STORAGE_ENV_VARS.BUCKET];
      delete process.env[STORAGE_ENV_VARS.PROJECT_ID];
      delete process.env[STORAGE_ENV_VARS.CLIENT_EMAIL];
      delete process.env[STORAGE_ENV_VARS.PRIVATE_KEY];

      await resetStorageAdapterForTesting();

      const validation = validateStorageConfig();
      assert.strictEqual(validation.isValid, false, 'Validation should fail when variables are missing');
      assert.strictEqual(validation.missing.length, 4, 'Should list all 4 missing variables');
      assert.deepStrictEqual(
        validation.missing.sort(),
        [
          STORAGE_ENV_VARS.BUCKET,
          STORAGE_ENV_VARS.PROJECT_ID,
          STORAGE_ENV_VARS.CLIENT_EMAIL,
          STORAGE_ENV_VARS.PRIVATE_KEY
        ].sort()
      );

      const status = initStorageAdapter();
      assert.strictEqual(status.available, false, 'Storage must not be available');
      assert.strictEqual(status.configured, false, 'Storage must not be configured');
      assert.strictEqual(status.status, 'unconfigured', 'Status must be unconfigured');
      assert.ok(status.reason && status.reason.includes('Missing required storage environment variables'));
    });

    // ----------------------------------------------------
    // TEST 2: Calling getStorageBucket() When Unconfigured Throws Controlled Error
    // ----------------------------------------------------
    await test('Test 2: getStorageBucket() fails closed with StorageUnavailableError (HTTP 503)', async () => {
      let caughtError: any = null;
      try {
        getStorageBucket();
      } catch (err: any) {
        caughtError = err;
      }

      assert.ok(caughtError, 'Must throw error when unconfigured');
      assert.ok(caughtError instanceof StorageUnavailableError, 'Must be instance of StorageUnavailableError');
      assert.strictEqual(caughtError.httpStatus, 503, 'Must have HTTP status 503');
      assert.strictEqual(caughtError.code, 'STORAGE_UNCONFIGURED', 'Must have code STORAGE_UNCONFIGURED');
      assert.ok(
        caughtError.message.includes('Missing required storage environment variables') ||
        caughtError.message.includes('unconfigured'),
        'Message must safely describe missing setup'
      );
    });

    // ----------------------------------------------------
    // TEST 3: Partial Configuration (Missing Some Variables) Still Fails Closed
    // ----------------------------------------------------
    await test('Test 3: Partial configuration safely identifies missing variables without crash', async () => {
      process.env[STORAGE_ENV_VARS.BUCKET] = 'test-bucket.firebasestorage.app';
      process.env[STORAGE_ENV_VARS.PROJECT_ID] = 'myanmar-seller-test';
      delete process.env[STORAGE_ENV_VARS.CLIENT_EMAIL];
      delete process.env[STORAGE_ENV_VARS.PRIVATE_KEY];

      await resetStorageAdapterForTesting();
      const status = initStorageAdapter();

      assert.strictEqual(status.available, false);
      assert.strictEqual(status.status, 'unconfigured');
      assert.ok(status.missingVariables?.includes(STORAGE_ENV_VARS.CLIENT_EMAIL));
      assert.ok(status.missingVariables?.includes(STORAGE_ENV_VARS.PRIVATE_KEY));
      assert.strictEqual(status.missingVariables?.includes(STORAGE_ENV_VARS.BUCKET), false);
    });

    // ----------------------------------------------------
    // TEST 4: Invalid/Malformed Credentials Fail Closed Safely Without Leaking
    // ----------------------------------------------------
    await test('Test 4: Invalid credentials do not expose sensitive data and mark initialization_failed', async () => {
      const FAKE_SENSITIVE_SECRET = 'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC-FAKE-SECRET-KEY';
      process.env[STORAGE_ENV_VARS.BUCKET] = 'test-bucket.firebasestorage.app';
      process.env[STORAGE_ENV_VARS.PROJECT_ID] = 'myanmar-seller-test';
      process.env[STORAGE_ENV_VARS.CLIENT_EMAIL] = 'storage-admin@test.iam.gserviceaccount.com';
      process.env[STORAGE_ENV_VARS.PRIVATE_KEY] = FAKE_SENSITIVE_SECRET;

      await resetStorageAdapterForTesting();
      const status = initStorageAdapter();

      assert.strictEqual(status.available, false, 'Storage must not be available with invalid cert');
      assert.strictEqual(status.status, 'initialization_failed', 'Status must be initialization_failed');

      // Verify no secrets leaked in status
      const serialized = JSON.stringify(status);
      assert.strictEqual(
        serialized.includes(FAKE_SENSITIVE_SECRET),
        false,
        'CRITICAL: Secret must never appear in serialized status object'
      );

      // Verify error thrown on getStorageBucket does not leak secret
      let caughtError: any = null;
      try {
        getStorageBucket();
      } catch (err: any) {
        caughtError = err;
      }
      assert.ok(caughtError);
      assert.strictEqual(
        caughtError.message.includes(FAKE_SENSITIVE_SECRET),
        false,
        'CRITICAL: Secret must never appear in error message'
      );
    });

    // ----------------------------------------------------
    // TEST 5: Verify No Upload Routes are Active in Phase 1
    // ----------------------------------------------------
    await test('Test 5: Verify no media upload/download routes are active in Phase 1', async () => {
      const fs = await import('fs');
      const serverCode = fs.readFileSync('./server.ts', 'utf8');

      // Check route definitions
      assert.strictEqual(
        serverCode.includes("app.post('/api/media/upload'"),
        false,
        'POST /api/media/upload must not exist in Phase 1'
      );
      assert.strictEqual(
        serverCode.includes("app.get('/api/media/download'"),
        false,
        'GET /api/media/download must not exist in Phase 1'
      );
      assert.strictEqual(
        serverCode.includes("app.get('/api/media/slips'"),
        false,
        'GET /api/media/slips must not exist in Phase 1'
      );
      assert.strictEqual(
        serverCode.includes("app.delete('/api/media'"),
        false,
        'DELETE /api/media must not exist in Phase 1'
      );
    });

    // ----------------------------------------------------
    // TEST 6: Verify Persistence and Existing Database Unmodified
    // ----------------------------------------------------
    await test('Test 6: Verify data/db.json is intact with zero migrations', async () => {
      const fs = await import('fs');
      const dbContent = JSON.parse(fs.readFileSync('./data/db.json', 'utf8'));

      assert.ok(dbContent.merchants, 'merchants collection must exist');
      assert.ok(dbContent.merchants['merchant_001'], 'merchant_001 must exist');
      assert.strictEqual(dbContent.merchants['merchant_001'].id, 'merchant_001');
      assert.ok(Array.isArray(dbContent.products), 'products must be array');
      assert.ok(Array.isArray(dbContent.orders), 'orders must be array');
      assert.ok(Array.isArray(dbContent.sampleReplies), 'sampleReplies must be array');

      // Verify no Firestore artifacts
      assert.strictEqual(dbContent.firestoreMigrated, undefined);
    });

    // ----------------------------------------------------
    // TEST 7: Bucket Name Sanitization (Handles gs:// prefix safely)
    // ----------------------------------------------------
    await test('Test 7: Bucket name sanitization strips gs:// and trailing slashes safely', async () => {
      process.env[STORAGE_ENV_VARS.BUCKET] = 'gs://my-bucket.firebasestorage.app///';
      process.env[STORAGE_ENV_VARS.PROJECT_ID] = 'my-project';
      delete process.env[STORAGE_ENV_VARS.CLIENT_EMAIL];
      delete process.env[STORAGE_ENV_VARS.PRIVATE_KEY];

      const validation = validateStorageConfig();
      assert.strictEqual(validation.bucketName, 'my-bucket.firebasestorage.app');
    });

  } finally {
    // Restore initial environment and reset adapter
    if (originalBucket !== undefined) process.env[STORAGE_ENV_VARS.BUCKET] = originalBucket;
    else delete process.env[STORAGE_ENV_VARS.BUCKET];

    if (originalProjectId !== undefined) process.env[STORAGE_ENV_VARS.PROJECT_ID] = originalProjectId;
    else delete process.env[STORAGE_ENV_VARS.PROJECT_ID];

    if (originalClientEmail !== undefined) process.env[STORAGE_ENV_VARS.CLIENT_EMAIL] = originalClientEmail;
    else delete process.env[STORAGE_ENV_VARS.CLIENT_EMAIL];

    if (originalPrivateKey !== undefined) process.env[STORAGE_ENV_VARS.PRIVATE_KEY] = originalPrivateKey;
    else delete process.env[STORAGE_ENV_VARS.PRIVATE_KEY];

    await resetStorageAdapterForTesting();
    initStorageAdapter();
  }

  console.log(`\n====================================================`);
  console.log(`PHASE 1 STORAGE TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
  console.log(`====================================================\n`);
}

runPhase1StorageTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
