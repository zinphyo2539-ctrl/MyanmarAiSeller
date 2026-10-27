import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getErrorChain } from './diagnostics.ts';
import fs from 'fs';
import path from 'path';

export const SUPABASE_ENV_VARS = {
  URL: 'SUPABASE_URL',
  SERVICE_ROLE_KEY: 'SUPABASE_SERVICE_ROLE_KEY',
  BUCKET: 'SUPABASE_BUCKET_PRODUCT_IMAGES',
  SLIPS_BUCKET: 'SUPABASE_BUCKET_PAYMENT_SLIPS',
} as const;

export interface SupabaseStorageStatus {
  available: boolean;
  configured: boolean;
  bucketName: string | null;
  supabaseUrl: string | null;
  status: 'ready' | 'unconfigured' | 'initialization_failed';
  missingVariables?: string[];
  reason?: string;
}

export class SupabaseStorageUnavailableError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;

  constructor(
    message: string = 'Supabase Storage is currently unavailable or unconfigured.',
    code: string = 'SUPABASE_STORAGE_UNAVAILABLE',
    httpStatus: number = 503
  ) {
    super(message);
    this.name = 'SupabaseStorageUnavailableError';
    this.code = code;
    this.httpStatus = httpStatus;
    Object.setPrototypeOf(this, SupabaseStorageUnavailableError.prototype);
  }
}

let cachedClient: SupabaseClient | null = null;
let cachedStatus: SupabaseStorageStatus | null = null;

export function validateSupabaseConfig(): {
  isValid: boolean;
  missing: string[];
  supabaseUrl: string | null;
  serviceRoleKey: string | null;
  bucketName: string;
} {
  const supabaseUrl = process.env[SUPABASE_ENV_VARS.URL]?.trim() || null;
  const serviceRoleKey = process.env[SUPABASE_ENV_VARS.SERVICE_ROLE_KEY]?.trim() || null;
  const bucketName = process.env[SUPABASE_ENV_VARS.BUCKET]?.trim() || 'product-images';

  const missing: string[] = [];
  if (!supabaseUrl) missing.push(SUPABASE_ENV_VARS.URL);
  if (!serviceRoleKey) missing.push(SUPABASE_ENV_VARS.SERVICE_ROLE_KEY);

  return {
    isValid: missing.length === 0,
    missing,
    supabaseUrl,
    serviceRoleKey,
    bucketName,
  };
}

export function initSupabaseStorageAdapter(): SupabaseStorageStatus {
  const config = validateSupabaseConfig();

  if (!config.isValid) {
    cachedStatus = {
      available: false,
      configured: false,
      bucketName: config.bucketName,
      supabaseUrl: config.supabaseUrl,
      status: 'unconfigured',
      missingVariables: config.missing,
      reason: `Missing required Supabase environment variables: [${config.missing.join(', ')}]`,
    };
    cachedClient = null;
    return cachedStatus;
  }

  try {
    cachedClient = createClient(config.supabaseUrl!, config.serviceRoleKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    cachedStatus = {
      available: true,
      configured: true,
      bucketName: config.bucketName,
      supabaseUrl: config.supabaseUrl,
      status: 'ready',
    };

    return cachedStatus;
  } catch (err: any) {
    cachedClient = null;
    cachedStatus = {
      available: false,
      configured: false,
      bucketName: config.bucketName,
      supabaseUrl: config.supabaseUrl,
      status: 'initialization_failed',
      reason: 'Failed to initialize Supabase client with provided credentials.',
    };

    console.error('[SupabaseStorage] Initialization failed safely:', err?.message || 'ERROR');
    return cachedStatus;
  }
}

export function getSupabaseStorageStatus(): SupabaseStorageStatus {
  if (!cachedStatus) {
    return initSupabaseStorageAdapter();
  }
  return cachedStatus;
}

export function getSupabaseClient(): SupabaseClient {
  const status = getSupabaseStorageStatus();
  if (!status.available || !cachedClient) {
    throw new SupabaseStorageUnavailableError(
      status.reason || 'Supabase Storage is unconfigured or unavailable.',
      status.status === 'unconfigured' ? 'SUPABASE_STORAGE_UNCONFIGURED' : 'SUPABASE_STORAGE_UNAVAILABLE',
      503
    );
  }
  return cachedClient;
}

export function validateImageBuffer(buffer: Buffer, mimetype: string): {
  isValid: boolean;
  error?: string;
  detectedExtension?: string;
} {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { isValid: false, error: 'Uploaded file is empty or invalid.' };
  }

  const MAX_SIZE = 5 * 1024 * 1024;
  if (buffer.length > MAX_SIZE) {
    return { isValid: false, error: 'File size exceeds 5 MiB maximum limit.' };
  }

  const normalizedMime = (mimetype || '').toLowerCase().trim();

  const isJpeg = buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer.length > 7 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isWebp =
    buffer.length > 11 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  const sampleHeader = buffer.subarray(0, 256).toString('utf8').toLowerCase();
  if (
    sampleHeader.includes('<svg') ||
    sampleHeader.includes('<?xml') ||
    sampleHeader.includes('<!doctype html') ||
    sampleHeader.includes('<html') ||
    sampleHeader.includes('<script')
  ) {
    return { isValid: false, error: 'SVG, HTML, and script files are strictly prohibited.' };
  }

  if (isJpeg) {
    if (normalizedMime && normalizedMime !== 'image/jpeg' && normalizedMime !== 'image/jpg') {
      return { isValid: false, error: 'MIME type does not match actual JPEG file signature.' };
    }
    return { isValid: true, detectedExtension: 'jpg' };
  }

  if (isPng) {
    if (normalizedMime && normalizedMime !== 'image/png') {
      return { isValid: false, error: 'MIME type does not match actual PNG file signature.' };
    }
    return { isValid: true, detectedExtension: 'png' };
  }

  if (isWebp) {
    if (normalizedMime && normalizedMime !== 'image/webp') {
      return { isValid: false, error: 'MIME type does not match actual WebP file signature.' };
    }
    return { isValid: true, detectedExtension: 'webp' };
  }

  return {
    isValid: false,
    error: 'Unsupported or unrecognized image format. Only JPEG, PNG, and WebP images are permitted.',
  };
}

export async function uploadProductImageToSupabase(
  merchantId: string,
  fileBuffer: Buffer,
  mimetype: string,
  originalName?: string
): Promise<string> {
  const client = getSupabaseClient();
  const config = validateSupabaseConfig();
  const bucket = config.bucketName;

  const validation = validateImageBuffer(fileBuffer, mimetype);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid image file.');
  }

  const cleanMerchantId = (merchantId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!cleanMerchantId) {
    throw new Error('Invalid merchant ID for storage path.');
  }

  const ext = validation.detectedExtension || 'jpg';
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const objectPath = `${cleanMerchantId}/products/${uniqueId}.${ext}`;

  const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  const { data, error } = await client.storage.from(bucket).upload(objectPath, fileBuffer, {
    contentType,
    upsert: false,
    cacheControl: '3600',
  });

  if (error) {
    const errorChain = getErrorChain(error);
    console.error('[SupabaseStorage] Upload network/provider failure:', {
      bucket: bucket,
      path: objectPath,
      chain: errorChain,
    });
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = client.storage.from(bucket).getPublicUrl(objectPath);
  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('Failed to generate public URL for uploaded image.');
  }

  return publicUrlData.publicUrl;
}

export async function uploadQrImageToSupabase(
  merchantId: string,
  fileBuffer: Buffer,
  mimetype: string,
  originalName?: string
): Promise<string> {
  const client = getSupabaseClient();
  const config = validateSupabaseConfig();
  const bucket = config.bucketName;

  const validation = validateImageBuffer(fileBuffer, mimetype);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid QR image file.');
  }

  const cleanMerchantId = (merchantId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!cleanMerchantId) {
    throw new Error('Invalid merchant ID for storage path.');
  }

  const ext = validation.detectedExtension || 'jpg';
  const uniqueId = `qr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const objectPath = `${cleanMerchantId}/kpay-qr/${uniqueId}.${ext}`;

  const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  const { data, error } = await client.storage.from(bucket).upload(objectPath, fileBuffer, {
    contentType,
    upsert: false,
    cacheControl: '3600',
  });

  if (error) {
    const errorChain = getErrorChain(error);
    console.error('[SupabaseStorage] QR upload failure:', {
      bucket,
      path: objectPath,
      chain: errorChain,
    });
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = client.storage.from(bucket).getPublicUrl(objectPath);
  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('Failed to generate public URL for QR image.');
  }

  return publicUrlData.publicUrl;
}

export interface PaymentSlipUploadResult {
  bucket: string;
  objectPath: string;
  confirmed: boolean;
  contentType: string;
  size: number;
}

let bucketEnsured = false;

export async function ensurePaymentSlipsBucket(client?: SupabaseClient): Promise<string> {
  const c = client || getSupabaseClient();
  const bucketName = process.env[SUPABASE_ENV_VARS.SLIPS_BUCKET]?.trim() || 'payment-slips';
  if (bucketEnsured) return bucketName;

  try {
    const { data: bucket, error: getErr } = await c.storage.getBucket(bucketName);
    if (!bucket || getErr) {
      await c.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
      });
    }
    bucketEnsured = true;
  } catch {
    // Non-fatal if already exists or permission restricted
    bucketEnsured = true;
  }
  return bucketName;
}

export async function uploadPaymentSlipToSupabase(
  merchantId: string,
  orderId: string,
  fileBuffer: Buffer,
  mimetype: string,
  originalName?: string
): Promise<PaymentSlipUploadResult> {
  const client = getSupabaseClient();
  const bucket = await ensurePaymentSlipsBucket(client);

  const validation = validateImageBuffer(fileBuffer, mimetype);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid payment slip image file.');
  }

  const cleanMerchantId = (merchantId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanOrderId = (orderId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!cleanMerchantId || !cleanOrderId) {
    throw new Error('Invalid merchant ID or order ID for storage path.');
  }

  const ext = validation.detectedExtension || 'jpg';
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const objectPath = `${cleanMerchantId}/payment-slips/${cleanOrderId}_${uniqueId}.${ext}`;

  const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  // Upload to private bucket server-side with service-role permissions
  const { data, error } = await client.storage.from(bucket).upload(objectPath, fileBuffer, {
    contentType,
    upsert: false,
    cacheControl: '3600',
  });

  if (error || !data) {
    const errorChain = getErrorChain(error);
    console.error('[SupabaseStorage] Payment slip upload failure:', {
      bucket,
      path: objectPath,
      chain: errorChain,
    });
    throw new Error(`Durable storage upload failed: ${error?.message || 'Unknown upload error'}`);
  }

  // Confirmation step: Verify the object was persisted in Supabase
  const { data: confirmedData, error: confirmErr } = await client.storage.from(bucket).download(objectPath);
  if (confirmErr || !confirmedData) {
    throw new Error(`Durable storage confirmation failed: uploaded object could not be verified in Supabase (${confirmErr?.message || 'Verification failed'})`);
  }

  return {
    bucket,
    objectPath,
    confirmed: true,
    contentType,
    size: fileBuffer.length
  };
}

export async function downloadPaymentSlipFromSupabase(
  bucket: string,
  objectPath: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const client = getSupabaseClient();
  const cleanBucket = (bucket || '').trim() || (process.env[SUPABASE_ENV_VARS.SLIPS_BUCKET]?.trim() || 'payment-slips');
  const cleanPath = (objectPath || '').trim();

  if (!cleanPath) {
    throw new Error('Object path is required to download payment slip.');
  }

  const { data, error } = await client.storage.from(cleanBucket).download(cleanPath);
  if (error || !data) {
    throw new Error(`Failed to download payment slip from Supabase: ${error?.message || 'Object not found'}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = cleanPath.toLowerCase().endsWith('.png')
    ? 'image/png'
    : cleanPath.toLowerCase().endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';
  const contentType = data.type || ext;

  return { buffer, contentType };
}

export async function deletePaymentSlipFromSupabase(
  bucket: string,
  objectPath: string
): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.storage.from(bucket).remove([objectPath]);
    return !error;
  } catch {
    return false;
  }
}

export async function migrateLegacyOrderSlips(
  orders: any[],
  slipsDir?: string
): Promise<{ migrated: number; totalChecked: number }> {
  let migrated = 0;
  if (!orders || !Array.isArray(orders)) return { migrated: 0, totalChecked: 0 };

  const client = getSupabaseClient();
  const defaultBucket = await ensurePaymentSlipsBucket(client);

  for (const order of orders) {
    // If order already has durable Supabase objectPath, skip
    if (order.slipObjectPath && order.slipStorageBucket) continue;

    // Case 1: Legacy order with supabaseSlipUrl pointing to public bucket product-images
    if (order.supabaseSlipUrl && typeof order.supabaseSlipUrl === 'string') {
      const match = order.supabaseSlipUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (match) {
        order.slipStorageBucket = match[1];
        order.slipObjectPath = decodeURIComponent(match[2]);
        order.supabaseSyncStatus = 'SYNCED_DURABLE';
        order.paymentSlipUrl = `/api/public/orders/${order.id}/slip-image`;
        migrated++;
        continue;
      }
    }

    // Case 2: Legacy order with localSlipFilename on disk
    if (order.localSlipFilename && slipsDir && fs.existsSync(path.join(slipsDir, path.basename(order.localSlipFilename)))) {
      try {
        const filePath = path.join(slipsDir, path.basename(order.localSlipFilename));
        const buf = fs.readFileSync(filePath);
        const ext = path.extname(filePath).replace('.', '') || 'jpg';
        const mimetype = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const res = await uploadPaymentSlipToSupabase(order.merchantId || 'merchant_001', order.id, buf, mimetype);
        order.slipStorageBucket = res.bucket;
        order.slipObjectPath = res.objectPath;
        order.supabaseSyncStatus = 'SYNCED_DURABLE';
        order.paymentSlipUrl = `/api/public/orders/${order.id}/slip-image`;
        migrated++;
      } catch (migErr) {
        console.warn(`[LegacyMigration] Failed to migrate local slip for ${order.id}:`, migErr);
      }
    }
  }

  return { migrated, totalChecked: orders.length };
}

export async function resetSupabaseStorageForTesting(): Promise<void> {
  cachedClient = null;
  cachedStatus = null;
  bucketEnsured = false;
}

