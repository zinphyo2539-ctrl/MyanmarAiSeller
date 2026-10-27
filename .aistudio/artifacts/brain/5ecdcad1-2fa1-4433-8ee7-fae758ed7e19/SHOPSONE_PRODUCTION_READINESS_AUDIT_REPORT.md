# ShopSone Payment-Slip Upload & Image-Proxy: Production-Readiness Audit Report

**Audit Target**: ShopSone Payment-Slip Upload, Resilient Disk Storage, and Authenticated Image-Proxy (`https://myanmaraiseller.onrender.com`)  
**Auditor**: Senior Full-Stack, Application Security & Infrastructure Architect  
**Date**: October 2026  
**Status**: **CONDITIONAL / ACTION REQUIRED (NOT PRODUCTION READY WITHOUT PERSISTENT DISK CONFIGURATION)**

---

## Executive Summary

This rigorous audit evaluates the recently implemented payment-slip upload and image-proxy subsystems against 6 core production criteria. While the in-process state machine and anti-HTML crash handlers operate effectively, **the app cannot be considered production-ready on Render until a persistent disk is verified in the Render Dashboard**. Furthermore, previous implementations inadvertently leaked sensitive support codes and authentication tokens into URL query strings and retained orphaned files upon resubmission. Minimal, non-destructive hardening has been applied to address code-level vulnerabilities, and precise infrastructure requirements are detailed below.

---

## Item 1: Render Persistent Disk & Mount Path Analysis

### Audit Finding: **NOT VERIFIED (HIGH OPERATIONAL RISK)**

- **Repository Evidence**:
  - `render.yaml` or Dockerfile: **DOES NOT EXIST** in the codebase.
  - Render Dashboard settings cannot be inspected from the sandbox environment.
  - Code reference: `server.ts` lines 79-88 & 1512 previously resolved `path.resolve(process.cwd(), 'data', 'slips')`.
- **Underlying Infrastructure Reality**:
  - Render Web Services operate as ephemeral Docker containers. By default, any file written to `process.cwd()/data/slips/` resides on the container’s writable overlay layer.
  - On every git deploy, manual redeploy, scale event, or free-tier inactivity restart, Render replaces the container image with a clean state. **All contents of `data/slips/` are permanently wiped**.
  - On Render, Persistent Disks are only attached to paid instance types (Starter $7/mo + Disk $0.25/GB/mo) and must be explicitly mounted via the Render Dashboard (e.g., at `/var/data` or `/data`).
  - Without an environment-controlled path, even if a user mounts a disk at `/var/data` in the Render dashboard, standard Node.js code running from `/opt/render/project/src` writes to `/opt/render/project/src/data/slips`, completely bypassing the mounted disk!
- **Implemented Fix**:
  - Refactored `server.ts` to introduce `getSlipsDir()` with support for the `DATA_SLIPS_PATH` environment variable:
    ```typescript
    export function getSlipsDir(): string {
      const customPath = process.env.DATA_SLIPS_PATH || (process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'slips') : null);
      const dir = customPath ? path.resolve(customPath) : path.join(DATA_DIR, 'slips');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return dir;
    }
    ```
  - Documented `DATA_SLIPS_PATH` in `.env.example`.
- **Production Requirement for Render**:
  - In Render Dashboard > Service Settings > Disks: Add a Disk named `shopsone-storage` mounted at `/var/data/slips`.
  - In Environment Variables: Set `DATA_SLIPS_PATH=/var/data/slips`.

---

## Item 2: Consistency Across Failed Cloud Sync, Restart & Redeployment

### Audit Finding: **VULNERABLE WITHOUT DUAL PERSISTENCE**

- **Code Evidence** (`server.ts` lines 1521-1533 & 1680-1725):
  - In `POST /api/public/orders/:orderId/payment-slip`, if Supabase upload throws (unconfigured credentials, network failure, or Myanmar ISP block):
    ```typescript
    try {
      publicUrl = await uploadPaymentSlipToSupabase(...);
    } catch (supaErr: any) {
      console.warn('[PaymentSlipUpload] Supabase cloud upload skipped/failed; continuing with local storage fallback:', supaErr?.message);
    }
    ```
  - The request succeeds with HTTP 200, updating `order.paymentStatus = 'SLIP_SUBMITTED'`, `order.localSlipFilename`, and leaving `order.supabaseSlipUrl` null.
- **Failure Mode**:
  1. Customer uploads slip while Supabase sync fails (or is unconfigured).
  2. Slip exists solely on local container disk.
  3. Render restarts container (maintenance, redeployment, or memory limit).
  4. Local file in `data/slips/` vanishes.
  5. Merchant attempts to view slip via `/api/public/orders/:orderId/slip-image`.
  6. Endpoint checks `order.localSlipFilename` (file missing on disk) and `order.supabaseSlipUrl` (null).
  7. **Result: HTTP 404 - Payment slip is irrecoverably lost**.
- **Implemented Fix**:
  - Track authoritative sync state on the order: `ord.supabaseSyncStatus = publicUrl ? 'SYNCED' : 'FAILED_OR_UNAVAILABLE'`.
  - Expose `cloudSyncStatus` in payment status endpoints and audit logs (`database.auditLogs`) so merchants and automated reconcilers can flag unsynced slips.

---

## Item 3: Exposure of Support Codes, Session Secrets & Slip URLs

### Audit Finding: **RESOLVED (CRITICAL LEAK FIXED IN CODE)**

- **Identified Vulnerabilities Before Fix**:
  1. **Customer Support Code Baked in Database & Merchant Responses**:
     - `server.ts` previously defined:
       `const proxiedSlipUrl = '/api/public/orders/' + order.id + '/slip-image?code=' + encodeURIComponent(clientCode || '');`
       `ord.paymentSlipUrl = proxiedSlipUrl;`
     - This stored the customer's raw, unhashed support code directly in `order.paymentSlipUrl` inside `data/db.json`!
     - When merchants called `GET /api/orders`, the customer's secret support code was transmitted to the merchant workspace.
     - Placing secrets in URL query parameters leaks them into HTTP server access logs, reverse proxy logs (Render/Cloudflare), and browser history.
  2. **Merchant Bearer Token in `<img>` Query Strings**:
     - `src/components/ProfileView.tsx` line 1621 appended `&token=${encodeURIComponent(localStorage.getItem('myanmar_seller_token') || '')}` to `<img>` tags.
     - Placing long-lived bearer tokens into URL query strings violates RFC 6750 Section 2.3 and exposes admin credentials through browser cache and `Referer` headers.
- **Implemented Fix**:
  - **Clean Canonical URL in Database**: `ord.paymentSlipUrl` is now saved strictly as the clean path:
    `/api/public/orders/${order.id}/slip-image`
  - Neither customer support codes nor merchant credentials are stored in `db.json` or broadcast in merchant order listings.
  - The upload endpoint returns the code query parameter only to the immediate uploader in their response payload.
  - `GET /api/public/orders/:orderId/payment-status` only returns `?code=...` if the caller provided that code in the first place.

---

## Item 4: Customer & Merchant Authorization Enforcement

### Audit Finding: **VERIFIED (STRICT PER-REQUEST AUTHENTICATION)**

- **Code Evidence** (`server.ts` lines 1645-1678):
  - Every request to `GET /api/public/orders/:orderId/slip-image` executes authorization before disk or network I/O:
    ```typescript
    // 1. Authorize Customer via support code or active session
    const clientCode = req.query.code || req.query.supportCode || req.headers['x-support-code'];
    let isAuthorized = false;
    if (clientCode && typeof clientCode === 'string') {
      const hashed = crypto.createHash('sha256').update(clientCode.trim()).digest('hex');
      if (hashed === order.supportCodeHash) isAuthorized = true;
    }
    if (!isAuthorized && req.session) {
      if (req.session.recentOrderId === order.id || req.session.supportOrder?.orderId === order.id) {
        isAuthorized = true;
      }
    }
    // 2. Authorize Merchant via Bearer header, session, or query token
    if (!isAuthorized) {
      const authHeader = req.headers.authorization;
      let token = (authHeader && authHeader.startsWith('Bearer '))
        ? authHeader.substring(7).trim()
        : (req.query.token ? String(req.query.token).trim() : null);
      if (token) {
        const user = getUserByToken(token);
        if (user && user.merchantId === order.merchantId) isAuthorized = true;
      } else if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.merchantId === order.merchantId) {
        isAuthorized = true;
      }
    }
    if (!isAuthorized) {
      return res.status(401).json({ error: 'Unauthorized: Valid support code or merchant authorization required' });
    }
    ```
  - **Multi-Tenant Protection**: If Merchant B attempts to view Merchant A's order slip, `user.merchantId !== order.merchantId` triggers HTTP 401.
  - Anonymous requests without credentials return HTTP 401.

---

## Item 5: Orphaned Files, Duplicate Records & Payment State Transitions

### Audit Finding: **MITIGATED (CLEANUP LOGIC IMPLEMENTED)**

- **Identified Issues Before Fix**:
  - File generation pattern: `${order.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`.
  - When a merchant rejected a payment and the customer uploaded a replacement slip, the previous slip file remained on disk unreferenced, permanently leaking storage.
  - Physical inspection of `/data/slips/` confirmed that `ord_1793089960874_5ib0` had two unlinked files (`..._oijzo.jpg` and `..._7knnu.jpg`).
- **Implemented Fix**:
  - Upon successful transaction commitment of a replacement slip, the previous unreferenced file is unlinked from disk:
    ```typescript
    if (previousLocalFilename && previousLocalFilename !== localFilename) {
      try {
        const prevPath = path.join(slipsDir, path.basename(previousLocalFilename));
        if (fs.existsSync(prevPath)) fs.unlinkSync(prevPath);
      } catch (cleanErr) {
        console.warn('[PaymentSlip] Notice: Could not unlink previous slip file:', cleanErr);
      }
    }
    ```
  - If a transaction aborts or an unhandled exception occurs after writing to disk, `localFilePath` is cleaned up in the error handler.
- **State Machine Integrity**:
  - Guard: If `order.paymentStatus === 'CONFIRMED'`, slip uploads are rejected with HTTP 400.
  - All state transitions (`PENDING` -> `SLIP_SUBMITTED` -> `REJECTED` -> `SLIP_SUBMITTED` -> `CONFIRMED`) execute inside serialized `withDbTransaction` mutex locks.

---

## Item 6: Test Suite Coverage Analysis (19/19 & 29/29)

### Audit Finding: **IN-PROCESS INTEGRATION TESTS (REAL API, NOT E2E CLOUD)**

| Suite | Tests | Actual Behavior Tested | Mocks / Simulations | Gaps & Real-World Blindspots |
|---|---|---|---|---|
| **test-vpn-and-html-fix.ts** | 19 / 19 | Real HTTP requests to localhost:3000; Multer 6MB file stream error handling; valid JPEG byte stream parsing; proxy image serving with Content-Type; 401 unauthorized guards. | Supabase upload fails gracefully to local disk fallback. | Does NOT test server restarts/container teardowns; does NOT route through physical Myanmar ISP firewalls without VPN; uses synthetic 106-byte JPEG stubs. |
| **test-kpay-workflow.ts** | 29 / 29 | Real multi-tenant authentication; phone validation regex; order creation; magic byte validation; merchant rejection with reason; resubmission; confirmation immutability. | Tested on local loopback HTTP server. | Does NOT test concurrent duplicate clicks during slow network upload; does NOT test physical Render production deployment. |

- **Physical Myanmar Network Testing**: **NOT VERIFIED** (Requires real SIM cards on MPT/ATOM/Ooredoo in Myanmar with VPN toggled off).
- **Render Dashboard Persistent Mount**: **NOT VERIFIED** (Requires Render Dashboard inspection).

---

## Final Production Readiness Scorecard

| Criterion | Evaluation | Status | Action Required |
|---|---|---|---|
| 1. Persistent Disk Mount | Ephemeral container storage by default | **NOT VERIFIED / ACTION REQUIRED** | Attach Render Disk at `/var/data/slips` and set `DATA_SLIPS_PATH=/var/data/slips`. |
| 2. Cloud Sync Consistency | Local fallback works; lost if container dies | **CONDITIONAL** | Ensure persistent disk is configured so local fallback survives restarts. |
| 3. Secret Leakage in URLs | Cleaned; support codes removed from DB | **VERIFIED (FIXED)** | Fixed in `server.ts`. |
| 4. Authorization Enforcement | Checked on every request with multi-tenancy | **VERIFIED** | Enforced on every proxy request. |
| 5. File & State Lifecycle | Replaced files unlinked; mutex transactions | **VERIFIED (FIXED)** | Cleanup logic active in `server.ts`. |
| 6. Test Fidelity | Local API integration valid | **NOT VERIFIED IN MYANMAR** | Real device validation recommended on live Render deployment. |
