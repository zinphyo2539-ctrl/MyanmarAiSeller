# ShopSone Workflow Implementation Plan

**Objective**: Refactor ShopSone workflows into step-by-step guided experiences.

## 1. Component Implementation
- Create `src/components/GuidedWorkflow.tsx` (Reusable UI component).
    - Props: `steps`, `currentStep`, `onNext`, `onBack`, `onFinish`, `title`.

## 2. Inventory Management Refactor
- Refactor `InventoryView.tsx` to use `GuidedWorkflow` in the "Add Product" modal.
- State management: Preserve `formData` across steps.

## 3. Checkout Workflow Refactor
- Refactor `PublicStoreModal.tsx` to use `GuidedWorkflow`.
- Clearly isolate delivery information and payment/slip-upload steps.

## 4. Merchant Payment Verification Refactor
- Refactor `ProfileView.tsx` (or a sub-component for payment verification) to use `GuidedWorkflow` when processing pending payments.

## 5. Verification Plan
- Verify all step-by-step navigation (Back/Next).
- Ensure state preservation (no data loss).
- Verify validation before `Next`.
- Test payment slip submission flow in the new wizard.
- Validate merchant payment approval/rejection.
- Run existing test suites (`test-kpay-workflow.ts`, `test-supabase-storage-primary.ts`) to ensure no regression.
