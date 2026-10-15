
import assert from 'assert';

async function runGapVerification() {
  console.log('=== RUNNING EVIDENCE GAP VERIFICATION ===');
  const BASE_URL = 'http://localhost:3000';
  
  async function fetchApi(path: string, method: string = 'GET', body: any = null, token: string = '') {
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json().catch(() => null);
    return { status: response.status, data };
  }

  // Get valid token
  const { data: loginData } = await fetchApi('/api/auth/dev-login', 'POST');
  const token = loginData?.token;
  if (!token) throw new Error('Failed to get auth token');

  // 1. PAYMENT CONFIRMATION
  console.log('[GAP_01] Payment Confirmation...');
  const { data: orders } = await fetchApi('/api/orders', 'GET', null, token);
  
  if (orders && orders.length > 0) {
    const orderId = orders[0].id;
    // Attempt confirmation (should be 400 if already confirmed, or 200)
    const res = await fetchApi(`/api/orders/${orderId}/confirm-payment`, 'POST', {}, token);
    console.log(`   Result: Status ${res.status}, Data: ${JSON.stringify(res.data)}`);
    assert.ok(res.status === 200 || res.status === 400, 'Confirmation should return 200 or 400');
  } else {
    console.log('   NOT RUN: No orders found.');
  }

  // 2. AI ERROR HANDLING
  console.log('[GAP_02] AI Error Handling...');
  const resAi = await fetchApi('/api/ai/suggestions', 'POST', { prompt: 'hello' }, 'invalid_token');
  console.log(`   Result: Status ${resAi.status}`);
  assert.strictEqual(resAi.status, 401);

  // 3. INVENTORY CONCURRENCY - NOT RUN
  console.log('[GAP_03] Inventory Concurrency: NOT RUN (Requires specialized fixtures)');

  // 4. TENANT ISOLATION - NOT RUN (Only one merchant in data)
  console.log('[GAP_04] Tenant Isolation: NOT RUN (No cross-tenant data available)');

  console.log('=== VERIFICATION COMPLETE ===');
}

runGapVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
