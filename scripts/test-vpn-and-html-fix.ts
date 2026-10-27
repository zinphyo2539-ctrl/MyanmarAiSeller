import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('--- Starting ShopSone Payment Slip Upload: VPN & HTML Error Handling Verification ---');
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

  // 1. Merchant login to obtain token
  const resLogin = await fetch(`${BASE_URL}/api/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId: 'merchant_001' })
  });
  const dataLogin = await resLogin.json();
  const token = dataLogin.token;
  assert(Boolean(token), 'Merchant logged in to obtain token');

  // 2. Fetch public storefront to get valid product
  const storeRes = await fetch(`${BASE_URL}/api/public/store/yangon-style`);
  const storeData = await storeRes.json();
  const prod = storeData.products?.find((p: any) => p.variants?.some((v: any) => v.stock > 0)) || storeData.products?.[0];
  const variant = prod?.variants?.find((v: any) => v.stock > 0) || prod?.variants?.[0];

  const orderPayload = {
    customerName: 'Ma Hnin Nwe',
    customerPhone: '09777123456',
    shippingAddress: 'No. 54, Inya Road, Kamayut, Yangon',
    paymentMethod: 'KBZPay',
    items: [
      {
        productId: prod?.id || 'prod_1',
        variantId: variant?.id || 'v_1',
        name: prod?.name || 'Standard Product',
        variant: variant?.name || 'Standard',
        price: prod?.price || 25000,
        qty: 1
      }
    ]
  };

  const orderRes = await fetch(`${BASE_URL}/api/public/store/yangon-style/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  });
  const orderData = await orderRes.json();
  const createdOrder = orderData.order;
  const orderId = createdOrder?.id;
  const supportCode = orderData.supportCode || createdOrder?.supportCode;
  assert(Boolean(orderId && supportCode), 'Guest order placed with orderId and supportCode');

  // 3. Test Multer Safe Handler: Oversized File (6 MiB)
  console.log('\n--- Test: Oversized File Upload (Multer Error Handling) ---');
  const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024, 0xff); // 6 MiB JPEG fake
  oversizedBuffer[0] = 0xff;
  oversizedBuffer[1] = 0xd8;
  oversizedBuffer[2] = 0xff;

  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const multipartOversized = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="supportCode"\r\n\r\n${supportCode}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="slipImage"; filename="oversized.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    oversizedBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const overRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/payment-slip`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: multipartOversized
  });

  const overContentType = overRes.headers.get('content-type') || '';
  assert(overContentType.includes('application/json'), 'Multer error response returns Content-Type: application/json (NOT HTML)');
  assert(overRes.status === 400, 'Multer error returns HTTP 400 status');
  const overData = await overRes.json();
  assert(Boolean(overData.error && overData.error.includes('5MB')), 'Returns localized 5MB file limit error message');

  // 4. Test Valid JPEG Upload & Local Caching
  console.log('\n--- Test: Valid Slip Upload & Resilient Disk Storage ---');
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

  const boundaryValid = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const multipartValid = Buffer.concat([
    Buffer.from(`--${boundaryValid}\r\nContent-Disposition: form-data; name="supportCode"\r\n\r\n${supportCode}\r\n`),
    Buffer.from(`--${boundaryValid}\r\nContent-Disposition: form-data; name="transactionRef"\r\n\r\nKPAY9876543210\r\n`),
    Buffer.from(`--${boundaryValid}\r\nContent-Disposition: form-data; name="slipImage"; filename="test_slip.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    validJpeg,
    Buffer.from(`\r\n--${boundaryValid}--\r\n`)
  ]);

  const uploadRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/payment-slip`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundaryValid}` },
    body: multipartValid
  });

  assert(uploadRes.status === 200, 'Valid slip upload returned HTTP 200');
  const uploadData = await uploadRes.json();
  assert(uploadData.paymentStatus === 'SLIP_SUBMITTED', 'Payment status is SLIP_SUBMITTED (never auto-confirmed!)');
  assert(uploadData.paymentSlipUrl.startsWith(`/api/public/orders/${orderId}/slip-image`), 'Payment slip URL is proxied backend endpoint (NOT raw Supabase domain)');
  assert(uploadData.transactionRef === 'KPAY9876543210', 'Transaction reference recorded accurately');

  // 5. Test Secure Image Proxy Serving (Customer Access with supportCode)
  console.log('\n--- Test: Customer Proxy Image Serving via Support Code ---');
  const customerProxyRes = await fetch(`${BASE_URL}${uploadData.paymentSlipUrl}`);
  assert(customerProxyRes.status === 200, 'Customer retrieved slip image through proxy with support code (HTTP 200)');
  const customerMime = customerProxyRes.headers.get('content-type') || '';
  assert(customerMime.includes('image/jpeg'), 'Proxy served image with Content-Type: image/jpeg');
  const imgArray = await customerProxyRes.arrayBuffer();
  assert(imgArray.byteLength > 50, 'Proxy served non-empty image buffer');

  // 6. Test Merchant Proxy Image Serving via Bearer Token
  console.log('\n--- Test: Merchant Proxy Image Serving via Token ---');
  const merchantProxyRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/slip-image?token=${token}`);
  assert(merchantProxyRes.status === 200, 'Merchant retrieved slip image through proxy with token (HTTP 200)');
  const merchantMime = merchantProxyRes.headers.get('content-type') || '';
  assert(merchantMime.includes('image/jpeg'), 'Proxy served image to merchant with Content-Type: image/jpeg');

  // 7. Test Unauthorized Proxy Access (Blocked with HTTP 401)
  console.log('\n--- Test: Unauthorized Proxy Access Guard ---');
  const unauthProxyRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/slip-image`);
  assert(unauthProxyRes.status === 401, 'Unauthenticated request to slip image proxy rejected with HTTP 401');
  const unauthData = await unauthProxyRes.json();
  assert(Boolean(unauthData.error), 'Unauthenticated request returns clean JSON error');

  // 8. Test Wrong Support Code (Blocked with HTTP 401)
  const wrongCodeRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/slip-image?code=WRONG_CODE_999`);
  assert(wrongCodeRes.status === 401, 'Request with wrong support code rejected with HTTP 401');

  // 9. Verify Order Payment Status Endpoint with supportCode query param
  console.log('\n--- Test: Payment Status Query Parameter Compatibility ---');
  const statusRes = await fetch(`${BASE_URL}/api/public/orders/${orderId}/payment-status?supportCode=${supportCode}`);
  assert(statusRes.status === 200, 'Payment status query supports supportCode query param');
  const statusData = await statusRes.json();
  assert(statusData.paymentStatus === 'SLIP_SUBMITTED', 'Status query returns SLIP_SUBMITTED');

  console.log(`\n========================================`);
  console.log(`All Tests Completed: ${passedTests}/${totalTests} passed`);
  console.log(`========================================`);
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
