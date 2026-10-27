# ShopSone — Merchant KPay Setup, Checkout Payment Instructions & Payment Slip Verification Report

**Production Environment:** https://myanmaraiseller.onrender.com  
**Target Milestone:** Manual KBZPay Payment Workflow, Security Hardening, & Multi-Tenant Verification  
**Status:** **APPROVED & FULLY VERIFIED (29/29 Automated Integration Tests Passed)**

---

## 1. Executive Summary

The missing manual KBZPay payment workflow has been engineered, integrated, and verified across both backend services and frontend customer/merchant experiences. 

Prior to this implementation:
- Customers had no way to view verified merchant KBZPay account credentials or official receive-money QR codes at checkout.
- Customers had no secure mechanism to upload payment slips or record KBZPay transaction references without an account.
- Merchants had to manually confirm orders blindly without inspecting uploaded slips or having an audit trail for payment disputes.

With this implementation:
1. **Merchant KPay Profile Setup**: Each merchant configures their verified KBZPay account holder name, Myanmar phone number, official QR code image, transfer rules & regulations (with a one-click Burmese template helper), and optional customer notes.
2. **Multi-Tenant Isolation**: Merchant A's credentials and payment settings are strictly isolated and never leak to or get overwritten by Merchant B.
3. **Public Checkout & Storefront Disclosure**: Customers see the verified merchant's KBZPay credentials, official QR code, and transfer rules before initiating payment. Unconfigured merchants trigger a clear security warning.
4. **Guest Order Slip Submission**: After checkout, guest customers receive a high-entropy order support code and can upload payment slips (JPEG, PNG, WebP ≤ 5MB) with server-side magic-byte verification and optional transaction IDs.
5. **Strict Non-Auto Approval**: Uploading a slip transitions an order to `SLIP_SUBMITTED`. Payment approval **never** occurs automatically upon slip upload.
6. **Human-Only Payment Verification & Rejection**: Merchant admins can inspect high-resolution slips in an enlarged modal. Rejection requires a mandatory reason (minimum 2 characters, maximum 500 characters) and preserves previous slip attempts in `paymentHistory` while allowing customer resubmission. Confirmation is strictly reserved for authorized human personnel.

---

## 2. Pre-Implementation Audit Findings

| Component | Audit Finding | Implementation Action Taken |
| :--- | :--- | :--- |
| **Persistence (`server/db.ts`)** | `MerchantRecord` lacked structured payment fields; `Order` lacked slip review audit properties. | Updated `MerchantRecord.paymentSettings` and `Order` with `paymentStatus`, `paymentSlipUrl`, `paymentSlipUploadedAt`, `transactionRef`, `rejectionReason`, `rejectedBy`, `rejectedAt`, `paymentHistory`. Synchronized `firebase-blueprint.json`. |
| **Storage (`server/supabaseStorage.ts`)** | Supabase Storage adapter was active for product images only. | Implemented `uploadQrImageToSupabase` and `uploadPaymentSlipToSupabase` with magic-byte validation (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG, `52 49 46 46` for WebP), path sanitization, and 5MB size enforcement. |
| **Auth & Routing (`server.ts`)** | No dedicated endpoints existed for merchant payment settings or guest slip submission. | Created `GET/PUT /api/merchant/payment-settings`, `POST /api/merchant/payment-settings/upload-qr`, `POST /api/public/orders/:orderId/payment-slip`, `GET /api/public/orders/:orderId/payment-status`, and `POST /api/orders/:id/reject-payment`. |
| **Merchant UI (`ProfileView.tsx`)** | Orders section only had a basic "Confirm" button without slip preview, filtering, or rejection workflow. | Built dedicated `Payment Settings` management section and overhauled `Orders & Verification` with filter tabs (`SLIP_SUBMITTED`, `PENDING`, `CONFIRMED`, `REJECTED`), slip thumbnails, full-screen zoom modal, and rejection modal with Burmese template chips. |
| **Customer UI (`CustomerStorefrontView.tsx`)** | Checkout success showed generic text with no payment slip upload or merchant KPay info. | Added live KBZPay QR code, account details with copy buttons, transfer rules warning, file upload input, transaction ref field, and live status tracking with resubmission support. |

---

## 3. Architecture & Data Model

### 3.1 Order Payment Schema
```typescript
export interface PaymentHistoryItem {
  slipUrl: string;
  uploadedAt: string;
  transactionRef?: string | null;
  previousStatus?: string;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
}

export interface Order {
  id: string;
  merchantId: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: 'CONFIRMED' | 'PENDING' | 'SLIP_SUBMITTED' | 'REJECTED';
  paymentSlipUrl?: string | null;
  paymentSlipUploadedAt?: string | null;
  transactionRef?: string | null;
  rejectionReason?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  paymentHistory?: PaymentHistoryItem[];
  supportCodeHash?: string;
  createdAt: string;
}
```

### 3.2 Merchant Payment Settings Schema
```typescript
export interface PaymentSettings {
  kpayAccountName: string;
  kpayPhone: string;
  kpayQrUrl?: string;
  paymentRules: string;
  customInstructions?: string;
  updatedAt?: string;
}
```

---

## 4. Security, Authorization & Tenancy Safeguards

1. **Multi-Tenant Protection**:
   - `GET /api/merchant/payment-settings` and `PUT /api/merchant/payment-settings` use `req.merchant.id` extracted from verified authentication tokens.
   - Merchant A cannot inspect or update Merchant B's settings.
   - Public storefront (`GET /api/public/store/:slug`) filters strictly by store slug and injects only the associated merchant's verified settings.
2. **Guest Order Authorization**:
   - Slip uploads (`POST /api/public/orders/:orderId/payment-slip`) and status checks (`GET /api/public/orders/:orderId/payment-status`) require either a matching SHA-256 hash of the order's 96-bit support code or an active checkout session matching the order ID.
   - Unauthorized attempts return `HTTP 401 Unauthorized`.
3. **Magic-Byte & Anti-Traversal File Validation**:
   - File uploads are validated in memory using magic bytes before being written to Supabase Storage.
   - Image formats restricted to JPEG, PNG, and WebP with a hard limit of 5 MiB.
   - Storage path keys are sanitized using alphanumeric identifiers: `${cleanMerchantId}/payment-slips/${cleanOrderId}_${timestamp}.${ext}` to prevent directory traversal.
4. **Strict Non-Auto Approval Invariant**:
   - Uploading a payment slip strictly sets `paymentStatus = 'SLIP_SUBMITTED'`.
   - The status remains `SLIP_SUBMITTED` until an authorized human merchant admin explicitly reviews the slip and triggers `POST /api/orders/:id/confirm-payment`.
   - Once an order is `CONFIRMED`, replacement slips are rejected with `HTTP 400 Bad Request`.
5. **Rejection Safeguards**:
   - Rejection requires human authentication (`merchant_admin`, `store_manager`, or `finance_staff`).
   - Rejection requires a mandatory explanation string (minimum 2 characters, maximum 500 characters) to prevent silent or automated rejections.
   - Previous slips are preserved in `paymentHistory` to maintain an audit trail for customer dispute resolution.

---

## 5. Automated Test Results

The automated regression and security test suite (`scripts/test-kpay-workflow.ts`) was executed against the active runtime server:

```
--- Starting ShopSone KPay Workflow & Security Verification Suite ---

--- Test Phase 1: Authentication & Multi-Tenant Setup ---
[PASS] Merchant A logged in successfully
[PASS] Merchant B logged in successfully

--- Test Phase 2: Merchant Payment Configuration ---
[PASS] Merchant A updated payment settings successfully
[PASS] Merchant A settings saved account name
[PASS] Rejects invalid Myanmar phone number format
[PASS] Merchant B cannot read Merchant A private payment settings

--- Test Phase 3: Public Storefront Payment Settings Verification ---
[PASS] Public storefront loads store data
[PASS] Storefront returns Merchant A verified KPay account name
[PASS] Storefront returns Merchant A verified KPay phone

--- Test Phase 4: Guest Customer Order & Support Code ---
[PASS] Guest order placed successfully
[PASS] Order has valid ID
[PASS] Order returned secure support code to customer
[PASS] Initial payment status is strictly PENDING

--- Test Phase 5: Payment Slip Submission & Strict Non-Auto Approval ---
[PASS] Unauthenticated slip upload rejected with HTTP 401
[PASS] Rejects image with mismatched magic bytes
[PASS] Rejects disallowed mime type and file extension
[PASS] Authorized customer uploaded payment slip
[PASS] Payment status is SLIP_SUBMITTED (NOT auto-confirmed!)
[PASS] Guest status query returns SLIP_SUBMITTED
[PASS] Transaction reference recorded accurately

--- Test Phase 6: Merchant Payment Rejection & Mandatory Reason ---
[PASS] Payment rejection without reason is rejected with HTTP 400
[PASS] Merchant successfully rejected invalid payment
[PASS] Order status transitioned to REJECTED
[PASS] Rejection reason is stored in order model

--- Test Phase 7: Customer Resubmission After Rejection ---
[PASS] Customer successfully resubmitted corrected slip
[PASS] Status returned to SLIP_SUBMITTED after resubmission

--- Test Phase 8: Merchant Approval & Immutability Invariant ---
[PASS] Authorized human merchant confirmed payment
[PASS] Payment status is strictly CONFIRMED
[PASS] Replacing slip for already CONFIRMED order is blocked with HTTP 400

========================================
Verification Complete: 29/29 tests passed (100%)
========================================
```

---

## 6. Build & Compilation Verification

- **Linter (`tsc --noEmit`)**: Clean (0 errors).
- **Vite Production Bundle (`npm run build`)**: 1674 modules transformed cleanly with 0 errors.
- **Runtime Dev Server**: Healthy on port 3000.
