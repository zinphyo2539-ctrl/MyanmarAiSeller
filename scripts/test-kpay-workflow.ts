import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('--- Starting ShopSone KPay Workflow & Security Verification Suite ---');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, failureDetail?: any) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (failureDetail) console.error('  Detail:', failureDetail);
      process.exitCode = 1;
    }
  }

  // 1. Get or Create Merchant Tokens
  console.log('\n--- Test Phase 1: Authentication & Multi-Tenant Setup ---');
  // Merchant A login
  const resA = await fetch(`${BASE_URL}/api/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId: 'merchant_001' })
  });
  const dataA = await resA.json();
  const tokenA = dataA.token;
  assert(Boolean(tokenA), 'Merchant A logged in successfully');

  // Merchant B login
  const resB = await fetch(`${BASE_URL}/api/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId: 'merchant_002' })
  });
  const dataB = await resB.json();
  const tokenB = dataB.token;
  assert(Boolean(tokenB), 'Merchant B logged in successfully');

  // 2. Merchant A Configures KPay Payment Settings
  console.log('\n--- Test Phase 2: Merchant Payment Configuration ---');
  const paymentSettingsPayloadA = {
    kpayAccountName: 'Daw Thida Win',
    kpayPhone: '09123456789',
    kpayQrUrl: 'https://images.unsplash.com/photo-1595079672139-545c0255a18a?auto=format&fit=crop&q=80&w=600',
    paymentRules: '၁။ ငွေမလွှဲမီ အကောင့်အမည်ကို သေချာစစ်ဆေးပါ။\n၂။ စလစ်အပြည့်အစုံတင်ပေးပါ။',
    customInstructions: 'မနက် ၉ နာရီမှ ည ၆ နာရီအတွင်း စစ်ဆေးပေးပါမည်။'
  };

  const updateResA = await fetch(`${BASE_URL}/api/merchant/payment-settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify(paymentSettingsPayloadA)
  });
  const updateDataA = await updateResA.json();
  assert(updateResA.status === 200, 'Merchant A updated payment settings successfully', updateDataA);
  assert(updateDataA.paymentSettings?.kpayAccountName === 'Daw Thida Win', 'Merchant A settings saved account name');

  // Verify phone validation rejects invalid format
  const invalidPhoneRes = await fetch(`${BASE_URL}/api/merchant/payment-settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      ...paymentSettingsPayloadA,
      kpayPhone: '12345'
    })
  });
  assert(invalidPhoneRes.status === 400, 'Rejects invalid Myanmar phone number format');

  // Multi-tenant check: Merchant B reading their own settings must NOT see Merchant A's details
  const getResB = await fetch(`${BASE_URL}/api/merchant/payment-settings`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const dataGetB = await getResB.json();
  assert(dataGetB.kpayAccountName !== 'Daw Thida Win', 'Merchant B cannot read Merchant A private payment settings');

  // 3. Public Storefront Resolution
  console.log('\n--- Test Phase 3: Public Storefront Payment Settings Verification ---');
  // Read store for Merchant A's slug (yangon-style or store slug)
  const storeRes = await fetch(`${BASE_URL}/api/public/store/yangon-style`);
  const storeData = await storeRes.json();
  assert(storeRes.status === 200, 'Public storefront loads store data');
  assert(
    storeData.store?.paymentSettings?.kpayAccountName === 'Daw Thida Win',
    'Storefront returns Merchant A verified KPay account name'
  );
  assert(
    storeData.store?.paymentSettings?.kpayPhone === '09123456789',
    'Storefront returns Merchant A verified KPay phone'
  );

  // 4. Guest Customer Order Placement
  console.log('\n--- Test Phase 4: Guest Customer Order & Support Code ---');
  const orderRes = await fetch(`${BASE_URL}/api/public/store/yangon-style/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Ko Kyaw Zin',
      customerPhone: '09798765432',
      shippingAddress: 'No 45, Bogyoke Road, Pabedan, Yangon',
      paymentMethod: 'KBZPay',
      items: [
        {
          productId: (storeData.products?.find((p: any) => p.variants?.some((v: any) => v.stock > 0)) || storeData.products[0])?.id || 'prod_1',
          variantId: (storeData.products?.find((p: any) => p.variants?.some((v: any) => v.stock > 0))?.variants?.find((v: any) => v.stock > 0) || storeData.products[0]?.variants?.[0])?.id || 'v_1',
          name: (storeData.products?.find((p: any) => p.variants?.some((v: any) => v.stock > 0)) || storeData.products[0])?.name || 'Silk Scarf',
          variant: 'Standard',
          price: 25000,
          qty: 1
        }
      ]
    })
  });
  const orderData = await orderRes.json();
  assert(orderRes.status === 201, 'Guest order placed successfully', orderData);
  const createdOrder = orderData.order;
  assert(Boolean(createdOrder?.id), 'Order has valid ID');
  assert(Boolean(createdOrder?.supportCode), 'Order returned secure support code to customer');
  assert(createdOrder.paymentStatus === 'PENDING', 'Initial payment status is strictly PENDING');

  // 5. Payment Slip Submission (Guest with Support Code)
  console.log('\n--- Test Phase 5: Payment Slip Submission & Strict Non-Auto Approval ---');
  // Attempt upload without authorization code should be 401
  const fakeFormData = new FormData();
  fakeFormData.append('slipImage', new Blob([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00])], { type: 'image/jpeg' }), 'slip.jpg');
  
  const unauthRes = await fetch(`${BASE_URL}/api/public/orders/${createdOrder.id}/payment-slip`, {
    method: 'POST',
    body: fakeFormData
  });
  assert(unauthRes.status === 401, 'Unauthenticated slip upload rejected with HTTP 401');

  // Attempt upload of fake JPEG with text contents (magic byte mismatch)
  const magicByteMismatchForm = new FormData();
  magicByteMismatchForm.append('slipImage', new Blob([Buffer.from('Not a real image file content')], { type: 'image/jpeg' }), 'fake.jpg');
  magicByteMismatchForm.append('supportCode', createdOrder.supportCode);
  const mismatchRes = await fetch(`${BASE_URL}/api/public/orders/${createdOrder.id}/payment-slip`, {
    method: 'POST',
    body: magicByteMismatchForm
  });
  assert(mismatchRes.status === 400, 'Rejects image with mismatched magic bytes');

  // Attempt upload of disallowed file extension
  const badExtForm = new FormData();
  badExtForm.append('slipImage', new Blob([Buffer.from('alert(1)')], { type: 'application/javascript' }), 'script.js');
  badExtForm.append('supportCode', createdOrder.supportCode);
  const badExtRes = await fetch(`${BASE_URL}/api/public/orders/${createdOrder.id}/payment-slip`, {
    method: 'POST',
    body: badExtForm
  });
  assert(badExtRes.status === 500 || badExtRes.status === 400, 'Rejects disallowed mime type and file extension');

  // Authorized upload with support code
  const authFormData = new FormData();
  // Valid JPEG header buffer
  const jpegMagicBytes = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08
  ]);
  authFormData.append('slipImage', new Blob([jpegMagicBytes], { type: 'image/jpeg' }), 'customer_slip.jpg');
  authFormData.append('supportCode', createdOrder.supportCode);
  authFormData.append('transactionRef', 'KBZ-9824719284');

  const slipRes = await fetch(`${BASE_URL}/api/public/orders/${createdOrder.id}/payment-slip`, {
    method: 'POST',
    body: authFormData
  });
  const slipData = await slipRes.json();
  assert(slipRes.status === 200, 'Authorized customer uploaded payment slip', slipData);
  assert(slipData.paymentStatus === 'SLIP_SUBMITTED', 'Payment status is SLIP_SUBMITTED (NOT auto-confirmed!)');

  // Verify status endpoint returns updated information
  const statusRes = await fetch(
    `${BASE_URL}/api/public/orders/${createdOrder.id}/payment-status?code=${createdOrder.supportCode}`
  );
  const statusData = await statusRes.json();
  assert(statusData.paymentStatus === 'SLIP_SUBMITTED', 'Guest status query returns SLIP_SUBMITTED');
  assert(statusData.transactionRef === 'KBZ-9824719284', 'Transaction reference recorded accurately');

  // 6. Merchant Inspection & Payment Rejection with Mandatory Reason
  console.log('\n--- Test Phase 6: Merchant Payment Rejection & Mandatory Reason ---');
  // Rejection without reason must fail
  const emptyRejectRes = await fetch(`${BASE_URL}/api/orders/${createdOrder.id}/reject-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({ reason: '   ' })
  });
  assert(emptyRejectRes.status === 400, 'Payment rejection without reason is rejected with HTTP 400');

  // Valid rejection with explanation
  const rejectRes = await fetch(`${BASE_URL}/api/orders/${createdOrder.id}/reject-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({ reason: 'ငွေလက်ခံ မရရှိသေးပါ။ KBZPay အကောင့်ထဲသို့ ငွေမဝင်သေးပါရှင်။' })
  });
  const rejectData = await rejectRes.json();
  assert(rejectRes.status === 200, 'Merchant successfully rejected invalid payment', rejectData);
  assert(rejectData.order.paymentStatus === 'REJECTED', 'Order status transitioned to REJECTED');
  assert(Boolean(rejectData.order.rejectionReason), 'Rejection reason is stored in order model');

  // 7. Customer Resubmission After Rejection
  console.log('\n--- Test Phase 7: Customer Resubmission After Rejection ---');
  const resubmitFormData = new FormData();
  resubmitFormData.append('slipImage', new Blob([jpegMagicBytes], { type: 'image/jpeg' }), 'new_corrected_slip.jpg');
  resubmitFormData.append('supportCode', createdOrder.supportCode);
  resubmitFormData.append('transactionRef', 'KBZ-CORRECTED-999');

  const resubmitRes = await fetch(`${BASE_URL}/api/public/orders/${createdOrder.id}/payment-slip`, {
    method: 'POST',
    body: resubmitFormData
  });
  const resubmitData = await resubmitRes.json();
  assert(resubmitRes.status === 200, 'Customer successfully resubmitted corrected slip', resubmitData);
  assert(resubmitData.paymentStatus === 'SLIP_SUBMITTED', 'Status returned to SLIP_SUBMITTED after resubmission');

  // 8. Merchant Final Approval & Confirmation Invariant
  console.log('\n--- Test Phase 8: Merchant Approval & Immutability Invariant ---');
  const confirmRes = await fetch(`${BASE_URL}/api/orders/${createdOrder.id}/confirm-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    }
  });
  const confirmData = await confirmRes.json();
  assert(confirmRes.status === 200, 'Authorized human merchant confirmed payment', confirmData);
  assert(confirmData.order.paymentStatus === 'CONFIRMED', 'Payment status is strictly CONFIRMED');

  // Once CONFIRMED, customer cannot overwrite slip
  const overwriteFormData = new FormData();
  overwriteFormData.append('slipImage', new Blob([jpegMagicBytes], { type: 'image/jpeg' }), 'overwrite_attempt.jpg');
  overwriteFormData.append('supportCode', createdOrder.supportCode);

  const overwriteRes = await fetch(`${BASE_URL}/api/public/orders/${createdOrder.id}/payment-slip`, {
    method: 'POST',
    body: overwriteFormData
  });
  assert(overwriteRes.status === 400, 'Replacing slip for already CONFIRMED order is blocked with HTTP 400');

  console.log(`\n========================================`);
  console.log(`Verification Complete: ${passedTests}/${totalTests} tests passed`);
  console.log(`========================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
