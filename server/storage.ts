import { initializeApp, cert, getApps, deleteApp, App } from 'firebase-admin/app';
import { getStorage, Storage } from 'firebase-admin/storage';

export const STORAGE_ENV_VARS = {
  BUCKET: 'FIREBASE_STORAGE_BUCKET',
  PROJECT_ID: 'FIREBASE_PROJECT_ID',
  CLIENT_EMAIL: 'FIREBASE_CLIENT_EMAIL',
  PRIVATE_KEY: 'FIREBASE_PRIVATE_KEY',
} as const;

export interface StorageStatus {
  available: boolean;
  configured: boolean;
  bucketName: string | null;
  projectId: string | null;
  status: 'ready' | 'unconfigured' | 'initialization_failed';
  missingVariables?: string[];
  reason?: string;
}

export class StorageUnavailableError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;

  constructor(
    message: string = 'Media storage is currently unavailable or unconfigured.',
    code: string = 'STORAGE_UNAVAILABLE',
    httpStatus: number = 503
  ) {
    super(message);
    this.name = 'StorageUnavailableError';
    this.code = code;
    this.httpStatus = httpStatus;
    Object.setPrototypeOf(this, StorageUnavailableError.prototype);
  }
}

const STORAGE_APP_NAME = 'myanmar-seller-storage';

let storageAppInstance: App | null = null;
let storageBucketInstance: any = null;
let cachedStatus: StorageStatus | null = null;

function sanitizeBucketName(rawBucket: string | undefined): string | null {
  if (!rawBucket || typeof rawBucket !== 'string') return null;
  const trimmed = rawBucket.trim();
  if (!trimmed) return null;
  // Remove gs:// prefix if provided
  return trimmed.replace(/^gs:\/\//i, '').replace(/\/+$/, '');
}

export function validateStorageConfig(): {
  isValid: boolean;
  missing: string[];
  bucketName: string | null;
  projectId: string | null;
  clientEmail: string | null;
  privateKey: string | null;
} {
  const bucketName = sanitizeBucketName(process.env[STORAGE_ENV_VARS.BUCKET]);
  const projectId = process.env[STORAGE_ENV_VARS.PROJECT_ID]?.trim() || null;
  const clientEmail = process.env[STORAGE_ENV_VARS.CLIENT_EMAIL]?.trim() || null;
  const rawPrivateKey = process.env[STORAGE_ENV_VARS.PRIVATE_KEY]?.trim() || null;

  const missing: string[] = [];
  if (!bucketName) missing.push(STORAGE_ENV_VARS.BUCKET);
  if (!projectId) missing.push(STORAGE_ENV_VARS.PROJECT_ID);
  if (!clientEmail) missing.push(STORAGE_ENV_VARS.CLIENT_EMAIL);
  if (!rawPrivateKey) missing.push(STORAGE_ENV_VARS.PRIVATE_KEY);

  let privateKey: string | null = null;
  if (rawPrivateKey) {
    // Correctly format PEM-encoded private keys with escaped newlines
    privateKey = rawPrivateKey.replace(/\\n/g, '\n');
  }

  return {
    isValid: missing.length === 0,
    missing,
    bucketName,
    projectId,
    clientEmail,
    privateKey,
  };
}

export function initStorageAdapter(): StorageStatus {
  // Return cached status if already initialized and active
  if (cachedStatus && cachedStatus.status === 'ready' && storageBucketInstance) {
    return cachedStatus;
  }

  const config = validateStorageConfig();

  if (!config.isValid) {
    cachedStatus = {
      available: false,
      configured: false,
      bucketName: config.bucketName,
      projectId: config.projectId,
      status: 'unconfigured',
      missingVariables: config.missing,
      reason: `Missing required storage environment variables: [${config.missing.join(', ')}]`,
    };
    return cachedStatus;
  }

  try {
    // Re-use or cleanly re-initialize named Firebase App
    const existingApps = getApps();
    const existing = existingApps.find(a => a.name === STORAGE_APP_NAME);
    if (existing) {
      storageAppInstance = existing;
    } else {
      storageAppInstance = initializeApp(
        {
          credential: cert({
            projectId: config.projectId!,
            clientEmail: config.clientEmail!,
            privateKey: config.privateKey!,
          }),
          storageBucket: config.bucketName!,
        },
        STORAGE_APP_NAME
      );
    }

    const storage = getStorage(storageAppInstance);
    storageBucketInstance = storage.bucket(config.bucketName!);

    cachedStatus = {
      available: true,
      configured: true,
      bucketName: config.bucketName,
      projectId: config.projectId,
      status: 'ready',
    };

    return cachedStatus;
  } catch (err: any) {
    // Fail closed safely without leaking credentials or raw stack traces
    storageAppInstance = null;
    storageBucketInstance = null;

    cachedStatus = {
      available: false,
      configured: false,
      bucketName: config.bucketName,
      projectId: config.projectId,
      status: 'initialization_failed',
      reason: 'Failed to initialize Firebase Admin Storage with provided credentials.',
    };

    console.error(
      '[StorageAdapter] Firebase Storage initialization failed safely:',
      err?.code || 'INITIALIZATION_ERROR'
    );

    return cachedStatus;
  }
}

export function getStorageStatus(): StorageStatus {
  if (!cachedStatus) {
    return initStorageAdapter();
  }
  return cachedStatus;
}

export function isStorageConfigured(): boolean {
  const status = getStorageStatus();
  return status.available && status.status === 'ready';
}

export function getStorageBucket(): any {
  const status = getStorageStatus();
  if (!status.available || !storageBucketInstance) {
    throw new StorageUnavailableError(
      status.reason || 'Firebase Cloud Storage is unconfigured or unavailable.',
      status.status === 'unconfigured' ? 'STORAGE_UNCONFIGURED' : 'STORAGE_UNAVAILABLE',
      503
    );
  }
  return storageBucketInstance;
}

export function ensureStorageReady(): void {
  getStorageBucket();
}

/**
 * Resets adapter state strictly for automated test suites.
 */
export async function resetStorageAdapterForTesting(): Promise<void> {
  if (storageAppInstance) {
    try {
      await deleteApp(storageAppInstance);
    } catch {
      // Ignore cleanup error in test reset
    }
  }
  storageAppInstance = null;
  storageBucketInstance = null;
  cachedStatus = null;
}
