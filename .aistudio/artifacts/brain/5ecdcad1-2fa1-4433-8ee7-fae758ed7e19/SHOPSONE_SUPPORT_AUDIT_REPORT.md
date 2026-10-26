# ShopSone Guest Order Support — Architecture Audit Report

## 1. Findings
- **Existing Infrastructure**:
    - **API**: `verify` (POST), `chat` (GET, POST) endpoints exist for guest support.
    - **Persistence**: Orders store `supportCodeHash` and `supportConversationId`. Firestore sub-collection `supportMessages` under `orders/{orderId}` stores messages.
    - **Session**: Support authorization is managed in `req.session.supportOrder`.

- **Identified Gaps**:
    - **Merchant Inbox**: Missing endpoint to list order-linked conversations (`GET /api/merchant/support/conversations`).
    - **Merchant Reply**: Missing endpoint to reply to a specific conversation from the merchant dashboard (`POST /api/merchant/support/chat/:orderId`).
    - **UI**: No customer-facing support chat UI; no merchant-facing support inbox UI.

## 2. Implementation Strategy
1.  **Merchant API Extensions**: Implement `GET /api/merchant/support/conversations` (filter by `req.merchant.id`) and `POST /api/merchant/support/chat/:orderId` in `server.ts`.
2.  **Customer UI**: Create a new component `SupportModal.tsx` for entering the support code and rendering the chat. Integrate it into `CustomerStorefrontView.tsx`.
3.  **Merchant UI**: Update `MessagesView.tsx` to add an "Order Support" tab that fetches and displays these conversations.
4.  **Security**: Enforce `authMiddleware` for all merchant API endpoints and session verification for customer endpoints.
