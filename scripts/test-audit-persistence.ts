/**
 * Test Suite for BLK-06: Append-Only Audit Logging & Migration
 * Validates 78-record legacy migration parity, synchronous append-only logging, and tenant isolation.
 */

import { auditLogger } from '../server/audit/auditLogger.ts';
import { migrateLegacyAuditLogs } from '../server/audit/migrateLegacyAuditLogs.ts';
import { getFirestoreRestClient } from '../server/firestoreClient.ts';

async function runTests() {
  console.log('--- STARTING BLK-06 AUDIT LOGGING & MIGRATION TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  const client = getFirestoreRestClient();

  // 1. Legacy Migration Test (78 Records)
  console.log('\n[1] Testing Legacy Audit Log Migration:');
  try {
    const summary = await migrateLegacyAuditLogs();
    assert(summary.totalSourceRecords === 78, 'Total source records counted = 78');
    assert(
      summary.migratedCount + summary.skippedCount === 78,
      'All 78 records accounted for in Firestore (migrated + already present)'
    );
    assert(summary.parityVerified === true, 'Read-back parity confirmed: exactly 78/78 documents verified');
  } catch (err: any) {
    console.error('Migration error:', err);
    assert(false, `Audit migration failed: ${err.message}`);
  }

  // 2. Synchronous Append-Only Event Creation Test
  console.log('\n[2] Testing Append-Only Event Logging:');
  const testMerchantId = 'merchant_001';
  const testAction = 'TEST_SECURITY_EVENT_' + Date.now();
  let createdEventId = '';

  try {
    const event = await auditLogger.appendEvent({
      merchantId: testMerchantId,
      actorUserId: 'admin_security_tester',
      actorRole: 'merchant_admin',
      action: testAction,
      resourceType: 'product',
      resourceId: 'prod_test_audit',
      details: 'Audit verification test event directly committed to Cloud Firestore',
      result: 'SUCCESS',
      metadata: { environment: 'staging_validation' },
    });

    createdEventId = event.id;
    assert(event.id.startsWith('log_'), 'Audit event ID generated with deterministic log_ prefix');
    assert(typeof event.timestamp === 'string', 'Server timestamp recorded in ISO 8601');
    assert(event.result === 'SUCCESS', 'Event result classification recorded');

    // Read back directly from Firestore REST API
    const fetched = await client.getDocument('auditLogs', createdEventId);
    assert(fetched !== null && fetched.id === createdEventId, 'Audit event retrieved directly from Firestore');
    assert(fetched?.action === testAction, 'Audit event payload integrity verified');
  } catch (err: any) {
    console.error('Append event error:', err);
    assert(false, `Append event failed: ${err.message}`);
  }

  // 3. Tenant Isolation on Audit Log Queries
  console.log('\n[3] Testing Tenant-Scoped Audit Log Queries:');
  try {
    const merchantLogs = await auditLogger.getAuditLogsByMerchant(testMerchantId, 20);
    assert(merchantLogs.length > 0, 'Queried audit logs for merchant_001');

    const foreignTenantLogs = merchantLogs.filter((l) => l.merchantId !== testMerchantId);
    assert(foreignTenantLogs.length === 0, 'Tenant isolation verified: 0 cross-tenant logs returned');
  } catch (err: any) {
    console.error('Tenant query error:', err);
    assert(false, `Tenant query failed: ${err.message}`);
  }

  console.log(`\n--- BLK-06 SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
