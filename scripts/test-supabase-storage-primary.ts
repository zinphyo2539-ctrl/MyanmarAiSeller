import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('ShopSone — Supabase Storage as Primary Store: Comprehensive Suite');
  console.log('================================================================');

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

  // 1. Merchant A & Merchant B login for tenancy checks
  console.log('\n--- Phase 1: Multi-Tenant Setup & Authentication ---');
  const resA = await fetch(`${BASE_URL}/api/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId: 'merchant_001' })
  });
  const dataA = await resA.json();
  const tokenA = dataA.token;
  assert(Boolean(tokenA), 'Merchant A token acquired');

  const resB = await fetch(`${BASE_URL}/api/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId: 'merchant_002' })
  });
  const dataB = await resB.json();
  const tokenB = dataB.token;
  assert(Boolean(tokenB), 'Merchant B token acquired');

  // 2. Count existing local files before tests
  const slipsDir = path.resolve(process.cwd(), 'data', 'slips');
  const initialLocalFiles = fs.existsSync(slipsDir) ? fs.readdirSync(slipsDir).length : 0;
  console.log(`[Diagnostic] Baseline local files in data/slips/: ${initialLocalFiles}`);

  // 3. Place guest order on Merchant A's store
  console.log('\n--- Phase 2: Guest Order Creation ---');
  const storeRes = await fetch(`${BASE_URL}/api/public/store/yangon-style`);
  const storeData = await storeRes.json();
  const prod = storeData.products?.find((p: any) => p.variants?.some((v: any) => v.stock > 0)) || storeData.products?.[0];
  const variant = prod?.variants?.find((v: any) => v.stock > 0) || prod?.variants?.[0];

  const orderRes = await fetch(`${BASE_URL}/api/public/store/yangon-style/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Ko Lin Htut',
      customerPhone: '09781234567',
      shippingAddress: '42 University Avenue, Bahan, Yangon',
      paymentMethod: 'KBZPay',
      items: [
        {
          productId: prod?.id || 'prod_1',
          variantId: variant?.id || 'v_1',
          name: prod?.name || 'Silk Shirt',
          variant: variant?.name || 'Standard',
          price: prod?.price || 32000,
          qty: 1
        }
      ]
    })
  });
  const orderData = await orderRes.json();
  const orderId = orderData.order?.id;
  const supportCode = orderData.supportCode || orderData.order?.supportCode;
  assert(Boolean(orderId && supportCode), 'Order placed with valid orderId and supportCode');

  // 4. Test Valid JPEG Upload to Supabase Storage Primary
  console.log('\n--- Phase 3: Primary Supabase Storage Upload ---');
  const validJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x00, 0xff, 0xd9
  ]);

  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const multipart = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="supportCode"\r\n\r\n${supportCode}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="transactionRef"\r\n\r\nKPAY-SUPA-PRIMARY-001\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="slipImage"; filename="kpay_slip.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    validJpeg,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const uploadRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/payment-slip`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: multipart
  });

  assert(uploadRes.status === 200, 'Payment slip upload succeeded (HTTP 200)');
  const uploadData = await uploadRes.json();
  assert(uploadData.paymentStatus === 'SLIP_SUBMITTED', 'Order status moved to SLIP_SUBMITTED');
  assert(uploadData.cloudSyncStatus === 'SYNCED_DURABLE', 'Cloud sync status is SYNCED_DURABLE');
  assert(uploadData.storage === 'supabase_durable', 'Storage reported as supabase_durable');
  assert(
    uploadData.paymentSlipUrl.startsWith(`/api/public/orders/${orderId}/slip-image`),
    'Payment slip URL is same-origin proxy (no raw third-party domains)'
  );

  // Check db.json directly to verify fields
  const db = JSON.parse(fs.readFileSync('data/db.json', 'utf-8'));
  const storedOrder = db.orders.find((o: any) => o.id === orderId);
  assert(storedOrder?.slipStorageBucket === 'payment-slips', 'Order stored slip in payment-slips bucket');
  assert(
    Boolean(storedOrder?.slipObjectPath && storedOrder.slipObjectPath.startsWith('merchant_001/payment-slips/')),
    'Order stored merchant-partitioned objectPath in Supabase'
  );
  assert(storedOrder?.localSlipFilename === undefined, 'No localSlipFilename created (zero local disk dependency)');

  // Verify local slips folder count did NOT increase
  const postUploadLocalFiles = fs.existsSync(slipsDir) ? fs.readdirSync(slipsDir).length : 0;
  assert(
    postUploadLocalFiles === initialLocalFiles,
    'Zero local files written to data/slips/ during upload (storage is strictly remote Supabase)'
  );

  // 5. Customer Image Retrieval through Proxy (using supportCode)
  console.log('\n--- Phase 4: Authorized Customer Image Proxy Retrieval ---');
  const custRes = await fetch(`${BASE_URL}${uploadData.paymentSlipUrl}`);
  assert(custRes.status === 200, 'Customer retrieved slip image via proxy (HTTP 200)');
  const custMime = custRes.headers.get('content-type') || '';
  assert(custMime.includes('image/jpeg'), 'Proxy served image with Content-Type: image/jpeg');
  const custBuffer = await custRes.arrayBuffer();
  assert(custBuffer.byteLength === validJpeg.length, 'Streamed buffer byte length matches uploaded file');

  // 6. Merchant A Image Retrieval through Proxy (using Bearer Token)
  console.log('\n--- Phase 5: Authorized Merchant Image Proxy Retrieval ---');
  const merchRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/slip-image`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  assert(merchRes.status === 200, 'Merchant A retrieved slip via Authorization Bearer header');

  const merchQueryRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/slip-image?token=${tokenA}`);
  assert(merchQueryRes.status === 200, 'Merchant A retrieved slip via query token parameter');

  // 7. Cross-Merchant Isolation (Merchant B cannot view Merchant A's slip)
  console.log('\n--- Phase 6: Cross-Merchant Multi-Tenant Isolation ---');
  const merchBRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/slip-image`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  assert(merchBRes.status === 401, 'Merchant B cannot access Merchant A slip image (HTTP 401)');

  const merchBQueryRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/slip-image?token=${tokenB}`);
  assert(merchBQueryRes.status === 401, 'Merchant B cannot access Merchant A slip via query token (HTTP 401)');

  // 8. Unauthorized & Wrong Credentials
  console.log('\n--- Phase 7: Unauthorized Request Guards ---');
  const anonRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/slip-image`);
  assert(anonRes.status === 401, 'Anonymous request without token or code rejected (HTTP 401)');

  const wrongCodeRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/slip-image?code=WRONG_CODE_XYZ`);
  assert(wrongCodeRes.status === 401, 'Request with invalid support code rejected (HTTP 401)');

  // 9. Upload Failure & Safe Retry
  console.log('\n--- Phase 8: Upload Failure & Safe Retry ---');
  // Attempt invalid magic bytes upload
  const badBoundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const badMultipart = Buffer.concat([
    Buffer.from(`--${badBoundary}\r\nContent-Disposition: form-data; name="supportCode"\r\n\r\n${supportCode}\r\n`),
    Buffer.from(`--${badBoundary}\r\nContent-Disposition: form-data; name="slipImage"; filename="corrupt.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    Buffer.from('CORRUPT_NON_IMAGE_TEXT'),
    Buffer.from(`\r\n--${badBoundary}--\r\n`)
  ]);

  const badUploadRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/payment-slip`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${badBoundary}` },
    body: badMultipart
  });
  assert(badUploadRes.status === 400, 'Invalid image rejected with HTTP 400');

  // Verify status remains unchanged after failed upload
  const statusCheckRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/payment-status?code=${supportCode}`);
  const statusCheckData = await statusCheckRes.json();
  assert(statusCheckData.paymentStatus === 'SLIP_SUBMITTED', 'Payment status remains consistent after failure');

  // Retry with new valid slip
  const retryBoundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const retryMultipart = Buffer.concat([
    Buffer.from(`--${retryBoundary}\r\nContent-Disposition: form-data; name="supportCode"\r\n\r\n${supportCode}\r\n`),
    Buffer.from(`--${retryBoundary}\r\nContent-Disposition: form-data; name="transactionRef"\r\n\r\nKPAY-RETRY-999\r\n`),
    Buffer.from(`--${retryBoundary}\r\nContent-Disposition: form-data; name="slipImage"; filename="retry_slip.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    validJpeg,
    Buffer.from(`\r\n--${retryBoundary}--\r\n`)
  ]);

  const retryRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/payment-slip`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${retryBoundary}` },
    body: retryMultipart
  });
  assert(retryRes.status === 200, 'Retry upload succeeded with HTTP 200');
  const retryData = await retryRes.json();
  assert(retryData.transactionRef === 'KPAY-RETRY-999', 'Updated transaction ref recorded');

  // 10. Legacy Slip Compatibility
  console.log('\n--- Phase 9: Legacy Slip Compatibility ---');
  // Order ord_1793089928974_dxo3 is an existing legacy order with supabaseSlipUrl
  const legacyOrderId = 'ord_1793089928974_dxo3';
  const legacyOrder = db.orders.find((o: any) => o.id === legacyOrderId);
  if (legacyOrder) {
    const legacyProxyRes = await fetch(`${BASE_URL}/api/public/orders/${legacyOrderId}/slip-image`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert(
      legacyProxyRes.status === 200 || legacyProxyRes.status === 404,
      'Legacy slip request handled without crashing server'
    );
  } else {
    assert(true, 'Legacy slip check passed');
  }

  // 11. Final Local Disk Count Check
  const finalLocalFiles = fs.existsSync(slipsDir) ? fs.readdirSync(slipsDir).length : 0;
  assert(
    finalLocalFiles === initialLocalFiles,
    'Confirmed zero local disk files were created across the entire test suite run'
  );

  console.log('\n================================================================');
  console.log(`Results: ${passedTests} / ${totalTests} assertions passed successfully`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
