/**
 * Test Suite for BLK-02: Atomic Checkout & Inventory Engine
 * Concurrency, Duplicate Aggregation, Idempotency, and Negative Inventory Prevention Tests.
 */

import { checkoutEngine, CheckoutError } from '../server/checkoutEngine.ts';
import { productRepository } from '../server/repositories/productRepository.ts';
import { getFirestoreRestClient } from '../server/firestoreClient.ts';

async function runTests() {
  console.log('--- STARTING BLK-02 ATOMIC CHECKOUT & INVENTORY TESTS ---');
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
  const testMerchantId = 'merchant_001';
  const testSlug = 'yangon-style';

  // Setup a test product with exactly 1 unit of stock
  const singleStockProdId = `prod_single_${Date.now()}`;
  await productRepository.create({
    id: singleStockProdId,
    merchantId: testMerchantId,
    name: 'Last Unit Limited Silk Scarf',
    sku: 'SCARF-001',
    price: 35000,
    currency: 'MMK',
    description: 'Exclusive hand-dyed scarf',
    variants: [
      { id: 'var_gold', name: 'Gold', stock: 1, price: 35000 },
      { id: 'var_silver', name: 'Silver', stock: 0, price: 35000 },
    ],
    status: 'published',
    stock: 1,
  } as any);

  // Setup a test product with multiple variants
  const multiVariantProdId = `prod_multi_${Date.now()}`;
  await productRepository.create({
    id: multiVariantProdId,
    merchantId: testMerchantId,
    name: 'Myanmar Traditional Longyi',
    sku: 'LONGYI-001',
    price: 20000,
    currency: 'MMK',
    description: 'Cotton longyi',
    variants: [
      { id: 'var_M', name: 'Size M', stock: 5, price: 20000 },
      { id: 'var_L', name: 'Size L', stock: 5, price: 20000 },
    ],
    status: 'published',
    stock: 10,
  } as any);

  // Test 1: Duplicate Product IDs & Variant Aggregation in Single Cart
  console.log('\n[1] Testing Duplicate Product ID & Variant Aggregation in Single Cart:');
  try {
    const order = await checkoutEngine.processCheckout({
      merchantId: testMerchantId,
      slug: testSlug,
      items: [
        { productId: multiVariantProdId, variantId: 'var_M', quantity: 2 },
        { productId: multiVariantProdId, variantId: 'var_L', quantity: 1 },
        { productId: multiVariantProdId, variantId: 'var_M', quantity: 1 }, // Duplicate variant M! Total M = 3
      ],
      customer: {
        customerName: 'Daw Khin',
        customerPhone: '09111222333',
        customerAddress: 'Kamayut, Yangon',
      },
    });

    assert(order.items.length === 3, 'All 3 line items represented in order');
    assert(order.totalAmount === 80000, 'Total amount correctly calculated (4 items * 20,000 = 80,000)');

    // Verify stock in database
    const updatedProd = await productRepository.findById(multiVariantProdId);
    const varM = updatedProd?.variants?.find((v: any) => v.id === 'var_M');
    const varL = updatedProd?.variants?.find((v: any) => v.id === 'var_L');
    assert(varM?.stock === 2, 'Variant M stock correctly decremented from 5 to 2 (delta = 3)');
    assert(varL?.stock === 4, 'Variant L stock correctly decremented from 5 to 4 (delta = 1)');
    const totalVariantStock = updatedProd?.variants?.reduce((sum: number, v: any) => sum + v.stock, 0);
    assert(totalVariantStock === 6, 'Total variant stock sum decremented from 10 to 6');
  } catch (err: any) {
    console.error('Test 1 error:', err);
    assert(false, `Test 1 failed: ${err.message}`);
  }

  // Test 2: Insufficient Stock Rejection
  console.log('\n[2] Testing Insufficient Variant Stock Rejection:');
  try {
    let rejected = false;
    try {
      await checkoutEngine.processCheckout({
        merchantId: testMerchantId,
        slug: testSlug,
        items: [{ productId: singleStockProdId, variantId: 'var_silver', quantity: 1 }], // stock = 0
        customer: {
          customerName: 'Ko Tun',
          customerPhone: '09444555666',
        },
      });
    } catch (e: any) {
      if (e instanceof CheckoutError && e.code === 'INSUFFICIENT_VARIANT_STOCK') {
        rejected = true;
      }
    }
    assert(rejected, 'Order for out-of-stock variant rejected with INSUFFICIENT_VARIANT_STOCK');
  } catch (err: any) {
    assert(false, `Test 2 failed: ${err.message}`);
  }

  // Test 3: Concurrent Competing Checkouts for Final Unit (stock = 1)
  console.log('\n[3] Testing Concurrent Competing Checkouts for Final Unit:');
  try {
    const p1 = checkoutEngine.processCheckout({
      merchantId: testMerchantId,
      slug: testSlug,
      items: [{ productId: singleStockProdId, variantId: 'var_gold', quantity: 1 }],
      customer: { customerName: 'Buyer A', customerPhone: '09123456789' },
      idempotencyKey: `compete_A_${Date.now()}`,
    });

    const p2 = checkoutEngine.processCheckout({
      merchantId: testMerchantId,
      slug: testSlug,
      items: [{ productId: singleStockProdId, variantId: 'var_gold', quantity: 1 }],
      customer: { customerName: 'Buyer B', customerPhone: '09987654321' },
      idempotencyKey: `compete_B_${Date.now()}`,
    });

    const results = await Promise.allSettled([p1, p2]);
    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    assert(successes.length === 1, 'Exactly 1 concurrent checkout succeeded for the final unit');
    assert(failures.length === 1, 'Exactly 1 concurrent checkout rejected to prevent overselling');

    const finalProd = await productRepository.findById(singleStockProdId);
    assert((finalProd as any)?.stock >= 0, 'Available stock never became negative');
  } catch (err: any) {
    console.error('Test 3 error:', err);
    assert(false, `Test 3 failed: ${err.message}`);
  }

  // Test 4: Idempotency Replay & Conflict Detection
  console.log('\n[4] Testing Idempotency Replay & Fingerprint Conflict:');
  const idemKey = `idem_${Date.now()}_test`;
  try {
    // First submission
    const firstOrder = await checkoutEngine.processCheckout({
      merchantId: testMerchantId,
      slug: testSlug,
      items: [{ productId: multiVariantProdId, variantId: 'var_M', quantity: 1 }],
      customer: { customerName: 'Idem User', customerPhone: '09555666777' },
      idempotencyKey: idemKey,
    });

    // Replay with exact same payload
    const secondOrder = await checkoutEngine.processCheckout({
      merchantId: testMerchantId,
      slug: testSlug,
      items: [{ productId: multiVariantProdId, variantId: 'var_M', quantity: 1 }],
      customer: { customerName: 'Idem User', customerPhone: '09555666777' },
      idempotencyKey: idemKey,
    });

    assert(firstOrder.id === secondOrder.id, 'Idempotency replay returns identical order ID');

    // Replay with altered payload under same key (should throw 409 Conflict)
    let conflictThrown = false;
    try {
      await checkoutEngine.processCheckout({
        merchantId: testMerchantId,
        slug: testSlug,
        items: [{ productId: multiVariantProdId, variantId: 'var_M', quantity: 2 }], // altered qty!
        customer: { customerName: 'Idem User', customerPhone: '09555666777' },
        idempotencyKey: idemKey,
      });
    } catch (e: any) {
      if (e instanceof CheckoutError && e.code === 'IDEMPOTENCY_CONFLICT') {
        conflictThrown = true;
      }
    }
    assert(conflictThrown, 'Altered payload with existing idempotency key throws IDEMPOTENCY_CONFLICT');
  } catch (err: any) {
    console.error('Test 4 error:', err);
    assert(false, `Test 4 failed: ${err.message}`);
  }

  // Cleanup test products
  await productRepository.delete(singleStockProdId).catch(() => {});
  await productRepository.delete(multiVariantProdId).catch(() => {});

  console.log(`\n--- BLK-02 SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
