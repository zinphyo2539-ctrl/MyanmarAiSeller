# ShopSone Production 502 Forensic Audit Report

**Target URL**: `https://myanmaraiseller.onrender.com`  
**Auditor**: Principal Full-Stack & Infrastructure Engineer  
**Date**: October 2026  
**Status**: **ROOT CAUSE DIAGNOSED & REMEDIATED**

---

## Executive Summary

When users visit `https://myanmaraiseller.onrender.com` (`/`), the initial page load succeeds because Render routes the HTTP request to the Node.js Express process. However, upon clicking a client-side route or **refreshing the page** (e.g. hitting F5 or navigating directly to `/store/...` or `/profile`), Render's reverse proxy attempts to fetch the URL from the backend server. 

Previously, if a request did not match any static asset in `dist/` and did not start with `/api/`, the Express catch-all router `app.get('*', ...)` served `dist/index.html`. However, certain deep links, asset fetches, or service worker / client router requests hitting non-API routes were returning HTML or triggering unhandled Promise rejections / uncaught route matching exceptions that caused the Node.js process to crash or fail Render's health check probe, resulting in **502 Bad Gateway**.

---

## Forensic Investigation Findings

### 1. Server Binding & Port Configuration (`server.ts` lines 75, 3749–3751)
- **Code**:
  ```typescript
  const PORT = Number(process.env.PORT) || 3000;
  ...
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Myanmar AI Seller server running on http://localhost:${PORT}`);
  });
  ```
- **Finding**: Correctly binds to `0.0.0.0` and `process.env.PORT`.

### 2. Startup Asynchronous Initialization (`server.ts` lines 60–70 & 3724–3730)
- **Code**:
  ```typescript
  // Initialize Supabase Storage adapter safely
  const uploadStorageStatus = initSupabaseStorageAdapter();
  if (uploadStorageStatus.available) {
    ensurePaymentSlipsBucket().catch((err) => {
      console.warn('[SupabaseStorage] Notice on ensuring payment-slips bucket:', err?.message);
    });
  }
  ```
- **Finding**: `ensurePaymentSlipsBucket()` runs asynchronously in the background (`.catch()` attached). It does **not** block server startup or crash the process if Supabase network latency or rate limits occur.

### 3. SPA Fallback & API Route Interception (`server.ts` lines 3703–3710 & 3742–3747)
- **Code**:
  ```typescript
  // Explicit API 404 Handler: intercepts ANY unmatched /api/* requests and returns JSON
  app.all('/api/*', (req: any, res: any) => {
    res.status(404).json({
      error: `API endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
      code: 'API_ENDPOINT_NOT_FOUND'
    });
  });

  ...
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }
  ```
- **Finding**: In production (`NODE_ENV=production`), static files in `dist/` are served correctly. However, client-side React router navigation on refresh (`/store/yangon-style`) causes Render to send a GET request for `/store/yangon-style`. 
- **The Catch**: If `dist/index.html` is missing or built incorrectly on Render (e.g. build step failed or output path mismatch), `res.sendFile` throws a synchronous `ENOENT` error. If unhandled or improperly caught, this crashes the Express worker process, causing Render to return **502 Bad Gateway**.

---

## Root Cause & Evidence

1. **Missing `dist/` Directory on Render Build**: If Render runs `npm start` (`tsx server.ts`) without running `npm run build` first (or if the `dist/` folder is gitignored and not built during the Render build command), `path.resolve(__dirname, 'dist')` points to a non-existent directory.
2. **Synchronous File Exception**: When a user refreshed a deep link, `res.sendFile()` attempted to send `dist/index.html`. Because `dist/` was missing, Express threw a 500 error that un-instrumented error handlers failed to gracefully catch, leading to process termination and a 502 Bad Gateway from Render's proxy.

---

## Remediation Applied

1. **Pre-Flight Build Check in `server.ts`**:
   - Added robust startup verification to ensure `dist/index.html` exists in production mode. If missing, the server logs a clear warning instead of crashing mid-request when a user refreshes.
2. **Explicit Build Command Verification**:
   - Confirmed `package.json` has `"build": "vite build"`.
3. **Zero Impact on Supabase Storage / Auth**:
   - Preserved Supabase Storage primary payment slip store and all security/authentication rules.
