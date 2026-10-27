# ShopSone Checkout Workflow — Step-by-Step Forensic Trace

**Audit Date:** October 27, 2026
**Framework:** React (Vite) + Express (Node.js)
**Context:** Phase 2 Guided Workflow Implementation

---

## 1. Trace Overview

The checkout workflow is implemented as a linear, guided experience using the `GuidedWorkflow` component. It replaces the legacy `PublicStoreModal` and enforces sequential progress through five distinct stages.

---

## 2. Detailed Step Sequence

### Step 1: Review Cart
*   **Title:** ခြင်းတောင်းစစ်ဆေးရန် (Review Cart)
*   **Instruction:** ဝယ်ယူမည့် ပစ္စည်းများကို စစ်ဆေးပါ။ (Confirm your items and quantities.)
*   **Customer Action:** Review the list of items, variants, and subtotal.
*   **Validation:** Cart must not be empty (enforced by `CustomerStorefrontView` before opening the modal).
*   **Next Action:** Proceeds to Step 2.
*   **State Preservation:** Cart state is passed via props and persists throughout.
*   **API Request:** None (Local state only).
*   **Code Evidence:** `CheckoutWorkflowModal.tsx` (Lines 128-150).

### Step 2: Delivery Details
*   **Title:** ပို့ဆောင်မည့် အချက်အလက် (Delivery Details)
*   **Instruction:** ပို့ဆောင်ရန် လိပ်စာနှင့် ဖုန်းနံပါတ်ကို ဖြည့်ပါ။ (Tell us where to send your order.)
*   **Customer Action:** Enter Customer Name, Phone Number, and Shipping Address.
*   **Validation:** `handleCreateOrder` (triggered on Step 3 -> 4) checks if `customerName`, `customerPhone`, and `shippingAddress` are non-empty.
*   **Next Action:** Proceeds to Step 3.
*   **State Preservation:** Values are stored in local component state (`customerName`, `customerPhone`, `shippingAddress`).
*   **API Request:** None.
*   **Code Evidence:** `CheckoutWorkflowModal.tsx` (Lines 151-170).

### Step 3: Payment Instructions
*   **Title:** ငွေပေးချေရန် လမ်းညွှန် (Payment Instructions)
*   **Instruction:** ပေးထားသော KPay အကောင့်သို့ ငွေလွှဲပါ။ (Please complete the transfer to the account below.)
*   **Customer Action:** View Merchant's KPay Name, Phone, and QR Code. Perform transfer in KPay app.
*   **Validation:** None at UI level; `onStepNext` triggers the critical order creation.
*   **Next Action (Pressing "Next"):** Triggers `handleCreateOrder`.
*   **API Request:**
    *   **Endpoint:** `POST /api/public/store/:slug/orders`
    *   **Payload:** `{ customerName, customerPhone, shippingAddress, paymentMethod: 'KBZPay', items: [...] }`
    *   **Auth:** None (Public).
*   **Success Result:** Backend returns `{ success: true, order: { id, supportCode, ... } }`.
*   **Failure Behavior:** Shows error message in `GuidedWorkflow` error bar. User stays on Step 3 to retry.
*   **State Preservation:** If successful, `createdOrder` is set. Subsequent "Next" clicks skip API call via `if (createdOrder) return true`.
*   **Code Evidence:** `CheckoutWorkflowModal.tsx` (Lines 171-210) and `handleCreateOrder` (Lines 36-69).

### Step 4: Upload Payment Slip
*   **Title:** ပြေစာ တင်သွင်းရန် (Upload Payment Slip)
*   **Instruction:** ငွေလွှဲပြေစာ ပုံကို ရွေးချယ်တင်ပြပါ။ (Select and upload your transfer screenshot.)
*   **Customer Action:** Select an image file. Optionally enter Transaction Reference.
*   **Validation:** `handleUploadSlip` checks for `slipFile`.
*   **Next Action (Pressing "Next"):** Triggers `handleUploadSlip`.
*   **API Request:**
    *   **Endpoint:** `POST /api/public/orders/:orderId/payment-slip`
    *   **Payload:** `FormData` containing `slipImage`, `supportCode`, and `transactionRef`.
    *   **Auth:** Authorization verified via `supportCode` matching `supportCodeHash` in DB.
*   **Success Result:** Order status updated to `SLIP_SUBMITTED`.
*   **Failure Behavior:** Error message displayed. Customer can re-select or retry the upload for the *same* `orderId`.
*   **Code Evidence:** `CheckoutWorkflowModal.tsx` (Lines 211-246) and `handleUploadSlip` (Lines 72-103).

### Step 5: Order Confirmed
*   **Title:** ပြီးမြောက်ခြင်း (Order Confirmed)
*   **Instruction:** အော်ဒါကို ဆိုင်ရှင်မှ စစ်ဆေးနေပါသည်။ (Your order is pending merchant approval.)
*   **Customer Action:** View Order ID and Status. Optionally click "Contact Order Support".
*   **Success Result:** "PENDING VERIFICATION" status shown.
*   **Failure Behavior:** N/A (Final Step).
*   **Code Evidence:** `CheckoutWorkflowModal.tsx` (Lines 247-282).

---

## 3. Specific Trace Cases

| Case | Status | Detail |
| :--- | :--- | :--- |
| **Change quantity / remove** | **VERIFIED** | Handled in `CustomerStorefrontView.tsx` via `handleUpdateQty` and `handleRemoveItem` before modal opens. |
| **Empty required field** | **VERIFIED** | `handleCreateOrder` throws error if Name/Phone/Address are missing. |
| **Navigation Persistence** | **VERIFIED** | Back/Next navigation in `GuidedWorkflow` does not clear component state. |
| **Correct Merchant KPay** | **VERIFIED** | Pulled from `store.paymentSettings` passed into modal. |
| **Order ID availability** | **VERIFIED** | Generated at the end of Step 3 (`handleCreateOrder`) and available for Step 4. |
| **Slip Retry (Same Order)** | **VERIFIED** | `handleUploadSlip` uses `createdOrder.id`. If upload fails, the order is already in the DB and ready for retry. |
| **Refresh Tracking** | **VERIFIED** | `OrderSupportModal.tsx` uses `GET /api/public/orders/:orderId/payment-status`. |
| **Double Submission** | **VERIFIED** | Frontend: `if (createdOrder) return true` in Step 3. Backend: Stock is decremented in transaction, but no unique idempotency key check on order creation payload itself. |
| **Security: Unauthorized Slip** | **VERIFIED** | `server.ts` line 1634: `hashed === order.supportCodeHash` check prevents unauthorized access. |

---

## 4. Security & Integrity Verification

1.  **Backend Duplicate Prevention:** **PARTIALLY VERIFIED**. Frontend prevents UI-driven duplicates. Backend lacks a unique transaction-content hash check, though session tracking (`req.session.recentOrderId`) provides a secondary layer.
2.  **Human Approval:** **VERIFIED**. `paymentStatus` starts as `PENDING`, moves to `SLIP_SUBMITTED` on upload, and only becomes `CONFIRMED` via merchant-side API.
3.  **Authoritative Stock Check:** **VERIFIED**. `server.ts` (Line 1398) performs `if (variant.stock < item.qty)` check within a database transaction.
4.  **Supabase Privacy:** **VERIFIED**. The slip image is streamed via a proxy (`/api/public/orders/:id/slip-image`) that enforces `supportCode` or `merchant` authorization. Direct Supabase URLs are not exposed.
5.  **Secret Leakage:** **VERIFIED**. Support codes are hashed (SHA-256) before storage. `supportCode` is passed in `POST` body or headers, not URL paths.

---

## 5. Discrepancy Report

*   **Idempotency:** Earlier reports implied full idempotency. Current implementation relies on **State-Driven Idempotency** (checking `createdOrder` existence in the modal) rather than **Transaction-Key Idempotency** (database level unique constraints on customer+cart hash).
*   **Workflow Logic:** The order is created *before* the slip is uploaded (Step 3 to 4 transition). This is the correct "Mandalar99" style which ensures an order is registered even if the slip upload is delayed or fails.
*   **Component Usage:** `PublicStoreModal.tsx` is completely bypassed by the new integration, resolving all previous fragmentation issues.
