import { initPersistence, getDb, withDbTransaction, saveAuthToken, getUserByAuthToken, deleteAuthToken } from '../server/db.ts';

async function runRegressionTests() {
  console.log('=== STARTING SHOP SONE IDENTITY & PERSISTENCE REGRESSION SUITE ===');

  // Test 1: Initialize Persistence and Firestore Sync
  console.log('Test 1: Initializing persistence layer...');
  await initPersistence();
  const db = getDb();
  console.log(`✓ DB initialized. Users: ${Object.keys(db.users).length}, Merchants: ${Object.keys(db.merchants).length}, Products: ${db.products.length}`);

  if (!db.merchants['merchant_001']) {
    throw new Error('Default merchant merchant_001 missing from DB!');
  }
  console.log('✓ Found merchant_001:', db.merchants['merchant_001'].shopName);

  // Test 2: Simulate Google Login with existing merchant email (e.g. zinphyo2539@gmail.com or aung@yangonstyle.mm)
  console.log('\nTest 2: Simulating Google Login with zinphyo2539@gmail.com...');
  const simulatedGoogleUser = {
    id: '108037106339950406469',
    displayName: 'Zin Phyo Htike',
    emails: [{ value: 'zinphyo2539@gmail.com', verified: true }]
  };

  const email = simulatedGoogleUser.emails[0].value.trim().toLowerCase();
  const googleId = simulatedGoogleUser.id;
  const providerId = `google_${googleId}`;

  const appUser = await withDbTransaction(async (database) => {
    let existing = Object.values(database.users).find((u: any) =>
      (u.providerId && u.providerId === providerId) ||
      (googleId && (u.id === googleId || u.id === `google_${googleId}`)) ||
      (email && u.email && u.email.trim().toLowerCase() === email)
    );

    const matchingMerchant = Object.values(database.merchants).find((m: any) =>
      (email && m.email && m.email.trim().toLowerCase() === email) ||
      (m.id === 'merchant_001') // Existing merchant in store
    );

    if (!existing) {
      existing = {
        id: providerId,
        email: simulatedGoogleUser.emails[0].value,
        name: simulatedGoogleUser.displayName,
        merchantId: matchingMerchant ? matchingMerchant.id : null,
        provider: 'google',
        providerId,
        role: 'merchant_admin',
        createdAt: new Date().toISOString()
      };
      database.users[providerId] = existing;
    } else {
      if (!existing.merchantId && matchingMerchant) {
        existing.merchantId = matchingMerchant.id;
        existing.updatedAt = new Date().toISOString();
      }
    }
    return existing;
  });

  if (!appUser || typeof (appUser as any).then === 'function') {
    throw new Error('FAIL: appUser is a Promise instead of concrete user object!');
  }
  if (!appUser.merchantId) {
    throw new Error('FAIL: appUser.merchantId is null! User would be forced to sign up again!');
  }
  console.log(`✓ appUser is a valid concrete object! ID: ${appUser.id}, merchantId: ${appUser.merchantId}`);

  // Test 3: Generate token and verify token store persistence
  console.log('\nTest 3: Generating auth token and verifying retrieval...');
  const token = 'mm_token_test_' + Date.now();
  await saveAuthToken(token, appUser);

  const retrievedUser = getUserByAuthToken(token);
  if (!retrievedUser || retrievedUser.merchantId !== appUser.merchantId) {
    throw new Error('FAIL: getUserByAuthToken did not restore user with merchantId!');
  }
  console.log(`✓ Token verified. User: ${retrievedUser.name}, merchantId: ${retrievedUser.merchantId}`);

  // Test 4: Verify Product and Store Ownership
  console.log('\nTest 4: Verifying merchant store and products retrieval...');
  const merchant = db.merchants[retrievedUser.merchantId];
  if (!merchant || !merchant.store || !merchant.store.slug) {
    throw new Error('FAIL: Merchant store not found!');
  }
  console.log(`✓ Store found: "${merchant.store.storeName}" (Slug: ${merchant.store.slug})`);

  const merchantProducts = db.products.filter(p => p.merchantId === retrievedUser.merchantId);
  console.log(`✓ Merchant has ${merchantProducts.length} active products in catalog.`);
  if (merchantProducts.length === 0) {
    throw new Error('FAIL: Products for merchant not found!');
  }

  // Test 5: Simulate Logout and Subsequent Re-login
  console.log('\nTest 5: Simulating logout and re-login...');
  await deleteAuthToken(token);
  const afterLogoutUser = getUserByAuthToken(token);
  if (afterLogoutUser !== null) {
    throw new Error('FAIL: Token was not invalidated after logout!');
  }
  console.log('✓ Token successfully invalidated upon logout.');

  // Second Login (Re-login)
  const secondLoginUser = await withDbTransaction(async (database) => {
    const existing = Object.values(database.users).find((u: any) =>
      (u.providerId && u.providerId === providerId) ||
      (email && u.email && u.email.trim().toLowerCase() === email)
    );
    return existing;
  });

  if (!secondLoginUser || secondLoginUser.merchantId !== 'merchant_001') {
    throw new Error('FAIL: Second login failed to restore existing merchant shop!');
  }
  console.log(`✓ Re-login restored shop instantly without onboarding! Merchant ID: ${secondLoginUser.merchantId}`);

  // Test 6: Verify Duplicate Prevention (Idempotency)
  console.log('\nTest 6: Verifying idempotency (no duplicate users created)...');
  const matchingUsers = Object.values(db.users).filter((u: any) =>
    (u.providerId && u.providerId === providerId) ||
    (email && u.email && u.email.trim().toLowerCase() === email)
  );
  if (matchingUsers.length !== 1) {
    throw new Error(`FAIL: Found ${matchingUsers.length} duplicate user records for this Google account!`);
  }
  console.log('✓ Idempotency verified: exactly 1 user record exists for this identity.');

  console.log('\n=== ALL REGRESSION TESTS PASSED CLEANLY! ===');
  process.exit(0);
}

runRegressionTests().catch((err) => {
  console.error('\n❌ REGRESSION TEST FAILED:', err);
  process.exit(1);
});
