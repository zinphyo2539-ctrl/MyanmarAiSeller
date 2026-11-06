/**
 * Test Suite for BLK-04: Firestore REST Client
 * Validates serialization, Web Crypto authentication, REST operations, and transactions.
 */

import {
  toFirestoreValue,
  fromFirestoreValue,
  toFirestoreDocument,
  fromFirestoreDocument,
  getFirestoreRestClient,
  FirestoreRestError,
} from '../server/firestoreClient.ts';

async function runTests() {
  console.log('--- STARTING BLK-04 FIRESTORE REST CLIENT TESTS ---');
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

  // 1. Serialization Tests
  console.log('\n[1] Testing Type Serialization & Deserialization:');
  const sampleData = {
    str: 'Yangon Style',
    intNum: 15000,
    floatNum: 12.5,
    boolTrue: true,
    boolFalse: false,
    nullVal: null,
    arr: ['red', 'blue', 42],
    nested: {
      name: 'Item 1',
      price: 2500,
      active: true,
    },
  };

  const serialized = toFirestoreDocument(sampleData);
  const fields = serialized.fields as any;
  assert(fields.str.stringValue === 'Yangon Style', 'String serialization');
  assert(fields.intNum.integerValue === '15000', 'Integer serialization');
  assert(fields.floatNum.doubleValue === 12.5, 'Float/Double serialization');
  assert(fields.boolTrue.booleanValue === true, 'Boolean serialization');
  assert(fields.nullVal.nullValue === null, 'Null serialization');
  assert(fields.arr.arrayValue?.values?.length === 3, 'Array serialization');
  assert(
    fields.nested.mapValue?.fields?.price.integerValue === '2500',
    'Nested Map serialization'
  );

  const deserialized = fromFirestoreDocument({
    name: 'projects/p/databases/d/documents/test_coll/doc_123',
    fields: serialized.fields,
  });

  assert(deserialized.id === 'doc_123', 'Document ID extraction from name');
  assert(deserialized.str === sampleData.str, 'String roundtrip');
  assert(deserialized.intNum === sampleData.intNum, 'Integer roundtrip');
  assert(deserialized.floatNum === sampleData.floatNum, 'Float roundtrip');
  assert(deserialized.boolTrue === true, 'Boolean roundtrip');
  assert(deserialized.nullVal === null, 'Null roundtrip');
  assert(deserialized.arr[0] === 'red' && deserialized.arr[2] === 42, 'Array roundtrip');
  assert(deserialized.nested.price === 2500, 'Nested map roundtrip');

  // 2. Client Initialization Test
  console.log('\n[2] Testing Client Initialization:');
  const client = getFirestoreRestClient();
  assert(client.projectId === 'gen-lang-client-0903319954', 'Client Project ID matches');
  assert(
    client.databaseId === 'ai-studio-myanmaraiseller-5ecdcad1-2fa1-4433-8ee7-fae758ed7e19',
    'Client Database ID matches'
  );

  // 3. Staging Connectivity & CRUD Tests
  console.log('\n[3] Testing Firestore REST Staging API:');
  const testDocId = `test_blk04_${Date.now()}`;
  try {
    // Create Document in _health_check (which is open for read/write in firestore.rules)
    const created = await client.createDocument('_health_check', testDocId, {
      id: testDocId,
      testRun: 'BLK-04-VALIDATION',
      timestamp: new Date().toISOString(),
      status: 'active',
      counter: 100,
    });
    assert(created.id === testDocId, 'createDocument succeeded');
    assert(created.counter === 100, 'createDocument fields verified');

    // Read Document
    const fetched = await client.getDocument('_health_check', testDocId);
    assert(fetched !== null, 'getDocument found created document');
    assert(fetched?.status === 'active', 'getDocument read back correct value');

    // Update Document
    const updated = await client.updateDocument(
      '_health_check',
      testDocId,
      { status: 'verified', counter: 101 },
      { merge: true }
    );
    assert(updated.status === 'verified', 'updateDocument updated field');
    assert(updated.counter === 101, 'updateDocument updated numeric field');

    // Query Document
    const queryResults = await client.runQuery('_health_check', {
      where: [{ field: 'testRun', op: 'EQUAL', value: 'BLK-04-VALIDATION' }],
      limit: 5,
    });
    assert(queryResults.length > 0, 'runQuery found documents matching filter');

    // Delete Document
    await client.deleteDocument('_health_check', testDocId);
    const afterDelete = await client.getDocument('_health_check', testDocId);
    assert(afterDelete === null, 'deleteDocument verified (returns null on fetch)');
  } catch (err: any) {
    console.error('[CRITICAL TEST ERROR]', err);
    assert(false, `Live Firestore REST call failed: ${err.message}`);
  }

  // 4. Atomic Commit & OCC Precondition Tests
  console.log('\n[4] Testing Atomic Multi-Write Commit & Optimistic Concurrency Control:');
  try {
    const txDocId = `tx_blk04_${Date.now()}`;
    
    // Test atomic multi-write batch commit
    const commitRes = await client.commit([
      {
        update: {
          name: `_health_check/${txDocId}`,
          fields: toFirestoreDocument({
            id: txDocId,
            transactionTest: true,
            amount: 500,
          }).fields,
        },
      },
    ]);
    assert(commitRes.writeResults.length === 1, 'Atomic multi-write commit returned write result');

    const txDoc = await client.getDocument('_health_check', txDocId);
    assert(txDoc?.amount === 500, 'Committed document verified by read');
    assert(typeof txDoc?._updateTime === 'string', 'Document contains authoritative _updateTime');

    // Test OCC conditional write with correct updateTime
    await client.commit([
      {
        update: {
          name: `_health_check/${txDocId}`,
          fields: toFirestoreDocument({
            id: txDocId,
            transactionTest: true,
            amount: 501,
          }).fields,
        },
        currentDocument: { updateTime: txDoc!._updateTime },
      },
    ]);
    assert(true, 'Conditional write with matching updateTime succeeded');

    // Test OCC conflict rejection with stale updateTime
    let conflictCaught = false;
    try {
      await client.commit([
        {
          update: {
            name: `_health_check/${txDocId}`,
            fields: toFirestoreDocument({
              id: txDocId,
              transactionTest: true,
              amount: 999,
            }).fields,
          },
          currentDocument: { updateTime: txDoc!._updateTime }, // Stale!
        },
      ]);
    } catch (e: any) {
      conflictCaught = true;
      assert(
        e.message.includes('FAILED_PRECONDITION') || e.message.includes('does not match'),
        'Stale updateTime correctly rejected by Firestore OCC'
      );
    }
    assert(conflictCaught, 'OCC conflict successfully detected and rejected');

    // Cleanup
    await client.deleteDocument('_health_check', txDocId);
    assert(true, 'Test document cleaned up');
  } catch (err: any) {
    console.error('[CRITICAL OCC/COMMIT ERROR]', err);
    assert(false, `Atomic commit/OCC failed: ${err.message}`);
  }

  console.log(`\n--- BLK-04 SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
