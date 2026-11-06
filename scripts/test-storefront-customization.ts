import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('--- STARTING SHOPSONE STOREFRONT CUSTOMIZATION TEST SUITE ---');

  const baseUrl = 'http://localhost:3000';

  // 1. Get or create a merchant token for testing
  let token = '';
  const tokensFile = path.resolve(process.cwd(), 'data/active-tokens.json');
  if (fs.existsSync(tokensFile)) {
    try {
      const tokensData = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
      const keys = Object.keys(tokensData);
      if (keys.length > 0) {
        token = keys[0];
        console.log('✓ Found active merchant session token:', token.substring(0, 10) + '...');
      }
    } catch {}
  }

  // If no token found, attempt local test merchant login
  if (!token) {
    console.log('Attempting login to acquire merchant test token...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@yangonstyle.com', password: 'password123' })
    });
    if (loginRes.ok) {
      const data = await loginRes.json();
      token = data.token;
      console.log('✓ Successfully authenticated test merchant. Token:', token.substring(0, 10) + '...');
    } else {
      console.warn('⚠️ Login failed, test will run unauthenticated diagnostics where possible.');
    }
  }

  if (!token) {
    throw new Error('Unable to acquire authentication token for merchant storefront test.');
  }

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Test 1: GET /api/merchant/storefront/theme
  console.log('\n[TEST 1] Fetching initial storefront theme configuration...');
  const getThemeRes = await fetch(`${baseUrl}/api/merchant/storefront/theme`, {
    headers: authHeaders
  });
  if (!getThemeRes.ok) {
    throw new Error(`GET /api/merchant/storefront/theme failed: HTTP ${getThemeRes.status}`);
  }
  const themePayload = await getThemeRes.json();
  console.log('✓ Successfully received theme payload:', {
    hasPublished: !!themePayload.published,
    hasDraft: !!themePayload.draft,
    hasUnpublishedChanges: themePayload.hasUnpublishedChanges,
    primaryColor: themePayload.published?.brand?.primaryColor
  });

  if (!themePayload.published?.brand || !themePayload.draft?.brand) {
    throw new Error('Theme payload missing essential brand object.');
  }

  // Test 2: PUT /api/merchant/storefront/theme/draft (Draft isolation test)
  console.log('\n[TEST 2] Saving new storefront customization draft (draft isolation)...');
  const customDraft = JSON.parse(JSON.stringify(themePayload.draft));
  customDraft.brand.primaryColor = '#8B5CF6'; // Violet
  customDraft.brand.storeName = 'Yangon Style Premium Boutique';
  customDraft.brand.tagline = 'Luxury Streetwear Myanmar';
  customDraft.typography.headingFont = 'Outfit';
  customDraft.productDisplay.gridColumns = 4;
  customDraft.productDisplay.cardRadius = '3xl';
  customDraft.productDisplay.buttonStyle = 'solid';

  const saveDraftRes = await fetch(`${baseUrl}/api/merchant/storefront/theme/draft`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(customDraft)
  });
  if (!saveDraftRes.ok) {
    throw new Error(`PUT /api/merchant/storefront/theme/draft failed: HTTP ${saveDraftRes.status}`);
  }
  const draftResult = await saveDraftRes.json();
  console.log('✓ Draft saved successfully:', {
    savedPrimaryColor: draftResult.draft?.brand?.primaryColor,
    savedHeadingFont: draftResult.draft?.typography?.headingFont,
    gridColumns: draftResult.draft?.productDisplay?.gridColumns
  });

  // Test 3: Verify Public Storefront DOES NOT show the draft yet
  console.log('\n[TEST 3] Verifying public endpoint isolation (Draft must NOT leak to customers)...');
  const storeRes = await fetch(`${baseUrl}/api/merchant/store`, { headers: authHeaders });
  const storeData = await storeRes.json();
  const slug = storeData.slug || 'yangon-style';

  const publicRes = await fetch(`${baseUrl}/api/public/store/${encodeURIComponent(slug)}`);
  if (!publicRes.ok) {
    throw new Error(`Public storefront fetch failed for slug "${slug}": HTTP ${publicRes.status}`);
  }
  const publicData = await publicRes.json();
  const publicTheme = publicData.store?.themeConfig;
  console.log('Public Storefront Active Brand Color:', publicTheme?.brand?.primaryColor);

  if (publicTheme?.brand?.primaryColor === '#8B5CF6' && themePayload.published?.brand?.primaryColor !== '#8B5CF6') {
    throw new Error('FAILED: Draft leaked to public customer storefront before publish!');
  }
  console.log('✓ Public customer storefront strictly isolated from draft modifications.');

  // Test 4: Atomically Publish the Theme
  console.log('\n[TEST 4] Publishing draft to live customer storefront...');
  const publishRes = await fetch(`${baseUrl}/api/merchant/storefront/theme/publish`, {
    method: 'POST',
    headers: authHeaders
  });
  if (!publishRes.ok) {
    throw new Error(`POST /api/merchant/storefront/theme/publish failed: HTTP ${publishRes.status}`);
  }
  const publishResult = await publishRes.json();
  console.log('✓ Theme published successfully:', {
    publishedVersion: publishResult.published?.version,
    publishedPrimaryColor: publishResult.published?.brand?.primaryColor,
    publishedAt: publishResult.published?.publishedAt
  });

  // Test 5: Verify Public Storefront now immediately serves the updated published theme
  console.log('\n[TEST 5] Verifying public endpoint has received published theme...');
  const publicAfterPublishRes = await fetch(`${baseUrl}/api/public/store/${encodeURIComponent(slug)}`);
  const publicAfterData = await publicAfterPublishRes.json();
  const liveTheme = publicAfterData.store?.themeConfig;

  if (liveTheme?.brand?.primaryColor !== '#8B5CF6') {
    throw new Error(`FAILED: Public storefront did not receive published theme! Found: ${liveTheme?.brand?.primaryColor}`);
  }
  if (liveTheme?.productDisplay?.gridColumns !== 4) {
    throw new Error(`FAILED: Public storefront gridColumns mismatch: expected 4, got ${liveTheme?.productDisplay?.gridColumns}`);
  }
  console.log('✓ Public storefront successfully serving live published theme to customers!');

  // Test 6: Verify Draft Revert
  console.log('\n[TEST 6] Testing draft revert to published state...');
  const revertRes = await fetch(`${baseUrl}/api/merchant/storefront/theme/revert`, {
    method: 'POST',
    headers: authHeaders
  });
  if (!revertRes.ok) {
    throw new Error(`POST /api/merchant/storefront/theme/revert failed: HTTP ${revertRes.status}`);
  }
  const revertResult = await revertRes.json();
  console.log('✓ Draft reverted successfully:', {
    revertedPrimaryColor: revertResult.draft?.brand?.primaryColor
  });

  console.log('\n======================================================');
  console.log('🎉 ALL SHOPSONE STOREFRONT CUSTOMIZATION TESTS PASSED!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
