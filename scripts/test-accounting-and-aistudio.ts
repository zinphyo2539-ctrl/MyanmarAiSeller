/**
 * Automated Verification Suite for Accounting and AI Studio
 * Tests Tenant Isolation, Financial Calculations, Security Authorization, and AI Studio
 */

import {
  initPersistence,
  getDb,
  withDbTransaction,
  saveAuthToken,
  type UserRecord,
  type DbState
} from '../server/db.ts';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== STARTING ACCOUNTING & AI STUDIO VERIFICATION SUITE ===\n');
  await initPersistence();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Setup Test Merchants and Users
  console.log('--- Setting up test isolation fixtures ---');
  const merchantA_Id = 'test_merchant_A';
  const merchantB_Id = 'test_merchant_B';

  const userA: UserRecord = {
    id: 'user_test_A',
    name: 'Merchant A Owner',
    email: 'merchantA@test.mm',
    role: 'merchant_admin',
    merchantId: merchantA_Id,
    provider: 'local',
    createdAt: new Date().toISOString()
  };

  const userB: UserRecord = {
    id: 'user_test_B',
    name: 'Merchant B Owner',
    email: 'merchantB@test.mm',
    role: 'merchant_admin',
    merchantId: merchantB_Id,
    provider: 'local',
    createdAt: new Date().toISOString()
  };

  const tokenA = 'test_token_A_' + Date.now();
  const tokenB = 'test_token_B_' + Date.now();

  await withDbTransaction((db) => {
    db.users[userA.id] = userA;
    db.users[userB.id] = userB;

    db.merchants[merchantA_Id] = {
      id: merchantA_Id,
      shopName: 'Merchant A Fashion Store',
      ownerName: userA.name,
      email: userA.email,
      store: {
        slug: 'merchant-a-shop',
        storeName: 'Merchant A Fashion Store',
        isPublished: true
      },
      aiConfig: { enabled: true }
    };

    db.merchants[merchantB_Id] = {
      id: merchantB_Id,
      shopName: 'Merchant B Electronics',
      ownerName: userB.name,
      email: userB.email,
      store: {
        slug: 'merchant-b-shop',
        storeName: 'Merchant B Electronics',
        isPublished: true
      },
      aiConfig: { enabled: true }
    };

    // Product for A
    db.products.push({
      id: 'prod_test_A_1',
      merchantId: merchantA_Id,
      name: 'Organic Cotton Polo',
      sku: 'POLO-COTTON-001',
      price: 25000,
      costPrice: 12000,
      currency: 'MMK',
      description: 'Handcrafted premium polo shirt',
      variants: [{ id: 'v1', color: 'Navy', size: 'L', stock: 20, sku: 'POLO-NAVY-L' }],
      status: 'active'
    });

    // Product for B
    db.products.push({
      id: 'prod_test_B_1',
      merchantId: merchantB_Id,
      name: 'Wireless Bluetooth Headphones',
      sku: 'HEADPHONE-BT-001',
      price: 65000,
      costPrice: 35000,
      currency: 'MMK',
      description: 'Active noise cancelling headphones',
      variants: [{ id: 'v2', color: 'Black', size: 'One Size', stock: 10, sku: 'HEADPHONE-BLK' }],
      status: 'active'
    });

    // Accounting Entry for B
    db.accountingEntries.push({
      id: 'acc_entry_B_confidential',
      merchantId: merchantB_Id,
      date: new Date().toISOString().slice(0, 10),
      type: 'income',
      category: 'sales_revenue',
      amount: 1500000,
      paymentMethod: 'Bank Transfer',
      source: 'manual',
      description: 'Confidential Merchant B bulk sale',
      createdBy: userB.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  await saveAuthToken(tokenA, userA);
  await saveAuthToken(tokenB, userB);

  console.log('Fixtures initialized.\n');

  // TEST 1: Unauthenticated user cannot access Accounting or AI Studio
  console.log('--- Test Group 1: Authentication Guard Enforcement ---');
  try {
    const unauthRes1 = await fetch(`${BASE_URL}/api/accounting/summary`);
    assert(unauthRes1.status === 401, 'Unauthenticated GET /api/accounting/summary returns 401');

    const unauthRes2 = await fetch(`${BASE_URL}/api/accounting/entries`);
    assert(unauthRes2.status === 401, 'Unauthenticated GET /api/accounting/entries returns 401');

    const unauthRes3 = await fetch(`${BASE_URL}/api/ai-studio/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'clean_background' })
    });
    assert(unauthRes3.status === 401, 'Unauthenticated POST /api/ai-studio/generate-image returns 401');

    const unauthRes4 = await fetch(`${BASE_URL}/api/ai-studio/apply-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: 'prod_test_A_1', imageUrl: 'https://example.com/img.png' })
    });
    assert(unauthRes4.status === 401, 'Unauthenticated POST /api/ai-studio/apply-image returns 401');
  } catch (e: any) {
    console.error('Error in Test Group 1:', e);
    failed++;
  }

  // TEST 2: Tenant Isolation — Merchant A cannot access Merchant B's accounting entries
  console.log('\n--- Test Group 2: Tenant Isolation & Access Control ---');
  try {
    const resA = await fetch(`${BASE_URL}/api/accounting/entries`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(resA.status === 200, 'Merchant A can read own accounting entries endpoint');
    const dataA = await resA.json();
    const hasMerchantBEntry = dataA.entries.some((e: any) => e.id === 'acc_entry_B_confidential');
    assert(!hasMerchantBEntry, 'Merchant A cannot see Merchant B confidential entries (strict isolation)');

    // Merchant A trying to delete Merchant B's entry
    const deleteBRes = await fetch(`${BASE_URL}/api/accounting/entries/acc_entry_B_confidential`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(deleteBRes.status === 404, 'Merchant A cannot delete Merchant B entry (returns 404 unauthorized)');
  } catch (e: any) {
    console.error('Error in Test Group 2:', e);
    failed++;
  }

  // TEST 3: Tenant Isolation in AI Studio — Merchant A cannot attach image to Merchant B's product
  console.log('\n--- Test Group 3: Cross-Tenant Asset Protection in AI Studio ---');
  try {
    const applyCrossRes = await fetch(`${BASE_URL}/api/ai-studio/apply-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        productId: 'prod_test_B_1', // Product belongs to Merchant B
        imageUrl: 'https://example.com/hacked.png'
      })
    });
    assert(applyCrossRes.status === 404, 'Merchant A cannot attach image to Merchant B product (returns 404 not found)');

    // Verify product B was NOT modified
    const db = getDb();
    const prodB = db.products.find(p => p.id === 'prod_test_B_1');
    assert(prodB?.imageUrl !== 'https://example.com/hacked.png', 'Product B imageUrl remains unchanged');
  } catch (e: any) {
    console.error('Error in Test Group 3:', e);
    failed++;
  }

  // TEST 4: Accounting Income/Expense CRUD & Validation
  console.log('\n--- Test Group 4: Accounting Income & Expense Entry CRUD ---');
  try {
    // 4.1 Create Expense
    const createRes = await fetch(`${BASE_URL}/api/accounting/entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        date: '2026-10-25',
        type: 'expense',
        category: 'advertising',
        amount: 85000,
        paymentMethod: 'KBZPay',
        description: 'Facebook Ad campaign for Autumn polo shirts'
      })
    });
    assert(createRes.status === 201, 'Created new expense entry successfully (201)');
    const createdData = await createRes.json();
    const entryId = createdData.entry?.id;
    assert(!!entryId, 'Created entry has valid ID');
    assert(createdData.entry.amount === 85000, 'Entry amount verified');

    // 4.2 Validation: negative amount
    const invalidAmountRes = await fetch(`${BASE_URL}/api/accounting/entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        date: '2026-10-25',
        type: 'expense',
        category: 'rent',
        amount: -5000,
        paymentMethod: 'Cash'
      })
    });
    assert(invalidAmountRes.status === 400, 'Rejects invalid/negative amounts with 400 Bad Request');

    // 4.3 Update Entry
    const updateRes = await fetch(`${BASE_URL}/api/accounting/entries/${entryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        amount: 90000,
        description: 'Updated ad spend amount'
      })
    });
    assert(updateRes.status === 200, 'Updated entry successfully (200)');
    const updatedData = await updateRes.json();
    assert(updatedData.entry.amount === 90000, 'Updated entry has new amount');

    // 4.4 Delete Entry
    const deleteRes = await fetch(`${BASE_URL}/api/accounting/entries/${entryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(deleteRes.status === 200, 'Deleted entry successfully (200)');
  } catch (e: any) {
    console.error('Error in Test Group 4:', e);
    failed++;
  }

  // TEST 5: Financial Calculations & Order Integration
  console.log('\n--- Test Group 5: Authoritative Financial Metric Calculations ---');
  try {
    // Inject two orders for Merchant A:
    // Order 1: Confirmed and Paid (2 x Polo @ 25,000 = 50,000 MMK; costPrice = 12,000 each => COGS = 24,000 MMK)
    // Order 2: Pending payment (1 x Polo @ 25,000 = 25,000 MMK; Receivables = 25,000 MMK)
    await withDbTransaction((db) => {
      db.orders.push({
        id: 'ord_test_A_paid_1',
        merchantId: merchantA_Id,
        customerName: 'Daw Mya',
        customerPhone: '0912345678',
        items: [{ productId: 'prod_test_A_1', name: 'Organic Cotton Polo', qty: 2, price: 25000 }],
        totalAmount: 50000,
        paymentStatus: 'CONFIRMED',
        status: 'confirmed',
        createdAt: new Date().toISOString()
      });

      db.orders.push({
        id: 'ord_test_A_pending_2',
        merchantId: merchantA_Id,
        customerName: 'U Ba',
        customerPhone: '0987654321',
        items: [{ productId: 'prod_test_A_1', name: 'Organic Cotton Polo', qty: 1, price: 25000 }],
        totalAmount: 25000,
        paymentStatus: 'PENDING',
        status: 'processing',
        createdAt: new Date().toISOString()
      });

      // Add operating expense: Delivery = 10,000 MMK
      db.accountingEntries.push({
        id: 'acc_expense_deliv_1',
        merchantId: merchantA_Id,
        date: new Date().toISOString().slice(0, 10),
        type: 'expense',
        category: 'delivery',
        amount: 10000,
        paymentMethod: 'Cash',
        source: 'manual',
        description: 'Deli fees to delivery guy',
        createdBy: userA.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    const summaryRes = await fetch(`${BASE_URL}/api/accounting/summary?range=today`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(summaryRes.status === 200, 'Calculated financial summary successfully (200)');
    const sum = await summaryRes.json();

    // Verify definitions:
    // Sales Revenue: 50,000 + 25,000 = 75,000 MMK
    assert(sum.salesRevenue === 75000, `Sales Revenue correct: recognized 75,000 MMK (got: ${sum.salesRevenue})`);

    // Cash Received: Only confirmed paid = 50,000 MMK
    assert(sum.cashReceived === 50000, `Cash Received correct: 50,000 MMK (got: ${sum.cashReceived})`);

    // Outstanding Receivables: 25,000 MMK
    assert(sum.receivables === 25000, `Receivables correct: 25,000 MMK (got: ${sum.receivables})`);

    // COGS: 2 sold * 12,000 = 24,000 MMK
    assert(sum.cogs === 24000, `COGS calculated correctly from costPrice basis: 24,000 MMK (got: ${sum.cogs})`);

    // Operating expenses: 10,000 MMK
    assert(sum.operatingExpenses === 10000, `Operating expenses correct: 10,000 MMK (got: ${sum.operatingExpenses})`);

    // Gross Profit = 75,000 - 24,000 = 51,000 MMK
    assert(sum.grossProfit === 51000, `Gross Profit correct: 51,000 MMK (got: ${sum.grossProfit})`);

    // Net Profit = 51,000 - 10,000 = 41,000 MMK
    assert(sum.netProfit === 41000, `Net Profit correct: 41,000 MMK (got: ${sum.netProfit})`);

    // Net Cash Flow = Inflows (50,000) - Outflows (10,000) = 40,000 MMK
    assert(sum.netCashFlow === 40000, `Net Cash Flow correct: 40,000 MMK (got: ${sum.netCashFlow})`);
  } catch (e: any) {
    console.error('Error in Test Group 5:', e);
    failed++;
  }

  // TEST 6: Idempotent Order Reconciliation
  console.log('\n--- Test Group 6: Idempotent Order Reconciliation ---');
  try {
    const recon1 = await fetch(`${BASE_URL}/api/accounting/reconcile-orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(recon1.status === 200, 'Reconcile orders first run succeeded (200)');
    const r1 = await recon1.json();
    assert(r1.syncedCount >= 0, `Synced ${r1.syncedCount} orders into accounting`);

    // Second run: must be idempotent and not create duplicates
    const recon2 = await fetch(`${BASE_URL}/api/accounting/reconcile-orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(recon2.status === 200, 'Reconcile orders second run succeeded (200)');
    const r2 = await recon2.json();
    assert(r2.syncedCount === 0, `Idempotency verified: second run created 0 duplicates (got: ${r2.syncedCount})`);
  } catch (e: any) {
    console.error('Error in Test Group 6:', e);
    failed++;
  }

  // TEST 7: AI Studio Product Image Generation & Application Integrity
  console.log('\n--- Test Group 7: AI Studio Image Generation & Product Integrity ---');
  try {
    // 7.1 Generate Image
    const genRes = await fetch(`${BASE_URL}/api/ai-studio/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        productId: 'prod_test_A_1',
        mode: 'clean_background',
        aspectRatio: '1:1',
        customInstructions: 'Add soft studio drop shadow'
      })
    });
    assert(genRes.status === 200, 'AI Studio generate-image returned 200 OK');
    const genData = await genRes.json();
    assert(genData.success === true, 'Generation success reported');
    assert(!!genData.imageUrl, 'Returned persistent imageUrl');
    assert(!!genData.generationId, 'Returned generationId');

    // Check that Inventory product was NOT auto-replaced yet (Rule: merchant must choose explicitly)
    const db = getDb();
    const prodA_before = db.products.find(p => p.id === 'prod_test_A_1');
    assert(prodA_before?.imageUrl !== genData.imageUrl, 'Product was NOT prematurely replaced before merchant confirmation');

    // 7.2 Apply Image to Inventory
    const applyRes = await fetch(`${BASE_URL}/api/ai-studio/apply-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        productId: 'prod_test_A_1',
        imageUrl: genData.imageUrl,
        generationId: genData.generationId
      })
    });
    assert(applyRes.status === 200, 'Applied image to Inventory successfully (200)');
    const appliedData = await applyRes.json();

    // Verify Product Integrity invariants
    assert(appliedData.product.imageUrl === genData.imageUrl, 'Product imageUrl updated to new studio photo');
    assert(appliedData.product.name === 'Organic Cotton Polo', 'Product name was strictly preserved');
    assert(appliedData.product.price === 25000, 'Product price was strictly preserved');
    assert(appliedData.product.costPrice === 12000, 'Product costPrice was strictly preserved');
    assert(appliedData.product.sku === 'POLO-COTTON-001', 'Product SKU was strictly preserved');
    assert(appliedData.product.variants.length === 1, 'Product variants preserved');
    assert(appliedData.product.variants[0].stock === 20, 'Product stock preserved');
  } catch (e: any) {
    console.error('Error in Test Group 7:', e);
    failed++;
  }

  // TEST 8: AI Studio Marketing Copy Generation
  console.log('\n--- Test Group 8: AI Studio Marketing Copy Tools ---');
  try {
    const copyRes = await fetch(`${BASE_URL}/api/ai-studio/generate-copy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        productId: 'prod_test_A_1',
        copyType: 'facebook_promo',
        customInstructions: 'Highlight weekend special delivery'
      })
    });
    assert(copyRes.status === 200, 'Generated promotional copy successfully (200)');
    const copyData = await copyRes.json();
    assert(copyData.success === true, 'Copy generation success reported');
    assert(typeof copyData.generatedText === 'string' && copyData.generatedText.length > 20, 'Generated copy has substantial content');
    // Factual grounding check: contains product name or price
    const text = copyData.generatedText;
    const containsNameOrPrice = text.includes('Organic Cotton Polo') || text.includes('25,000') || text.includes('25000');
    assert(containsNameOrPrice, 'Generated copy is factually grounded with product name or price');
  } catch (e: any) {
    console.error('Error in Test Group 8:', e);
    failed++;
  }

  // TEST 9: AI Studio History
  console.log('\n--- Test Group 9: AI Studio Generation History ---');
  try {
    const historyRes = await fetch(`${BASE_URL}/api/ai-studio/history`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(historyRes.status === 200, 'Fetched studio history successfully (200)');
    const historyData = await historyRes.json();
    assert(Array.isArray(historyData) && historyData.length >= 2, 'History contains generated image and copy records');
    assert(historyData[0].merchantId === merchantA_Id, 'History belongs strictly to Merchant A');
  } catch (e: any) {
    console.error('Error in Test Group 9:', e);
    failed++;
  }

  // TEST 10: CSV Export Endpoint
  console.log('\n--- Test Group 10: Accounting CSV Export ---');
  try {
    const csvRes = await fetch(`${BASE_URL}/api/accounting/export`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(csvRes.status === 200, 'CSV export endpoint returned 200 OK');
    assert((csvRes.headers.get('content-type') || '').includes('text/csv'), 'Returned text/csv content type');
    const csvText = await csvRes.text();
    assert(csvText.includes('Entry ID,Date,Type,Category,Amount (MMK)'), 'CSV contains correct accounting headers');
  } catch (e: any) {
    console.error('Error in Test Group 10:', e);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
