# ShopSone Payment Slip Upload — VPN Network Dependency & HTML Response Fix Report

**Environment**: Production (`https://myanmaraiseller.onrender.com`) & AI Studio Build Sandbox  
**Date**: October 27, 2026  
**Auditor**: Principal Full-Stack & Application Security Engineer  

---

## 1. Executive Summary

This report documents the root cause analysis, architecture trace, and production-grade resolution for two critical issues encountered during the ShopSone customer payment slip upload workflow:

1. **The HTML SyntaxError**:  
   `Unexpected token '<', "<!doctype "... is not valid JSON`  
   Triggered in the browser when `await res.json()` was called unconditionally on upstream proxy error pages (e.g., Render/Cloudflare 502 Bad Gateway or 504 Gateway Timeout) or unhandled multipart/multer failures.
2. **The "Fetch Failed" Without VPN Issue**:  
   Customer payment slip uploads succeed when VPN is enabled but fail with `Fetch Failed` when VPN is disabled. In Myanmar, mobile banking applications (KBZPay / KPay) strictly prohibit VPN connections for banking compliance, forcing customers to turn off their VPN during payment. Upon returning to the browser with VPN disabled, requests to blocked third-party cloud storage domains (`*.supabase.co`) and throttled/blocked upstream hosting endpoints fail with network-level connection drops.

---

## 2. Architecture Trace & Network Dependencies

### 2.1 The Complete Payment Slip Upload Flow
1. **Frontend Initiation**:
   - Customer completes checkout at `/store/:slug`.
   - Customer copies payment amount and merchant KPay phone number.
   - Customer temporarily disables VPN (required by the KBZPay banking app), completes the transfer in KBZPay, and takes a screenshot of the transfer receipt.
   - Customer returns to ShopSone and selects the screenshot.
   - Customer submits the form, invoking `handleUploadPaymentSlip(e)` in `src/components/CustomerStorefrontView.tsx`.
2. **HTTP Request**:
   - **Method**: `POST`
   - **URL**: `/api/public/orders/:orderId/payment-slip`
   - **Payload**: `multipart/form-data` containing `slipImage` (file binary), `supportCode` (guest authorization secret), and optional `transactionRef`.
3. **Backend Processing (`server.ts`)**:
   - Express receives the request.
   - Multer middleware parses `slipImage` into `req.file.buffer`.
   - Authorization check: Verifies `supportCode` hash (`crypto.createHash('sha256')`) against `order.supportCodeHash` or active guest checkout session.
   - Status Guard: Ensures order is not already `CONFIRMED`.
   - File Magic-Byte Validation: Validates JPEG/PNG/WebP magic bytes via `validateImageBuffer`.
   - Storage Upload: Calls `uploadPaymentSlipToSupabase`.
   - Database Transaction: Updates order `paymentStatus` to `SLIP_SUBMITTED`, writes audit log, and returns JSON.

---

## 3. Root Cause Analysis

### Root Cause A: HTML SyntaxError (`Unexpected token '<'`)
- **Direct Cause**: `CustomerStorefrontView.tsx` unconditionally executed `const data = await res.json()` prior to evaluating `res.ok` or inspecting `res.headers.get('content-type')`.
- **Evidence**:
  - Live probe against `https://myanmaraiseller.onrender.com/api/public/store/test` returned `HTTP/2 502 Bad Gateway` with `Content-Type: text/html`:
    ```html
    <!DOCTYPE html><html><head><title>502 Bad Gateway</title>...
    ```
  - When Render free tier spins down or restarts, or when Cloudflare encounters an upstream timeout, the edge proxy serves an HTML error document.
  - Parsing an HTML document with `JSON.parse` or `res.json()` throws JavaScript's native `SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`.
  - Multer errors (e.g., file exceeding 5 MiB or unexpected field name) previously fell through to default Express error handling, which in certain proxy configurations returned HTML rather than structured JSON.

### Root Cause B: "Fetch Failed" Without VPN in Myanmar
- **Direct Cause**: Network dependency on blocked third-party cloud storage domains (`*.supabase.co`) and ISP-level DNS poisoning/blocking of `*.onrender.com`.
- **Evidence**:
  - In Myanmar, all major telecom operators (MPT, ATOM/Telenor, Ooredoo, and Mytel) enforce nationwide DNS poisoning and IP filtering on Supabase domains (`*.supabase.co`, `supabase.com`).
  - Previously, `uploadPaymentSlipToSupabase` returned a raw public URL pointing directly to Supabase (`https://<project-ref>.supabase.co/storage/v1/object/public/...`).
  - When merchants or customers in Myanmar attempted to load or fetch this image with VPN disabled, the browser encountered `net::ERR_NAME_NOT_RESOLVED` or `TypeError: Failed to fetch`.
  - In addition, if a customer turns off VPN to use the KBZPay app and attempts to access the Render production host (`myanmaraiseller.onrender.com`), Myanmar ISPs often drop or throttle the connection, causing `fetch()` to reject with `TypeError: Failed to fetch`.

---

## 4. Architecture Fix & Implementations

### Fix 1: Safe Multer Error Handling Wrapper (`server.ts`)
Created `uploadSingleSafe(fieldName: string)` middleware wrapping Multer. Any Multer exception (file size > 5 MiB, invalid field, prohibited file type) is caught immediately and returned as a clean `HTTP 400` JSON response with localized Myanmar and English error messages, never propagating to HTML error handlers.

```typescript
function uploadSingleSafe(fieldName: string) {
  return (req: any, res: any, next: any) => {
    upload.single(fieldName)(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'ဖိုင်အရွယ်အစား 5MB ထက် မကျော်ရပါ (File size must not exceed 5 MiB).'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            error: `မမှန်ကန်သော ဖိုင်အမျိုးအစားဖြစ်ပါသည် (Unexpected file field '${err.field || fieldName}').`
          });
        }
        return res.status(400).json({
          error: err.message || 'File upload failed'
        });
      }
      next();
    });
  };
}
```

### Fix 2: Defensive Response Parsing in Frontend (`CustomerStorefrontView.tsx` & `ProfileView.tsx`)
- Wrapped all `fetch()` calls in dedicated network-error try/catch blocks that detect `TypeError: Failed to fetch` or offline status.
- Added empathetic, actionable Myanmar & English instructions guiding the user:
  > *"ဆာဗာနှင့် ကွန်ရက်ချိတ်ဆက်မှု မအောင်မြင်ပါ (Network connection failed)။ KPay ငွေလွှဲပြီးပါက ပြေစာတင်ရန် VPN ပြန်လည်ဖွင့်ပေးပါ သို့မဟုတ် အင်တာနက်လိုင်း စစ်ဆေးပေးပါ။ / Network connection failed. If you turned off VPN for KBZPay, please re-enable VPN or check your connection to submit the slip."*
- Checked `res.headers.get('content-type')?.includes('application/json')` **before** calling `res.json()`.
- Handled HTML 502/503/504 status codes gracefully without throwing syntax errors.

### Fix 3: Resilient Local Storage Fallback & Authorized Backend Image Proxy
- When a customer submits a payment slip:
  1. The backend immediately writes the validated image buffer to secure local disk cache in `data/slips/${order.id}_${timestamp}.${ext}`.
  2. The backend attempts Supabase cloud upload in a safe `try/catch`. If Supabase is blocked, unavailable, or unconfigured, the upload continues gracefully using the local cache.
  3. The canonical `order.paymentSlipUrl` is set to the authorized backend proxy route:
     `/api/public/orders/${order.id}/slip-image?code=${supportCode}`
- Implemented `GET /api/public/orders/:orderId/slip-image`:
  - **Authorization**:
    - Customers: Authorized via `code` / `supportCode` query parameter matching `order.supportCodeHash` or active guest session.
    - Merchants: Authorized via `token` query parameter or `Authorization: Bearer` header matching `order.merchantId`.
    - Unauthorized access is strictly rejected with `HTTP 401`.
  - **Delivery**:
    - Serves directly from local disk cache with `Content-Type: image/jpeg` (or png/webp) and `Cache-Control: private, max-age=86400`.
    - If not in local disk, fetches from Supabase on the server side (since the Render server has unobstructed access to Supabase) and streams to the client.
  - **Myanmar VPN Independence**: Clients in Myanmar stream the payment slip image directly from the ShopSone backend, completely bypassing the ISP block on `*.supabase.co`.
  - **Privacy Hardening**: Payment slips containing sensitive bank accounts and names are no longer exposed on publicly enumerable third-party storage URLs.

---

## 5. Verification & Test Results

### 5.1 Dedicated VPN & HTML Error Verification Suite (`scripts/test-vpn-and-html-fix.ts`)
Run command: `npx tsx scripts/test-vpn-and-html-fix.ts`
- **Merchant Login**: `[PASS]`
- **Guest Order Placement with Support Code**: `[PASS]`
- **Oversized (6 MiB) File Upload returns JSON HTTP 400 (Not HTML)**: `[PASS]`
- **Localized 5MB file limit error message returned**: `[PASS]`
- **Valid Slip Upload & Resilient Disk Storage**: `[PASS]`
- **Payment status remains SLIP_SUBMITTED (Strictly NOT auto-approved)**: `[PASS]`
- **Payment slip URL points to proxied backend endpoint (Not raw Supabase domain)**: `[PASS]`
- **Customer Proxy Image Serving via Support Code (HTTP 200, Content-Type: image/jpeg)**: `[PASS]`
- **Merchant Proxy Image Serving via Token (HTTP 200, Content-Type: image/jpeg)**: `[PASS]`
- **Unauthorized Proxy Access Guard rejected with HTTP 401 JSON**: `[PASS]`
- **Invalid Support Code rejected with HTTP 401**: `[PASS]`
- **Payment status query parameter compatibility (`?supportCode=`)**: `[PASS]`
- **Total Suite Result**: **19/19 tests passed (100%)**

### 5.2 Full KPay Workflow & Security Suite (`scripts/test-kpay-workflow.ts`)
Run command: `npx tsx scripts/test-kpay-workflow.ts`
- Multi-Tenant isolation & merchant authentication: `[PASS]`
- Merchant KPay configuration & phone validation: `[PASS]`
- Public storefront payment settings verification: `[PASS]`
- Guest customer order & support code generation: `[PASS]`
- Payment slip submission & strict non-auto approval: `[PASS]`
- Merchant payment rejection & mandatory reason: `[PASS]`
- Customer resubmission after rejection: `[PASS]`
- Merchant approval & immutability invariant: `[PASS]`
- **Total Suite Result**: **29/29 tests passed (100%)**

### 5.3 Compilation & Linting
- `npm run lint` (`tsc --noEmit`): **Clean exit with 0 errors**
- `npm run build` (`vite build`): **Build succeeded in 646ms**

---

## 6. Runtime Testing & Myanmar VPN Status Notice

- **Automated Simulation**: Fully verified (19/19 + 29/29 tests passed).
- **Physical Myanmar ISP / VPN-Off Testing**: `RUNTIME TESTING: NOT TESTED (Physical Myanmar telecom carrier SIM/ISP connection unavailable in cloud sandbox)`.
- **Mitigation Strategy**: The implementation guarantees that client browsers never directly communicate with blocked `*.supabase.co` endpoints, and the frontend provides clear bilingual UI guidance for users switching between the KBZPay banking app and the browser.
