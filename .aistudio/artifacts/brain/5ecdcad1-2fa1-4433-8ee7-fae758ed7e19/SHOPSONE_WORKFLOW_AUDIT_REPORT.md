# ShopSone Workflow Audit Report (Guided Interaction)

**Objective**: Audit ShopSone's long-form workflows and refactor them into step-by-step guided experiences inspired by Mandalar99.

## 1. Inventory Management (`InventoryView.tsx`)
- **Current Flow**: Complex modal with form fields for name, SKU, price, variants, description, etc.
- **Complexity**: High (Many fields displayed at once).
- **Proposed Guided Steps**:
    1. **Basic Info**: Name, SKU, Description.
    2. **Pricing & Stock**: Price, Cost Price, Variants (Colors/Sizes), Initial Stock.
    3. **Product Media**: Image upload with AI photo enhancement/approval.
    4. **Review & Save**: Summary and final submission.

## 2. Public Checkout (`PublicStoreModal.tsx`)
- **Current Flow**: Cart modal -> Checkout form (name, phone, address).
- **Complexity**: Moderate.
- **Proposed Guided Steps**:
    1. **Review Cart**: Confirm items and total.
    2. **Shipping & Contact**: Enter customer details.
    3. **Payment**: Show merchant KPay instructions clearly.
    4. **Slip Upload**: Upload KPay slip with progress bar.
    5. **Order Summary**: Final submission and what to expect next.

## 3. Merchant Payment Verification (`ProfileView.tsx`)
- **Current Flow**: List of pending payments, manual action modal with confirmation/rejection (mandatory reason).
- **Complexity**: Moderate.
- **Proposed Guided Steps**:
    1. **Order Review**: Order details, total, transaction reference.
    2. **Slip Validation**: View uploaded slip image.
    3. **Decision**: Approve or Reject (with mandatory reason).
    4. **Status Update**: Show final order status update confirmation.
