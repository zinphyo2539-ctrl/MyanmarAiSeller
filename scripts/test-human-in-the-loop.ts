/**
 * Test Suite for BLK-05: Strict Human-in-the-Loop AI Security
 * Tests action prohibition, HMAC signing, tampering, replay attacks, and tenant isolation.
 */

import { aiActionSecurity, AiAuthorizationError } from '../server/aiActions/actionSecurity.ts';
import { productRepository } from '../server/repositories/productRepository.ts';
import { getDb } from '../server/db.ts';

async function runTests() {
  console.log('--- STARTING BLK-05 HUMAN-IN-THE-LOOP AI SECURITY TESTS ---');
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

  const merchantA = 'merchant_001';
  const merchantB = 'test_merchant_B';

  // Setup test product for mutation
  const testProdId = `prod_ai_${Date.now()}`;
  await productRepository.create({
    id: testProdId,
    merchantId: merchantA,
    name: 'AI Enhanced Silk Scarf',
    sku: 'AI-SILK-001',
    price: 32000,
    currency: 'MMK',
    description: 'Initial manual description',
    variants: [],
    status: 'published',
  });

  // Test 1: Absolute Prohibition of Privileged Financial Actions
  console.log('\n[1] Testing Absolute Prohibition of Privileged Actions:');
  let prohibitedBlocked = false;
  try {
    aiActionSecurity.createSignedProposalToken({
      actionType: 'CONFIRM_PAYMENT' as any, // Prohibited!
      merchantId: merchantA,
      proposedByModel: 'groq-llama-3',
      payload: { orderId: 'ord_123' },
      reasoning: 'AI believes payment slip looks valid',
    });
  } catch (e: any) {
    if (e instanceof AiAuthorizationError && e.code === 'PROHIBITED_ACTION_TYPE') {
      prohibitedBlocked = true;
    }
  }
  assert(prohibitedBlocked, 'Direct AI payment confirmation proposal strictly rejected with PROHIBITED_ACTION_TYPE');

  // Test 2: Valid Allowed Action Proposal
  console.log('\n[2] Testing Valid Allowed Action Proposal:');
  const validProposal = {
    actionType: 'SUGGEST_PRODUCT_DESCRIPTION' as const,
    merchantId: merchantA,
    proposedByModel: 'gemini-2.5-flash',
    payload: {
      productId: testProdId,
      description: 'Ultra-soft premium lotus silk scarf, handwoven in Inle Lake.',
    },
    reasoning: 'Enhanced copywriting for higher conversion',
  };

  const { actionToken, expiresAt, payloadHash } = aiActionSecurity.createSignedProposalToken(validProposal);
  assert(typeof actionToken === 'string' && actionToken.length > 50, 'HMAC-signed actionToken created');
  assert(expiresAt > Date.now(), 'Token has future expiration timestamp');
  assert(payloadHash.length === 64, 'Deterministic SHA-256 payload hash computed');

  // Test 3: Tampered Payload Rejection
  console.log('\n[3] Testing Tampered Payload Detection:');
  let tamperedRejected = false;
  try {
    await aiActionSecurity.executeApprovedAction(
      actionToken,
      {
        productId: testProdId,
        description: 'HACKED DESCRIPTION BY ATTACKER', // Tampered!
      },
      { userId: 'user_owner_001', role: 'merchant_admin', merchantId: merchantA }
    );
  } catch (e: any) {
    if (e instanceof AiAuthorizationError && e.code === 'PAYLOAD_TAMPERED') {
      tamperedRejected = true;
    }
  }
  assert(tamperedRejected, 'Tampered payload rejected with PAYLOAD_TAMPERED');

  // Test 4: Cross-Merchant Token Usage Rejection
  console.log('\n[4] Testing Cross-Merchant Token Protection:');
  let crossMerchantRejected = false;
  try {
    await aiActionSecurity.executeApprovedAction(
      actionToken,
      validProposal.payload,
      { userId: 'user_merchant_B', role: 'merchant_admin', merchantId: merchantB } // Merchant B attempting to execute A's token
    );
  } catch (e: any) {
    if (e instanceof AiAuthorizationError && e.code === 'CROSS_MERCHANT_FORBIDDEN') {
      crossMerchantRejected = true;
    }
  }
  assert(crossMerchantRejected, 'Cross-merchant execution attempt rejected with CROSS_MERCHANT_FORBIDDEN');

  // Test 5: Insufficient Role Rejection
  console.log('\n[5] Testing Insufficient Role Protection:');
  let roleRejected = false;
  try {
    await aiActionSecurity.executeApprovedAction(
      actionToken,
      validProposal.payload,
      { userId: 'staff_1', role: 'staff', merchantId: merchantA } // Staff instead of admin
    );
  } catch (e: any) {
    if (e instanceof AiAuthorizationError && e.code === 'INSUFFICIENT_ROLE') {
      roleRejected = true;
    }
  }
  assert(roleRejected, 'Staff user authorization attempt rejected with INSUFFICIENT_ROLE');

  // Test 6: Valid Human Approval & Atomic Execution
  console.log('\n[6] Testing Valid Human Approval & Atomic Execution:');
  const executionRes = await aiActionSecurity.executeApprovedAction(
    actionToken,
    validProposal.payload,
    { userId: 'user_owner_001', role: 'merchant_admin', merchantId: merchantA }
  );
  assert(executionRes.success === true, 'Approved execution succeeded');

  const updatedProd = await productRepository.findById(testProdId);
  assert(
    updatedProd?.description === 'Ultra-soft premium lotus silk scarf, handwoven in Inle Lake.',
    'Product description updated in database upon human approval'
  );

  const localState = getDb();
  const aiAudit = localState.auditLogs.find((l) => l.action === 'HUMAN_APPROVED_AI_ACTION');
  assert(aiAudit !== undefined, 'HUMAN_APPROVED_AI_ACTION audit event recorded');

  // Test 7: Replay Attack Protection (Executing token a second time)
  console.log('\n[7] Testing Token Replay Prevention:');
  let replayBlocked = false;
  try {
    await aiActionSecurity.executeApprovedAction(
      actionToken,
      validProposal.payload,
      { userId: 'user_owner_001', role: 'merchant_admin', merchantId: merchantA }
    );
  } catch (e: any) {
    if (e instanceof AiAuthorizationError && e.code === 'TOKEN_ALREADY_USED') {
      replayBlocked = true;
    }
  }
  assert(replayBlocked, 'Replaying previously executed token rejected with TOKEN_ALREADY_USED');

  // Cleanup
  await productRepository.delete(testProdId).catch(() => {});

  console.log(`\n--- BLK-05 SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
