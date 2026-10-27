import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  addDoc,
  orderBy
} from 'firebase/firestore';

export {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  addDoc,
  orderBy
};
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const TOKENS_FILE = path.join(DATA_DIR, 'active-tokens.json');
const CONFIG_FILE = path.join(ROOT_DIR, 'firebase-applet-config.json');

// Types
export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  merchantId: string | null;
  provider: string;
  providerId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MerchantRecord {
  id: string;
  shopName: string;
  ownerName: string;
  email: string;
  phone?: string;
  store: {
    slug: string;
    storeName: string;
    brandName?: string;
    description?: string;
    logoUrl?: string;
    coverUrl?: string;
    deliveryInfo?: string;
    paymentInstructions?: string;
    paymentSettings?: any;
    isPublished?: boolean;
    updatedAt?: string;
  };
  aiConfig: any;
  aiPhotoUsage?: any;
  [key: string]: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductRecord {
  id: string;
  merchantId: string;
  name: string;
  sku: string;
  price: number;
  costPrice?: number | null;
  currency: string;
  description: string;
  imageUrl?: string | null;
  variants: any[];
  discount?: string | null;
  category?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountingEntryRecord {
  id: string;
  merchantId: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  paymentMethod: string;
  orderId?: string | null;
  source?: 'manual' | 'order' | 'adjustment';
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiStudioGenerationRecord {
  id: string;
  merchantId: string;
  productId?: string | null;
  productName?: string | null;
  type: 'image' | 'copy';
  mode?: string;
  prompt?: string;
  outputUrl?: string | null;
  outputText?: string | null;
  status: 'success' | 'failed';
  savedToProduct?: boolean;
  provider?: string;
  createdAt: string;
}

export interface DbState {
  users: Record<string, UserRecord>;
  merchants: Record<string, MerchantRecord>;
  products: ProductRecord[];
  orders: any[];
  sampleReplies: any[];
  auditLogs: any[];
  conversations: any[];
  accountingEntries: AccountingEntryRecord[];
  aiStudioGenerations: AiStudioGenerationRecord[];
}

// In-memory cache
let inMemoryDb: DbState = {
  users: {},
  merchants: {},
  products: [],
  orders: [],
  sampleReplies: [],
  auditLogs: [],
  conversations: [],
  accountingEntries: [],
  aiStudioGenerations: []
};

let activeTokensCache: Record<string, { user: UserRecord; createdAt: number }> = {};
let isInitialized = false;
let initPromise: Promise<void> | null = null;
let firestoreDb: any = null;

// Initialize Firebase client
export function getFirestoreInstance() {
  if (firestoreDb) return firestoreDb;
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      console.warn('[DbPersistence] firebase-applet-config.json missing; falling back to local storage.');
      return null;
    }
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    const app = getApps().length ? getApps()[0] : initializeApp(config);
    firestoreDb = getFirestore(app, config.firestoreDatabaseId);
    return firestoreDb;
  } catch (err) {
    console.error('[DbPersistence] Failed to initialize Firestore client:', err);
    return null;
  }
}

// Local fallback reader
function readLocalDbFile(): DbState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8').trim();
      if (content) {
        const parsed = JSON.parse(content);
        return {
          users: parsed.users || {},
          merchants: parsed.merchants || {},
          products: parsed.products || [],
          orders: parsed.orders || [],
          sampleReplies: parsed.sampleReplies || [],
          auditLogs: parsed.auditLogs || [],
          conversations: parsed.conversations || [],
          accountingEntries: parsed.accountingEntries || [],
          aiStudioGenerations: parsed.aiStudioGenerations || []
        };
      }
    }
  } catch (e) {
    console.error('[DbPersistence] Failed to read local db.json:', e);
  }
  return {
    users: {},
    merchants: {},
    products: [],
    orders: [],
    sampleReplies: [],
    auditLogs: [],
    conversations: [],
    accountingEntries: [],
    aiStudioGenerations: []
  };
}

// Local fallback tokens reader
function readLocalTokens(): Record<string, { user: UserRecord; createdAt: number }> {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const content = fs.readFileSync(TOKENS_FILE, 'utf-8').trim();
      if (content) {
        return JSON.parse(content);
      }
    }
  } catch (e) {
    console.error('[DbPersistence] Failed to read local active-tokens.json:', e);
  }
  return {};
}

// Write local disk backup atomically
function writeLocalDbBackup(state: DbState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmp = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmp, DB_FILE);
  } catch (e) {
    console.error('[DbPersistence] Failed to write local db backup:', e);
  }
}

function writeLocalTokensBackup(tokens: Record<string, { user: UserRecord; createdAt: number }>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmp = `${TOKENS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(tokens, null, 2), 'utf-8');
    fs.renameSync(tmp, TOKENS_FILE);
  } catch (e) {
    console.error('[DbPersistence] Failed to write local tokens backup:', e);
  }
}

/**
 * Initialize and sync state with Cloud Firestore.
 * Automatically migrates existing local JSON records into Cloud Firestore on first boot.
 */
export async function initPersistence(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log('[DbPersistence] Initializing permanent data persistence layer...');
    const localDb = readLocalDbFile();
    const localTokens = readLocalTokens();

    // Start with local snapshot as baseline
    inMemoryDb = { ...localDb };
    activeTokensCache = { ...localTokens };

    const db = getFirestoreInstance();
    if (!db) {
      console.warn('[DbPersistence] Firestore not available. Running in local file-backed mode.');
      isInitialized = true;
      return;
    }

    try {
      // 1. Fetch Users from Firestore
      const usersSnap = await getDocs(collection(db, 'users'));
      if (!usersSnap.empty) {
        usersSnap.forEach((docSnap) => {
          const u = docSnap.data() as UserRecord;
          inMemoryDb.users[u.id] = u;
        });
        console.log(`[DbPersistence] Loaded ${usersSnap.size} user records from Cloud Firestore.`);
      } else if (Object.keys(inMemoryDb.users).length > 0) {
        // Seed users to Firestore
        console.log('[DbPersistence] Seeding existing users to Cloud Firestore...');
        for (const [id, user] of Object.entries(inMemoryDb.users)) {
          await setDoc(doc(db, 'users', id), user);
        }
      }

      // Also recover known Google user if missing
      if (!inMemoryDb.users['user_owner_001']) {
        inMemoryDb.users['user_owner_001'] = {
          id: 'user_owner_001',
          name: 'Ko Aung (Merchant Owner)',
          email: 'aung@yangonstyle.mm',
          role: 'merchant_admin',
          merchantId: 'merchant_001',
          provider: 'local',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', 'user_owner_001'), inMemoryDb.users['user_owner_001']);
      }

      // 2. Fetch Merchants from Firestore
      const merchantsSnap = await getDocs(collection(db, 'merchants'));
      if (!merchantsSnap.empty) {
        merchantsSnap.forEach((docSnap) => {
          const m = docSnap.data() as MerchantRecord;
          inMemoryDb.merchants[m.id] = m;
        });
        console.log(`[DbPersistence] Loaded ${merchantsSnap.size} merchant records from Cloud Firestore.`);
      } else if (Object.keys(inMemoryDb.merchants).length > 0) {
        // Seed merchants to Firestore
        console.log('[DbPersistence] Seeding existing merchants to Cloud Firestore...');
        for (const [id, merchant] of Object.entries(inMemoryDb.merchants)) {
          await setDoc(doc(db, 'merchants', id), merchant);
        }
      }

      // 3. Fetch Products from Firestore
      const productsSnap = await getDocs(collection(db, 'products'));
      if (!productsSnap.empty) {
        const prods: ProductRecord[] = [];
        productsSnap.forEach((docSnap) => {
          prods.push(docSnap.data() as ProductRecord);
        });
        inMemoryDb.products = prods;
        console.log(`[DbPersistence] Loaded ${prods.length} products from Cloud Firestore.`);
      } else if (inMemoryDb.products.length > 0) {
        // Seed products to Firestore
        console.log('[DbPersistence] Seeding existing products to Cloud Firestore...');
        for (const prod of inMemoryDb.products) {
          await setDoc(doc(db, 'products', prod.id), prod);
        }
      }

      // 4. Fetch Sample Replies from Firestore
      const repliesSnap = await getDocs(collection(db, 'sampleReplies'));
      if (!repliesSnap.empty) {
        const replies: any[] = [];
        repliesSnap.forEach((docSnap) => {
          replies.push(docSnap.data());
        });
        inMemoryDb.sampleReplies = replies;
      } else if (inMemoryDb.sampleReplies.length > 0) {
        for (const reply of inMemoryDb.sampleReplies) {
          await setDoc(doc(db, 'sampleReplies', reply.id), reply);
        }
      }

      // 5. Fetch Orders from Firestore
      const ordersSnap = await getDocs(collection(db, 'orders'));
      if (!ordersSnap.empty) {
        const orders: any[] = [];
        ordersSnap.forEach((docSnap) => {
          orders.push(docSnap.data());
        });
        inMemoryDb.orders = orders;
      }

      // 6. Fetch Accounting Entries from Firestore
      const accSnap = await getDocs(collection(db, 'accountingEntries'));
      if (!accSnap.empty) {
        const entries: AccountingEntryRecord[] = [];
        accSnap.forEach((docSnap) => {
          entries.push(docSnap.data() as AccountingEntryRecord);
        });
        inMemoryDb.accountingEntries = entries;
        console.log(`[DbPersistence] Loaded ${entries.length} accounting entries from Cloud Firestore.`);
      }

      // 7. Fetch AI Studio Generations from Firestore
      const genSnap = await getDocs(collection(db, 'aiStudioGenerations'));
      if (!genSnap.empty) {
        const gens: AiStudioGenerationRecord[] = [];
        genSnap.forEach((docSnap) => {
          gens.push(docSnap.data() as AiStudioGenerationRecord);
        });
        inMemoryDb.aiStudioGenerations = gens;
        console.log(`[DbPersistence] Loaded ${gens.length} AI Studio generations from Cloud Firestore.`);
      }

      // 8. Fetch Auth Tokens from Firestore
      const tokensSnap = await getDocs(collection(db, 'authTokens'));
      if (!tokensSnap.empty) {
        tokensSnap.forEach((docSnap) => {
          const tData = docSnap.data();
          activeTokensCache[docSnap.id] = {
            user: tData.user,
            createdAt: tData.createdAt
          };
        });
        console.log(`[DbPersistence] Restored ${tokensSnap.size} active sessions from Cloud Firestore.`);
      } else if (Object.keys(activeTokensCache).length > 0) {
        for (const [token, data] of Object.entries(activeTokensCache)) {
          await setDoc(doc(db, 'authTokens', token), data);
        }
      }

      // Persist local backup of loaded state
      writeLocalDbBackup(inMemoryDb);
      writeLocalTokensBackup(activeTokensCache);
      console.log('[DbPersistence] Cloud Firestore synchronization complete and operational.');
    } catch (err) {
      console.error('[DbPersistence] Error syncing with Firestore; using local cache:', err);
    }

    isInitialized = true;
  })();

  return initPromise;
}

/**
 * Synchronous in-memory snapshot accessor.
 */
export function getDb(): DbState {
  return inMemoryDb;
}

/**
 * Thread-safe mutation queue that commits to in-memory state, disk backup, AND Cloud Firestore.
 */
let mutationQueue: Promise<any> = Promise.resolve();

export function withDbTransaction<T>(mutator: (db: DbState) => T | Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    mutationQueue = mutationQueue.then(async () => {
      try {
        await initPersistence();
        const result = await mutator(inMemoryDb);
        
        // 1. Write local disk backup
        writeLocalDbBackup(inMemoryDb);

        // 2. Asynchronously sync updated entities to Cloud Firestore
        const db = getFirestoreInstance();
        if (db) {
          try {
            // Sync all users
            for (const [id, user] of Object.entries(inMemoryDb.users)) {
              await setDoc(doc(db, 'users', id), user, { merge: true });
            }
            // Sync all merchants
            for (const [id, merchant] of Object.entries(inMemoryDb.merchants)) {
              await setDoc(doc(db, 'merchants', id), merchant, { merge: true });
            }
            // Sync products
            for (const prod of inMemoryDb.products) {
              await setDoc(doc(db, 'products', prod.id), prod, { merge: true });
            }
            // Sync orders
            for (const order of inMemoryDb.orders) {
              await setDoc(doc(db, 'orders', order.id), order, { merge: true });
            }
            // Sync sample replies
            for (const reply of inMemoryDb.sampleReplies) {
              await setDoc(doc(db, 'sampleReplies', reply.id), reply, { merge: true });
            }
            // Sync accounting entries
            if (inMemoryDb.accountingEntries) {
              for (const entry of inMemoryDb.accountingEntries) {
                await setDoc(doc(db, 'accountingEntries', entry.id), entry, { merge: true });
              }
            }
            // Sync AI studio generations
            if (inMemoryDb.aiStudioGenerations) {
              for (const gen of inMemoryDb.aiStudioGenerations) {
                await setDoc(doc(db, 'aiStudioGenerations', gen.id), gen, { merge: true });
              }
            }
          } catch (syncErr) {
            console.error('[DbPersistence] Background Firestore sync warning:', syncErr);
          }
        }

        resolve(result);
        return result;
      } catch (err) {
        console.error('[DbPersistence] Mutation error:', err);
        reject(err);
      }
    });
  });
}

/**
 * Auth token management with dual persistence (memory + Firestore + local backup).
 */
export async function saveAuthToken(token: string, user: UserRecord): Promise<void> {
  await initPersistence();
  const tokenData = { user, createdAt: Date.now() };
  activeTokensCache[token] = tokenData;
  writeLocalTokensBackup(activeTokensCache);

  const db = getFirestoreInstance();
  if (db) {
    try {
      await setDoc(doc(db, 'authTokens', token), tokenData);
    } catch (e) {
      console.warn('[DbPersistence] Failed to persist token to Firestore:', e);
    }
  }
}

export function getUserByAuthToken(token: string | null | undefined): UserRecord | null {
  if (!token) return null;
  const entry = activeTokensCache[token];
  if (!entry) return null;
  // Tokens valid for 30 days
  if (Date.now() - entry.createdAt > 30 * 24 * 60 * 60 * 1000) {
    delete activeTokensCache[token];
    writeLocalTokensBackup(activeTokensCache);
    const db = getFirestoreInstance();
    if (db) {
      deleteDoc(doc(db, 'authTokens', token)).catch(() => {});
    }
    return null;
  }
  // Return the authoritative user record from inMemoryDb if present
  if (entry.user && entry.user.id && inMemoryDb.users[entry.user.id]) {
    return inMemoryDb.users[entry.user.id];
  }
  return entry.user;
}

export async function deleteAuthToken(token: string): Promise<void> {
  delete activeTokensCache[token];
  writeLocalTokensBackup(activeTokensCache);
  const db = getFirestoreInstance();
  if (db) {
    try {
      await deleteDoc(doc(db, 'authTokens', token));
    } catch (e) {
      console.warn('[DbPersistence] Failed to remove token from Firestore:', e);
    }
  }
}

/**
 * Explicit helper to link a user to a merchant profile permanently.
 */
export async function linkUserToMerchant(userId: string, merchantId: string): Promise<UserRecord> {
  return await withDbTransaction(async (db) => {
    const user = db.users[userId];
    if (!user) {
      throw new Error(`User ${userId} not found for merchant linking`);
    }
    user.merchantId = merchantId;
    user.updatedAt = new Date().toISOString();
    return user;
  });
}
