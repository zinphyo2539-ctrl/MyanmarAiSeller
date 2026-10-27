# ShopSone Phase 2 — Checkout Workflow Forensic Audit

**Objective**: Audit the current checkout flow (Cart -> Checkout -> Payment Slip Upload -> Status Tracking) to prepare for refactoring into a guided workflow.

## 1. Existing Checkout Flow Components & APIs
- **Components**:
    - `src/components/PublicStoreModal.tsx`: Cart review, delivery details entry, order creation.
    - `src/components/CustomerStorefrontView.tsx`: Payment slip upload (after order creation), status monitoring.
- **Endpoints**:
    - `POST /api/public/store/:slug/orders`: Creates the order.
    - `POST /api/public/orders/:orderId/payment-slip`: Uploads payment slip.
    - `GET /api/public/orders/:orderId/payment-status`: Tracks payment status.

## 2. Key Observations
- **State Fragmentation**: The checkout flow is currently split between `PublicStoreModal` (order creation) and `CustomerStorefrontView` (payment slip submission). This forces the customer to manage order state across multiple UI contexts.
- **Payment Slip Dependency**: Payment slip upload currently relies on `createdOrder.supportCode` and `createdOrder.id` from the checkout success state, which must be passed from the order creation context to the upload context.
- **Required Fields**: Name, Phone, Address (Checkout); Payment Slip (Upload).
- **Security**: Server strictly enforces `supportCode` for slip uploads, and merchant-based authorization for payment status.
- **Missing Features in Current UI**: 
    - No direct integration of merchant-specific KPay payment instructions *in* the checkout flow; it's handled via external instruction display.
    - No structured "Guided" path for slip upload; it relies on the user knowing to find the order and upload it.

## 3. Implementation Risks
- **Duplicate Orders**: Rapid submission of order creation.
- **Slip Upload Failure**: Need to ensure the user can retry slip upload without re-entering delivery data or losing the order context.
- **State Preservation**: The transition between the `PublicStoreModal` (order creation) and the slip upload UI must be seamless, ideally unified into a single guided flow.
