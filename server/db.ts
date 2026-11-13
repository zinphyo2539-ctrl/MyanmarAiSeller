import crypto from 'crypto';
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

const ROOT_DIR = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '/';
const DATA_DIR = path.join(ROOT_DIR, 'data');
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
    faviconUrl?: string;
    coverUrl?: string;
    deliveryInfo?: string;
    paymentInstructions?: string;
    paymentSettings?: any;
    isPublished?: boolean;
    updatedAt?: string;
    themeConfig?: any;
    draftThemeConfig?: any;
    themeHistory?: any[];
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

        // 2. Synchronously commit updated entities to Cloud Firestore
        const db = getFirestoreInstance();
        if (db) {
          try {
            let batch = writeBatch(db);
            let opCount = 0;

            const commitBatchIfNeeded = async (force = false) => {
              if (opCount >= 400 || (force && opCount > 0)) {
                await batch.commit();
                batch = writeBatch(db);
                opCount = 0;
              }
            };

            for (const [id, user] of Object.entries(inMemoryDb.users)) {
              batch.set(doc(db, 'users', id), user, { merge: true });
              opCount++;
              await commitBatchIfNeeded();
            }
            for (const [id, merchant] of Object.entries(inMemoryDb.merchants)) {
              batch.set(doc(db, 'merchants', id), merchant, { merge: true });
              opCount++;
              await commitBatchIfNeeded();
            }
            for (const prod of inMemoryDb.products) {
              batch.set(doc(db, 'products', prod.id), prod, { merge: true });
              opCount++;
              await commitBatchIfNeeded();
            }
            for (const order of inMemoryDb.orders) {
              batch.set(doc(db, 'orders', order.id), order, { merge: true });
              opCount++;
              await commitBatchIfNeeded();
            }
            for (const reply of inMemoryDb.sampleReplies) {
              batch.set(doc(db, 'sampleReplies', reply.id), reply, { merge: true });
              opCount++;
              await commitBatchIfNeeded();
            }
            if (inMemoryDb.auditLogs) {
              for (const log of inMemoryDb.auditLogs) {
                batch.set(doc(db, 'auditLogs', log.id), log, { merge: true });
                opCount++;
                await commitBatchIfNeeded();
              }
            }
            if (inMemoryDb.accountingEntries) {
              for (const entry of inMemoryDb.accountingEntries) {
                batch.set(doc(db, 'accountingEntries', entry.id), entry, { merge: true });
                opCount++;
                await commitBatchIfNeeded();
              }
            }
            if (inMemoryDb.aiStudioGenerations) {
              for (const gen of inMemoryDb.aiStudioGenerations) {
                batch.set(doc(db, 'aiStudioGenerations', gen.id), gen, { merge: true });
                opCount++;
                await commitBatchIfNeeded();
              }
            }
            await commitBatchIfNeeded(true);
          } catch (syncErr) {
            console.error('[DbPersistence] Firestore commit error:', syncErr);
            throw syncErr;
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
      const hashed = crypto.createHash('sha256').update(token).digest('hex');
      await Promise.all([
        setDoc(doc(db, 'authTokens', hashed), tokenData),
        setDoc(doc(db, 'authTokens', token), tokenData),
      ]);
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

export async function getUserByAuthTokenAsync(token: string | null | undefined): Promise<UserRecord | null> {
  if (!token) return null;
  const local = getUserByAuthToken(token);
  if (local) return local;

  const db = getFirestoreInstance();
  if (db) {
    try {
      const hashed = crypto.createHash('sha256').update(token).digest('hex');
      let snap = await getDoc(doc(db, 'authTokens', hashed));
      if (!snap.exists()) {
        snap = await getDoc(doc(db, 'authTokens', token));
      }
      if (snap.exists()) {
        const data = snap.data() as any;
        if (data && data.user) {
          activeTokensCache[token] = { user: data.user, createdAt: data.createdAt || Date.now() };
          return data.user;
        }
      }
    } catch (e) {
      console.warn('[DbPersistence] Firestore token lookup error:', e);
    }
  }
  return null;
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

export function getDefaultThemeConfig(storeName: string = 'My Store', description: string = ''): any {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    industryProfile: 'general',
    brand: {
      logoUrl: '',
      faviconUrl: '',
      storeName: storeName || 'My Store',
      tagline: 'Premium Commerce & Fashion',
      description: description || 'Welcome to our official branded storefront.',
      primaryColor: '#C9A227',
      secondaryColor: '#393426',
      accentColor: '#E0BD55',
      headingTextColor: '#FFFFFF',
      bodyTextColor: '#B9B5A7',
      surfaceColor: '#181810',
      surfaceBorderColor: 'rgba(255, 255, 255, 0.08)'
    },
    background: {
      storeBgImage: '',
      storeBgColor: '#0B0B09',
      heroBgImage: '',
      bannerBgImage: '',
      bgPosition: 'center',
      bgSize: 'cover',
      bgRepeat: 'no-repeat',
      overlayColor: '#0B0B09',
      overlayOpacity: 40
    },
    typography: {
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Plus Jakarta Sans',
      headingScale: 'normal',
      bodyScale: 'normal',
      textAlignment: 'left'
    },
    header: {
      logoPosition: 'left',
      headerBgColor: 'rgba(11, 11, 9, 0.85)',
      headerTextColor: '#FFFFFF',
      showNavigation: true,
      showSearch: true,
      showCart: true,
      stickyHeader: true
    },
    homepage: {
      sections: [
        { id: 'hero', enabled: true, title: 'Welcome to our Official Storefront', subtitle: 'Curated premium collection' },
        { id: 'customer_lookup', enabled: true, title: 'Order & Support Lookup', subtitle: 'Track your order status with your support code' },
        { id: 'delivery_payment', enabled: true, title: 'Delivery & Payment Policies', subtitle: 'Fast and reliable delivery across Myanmar' },
        { id: 'featured_products', enabled: true, title: 'Our Catalog', subtitle: 'Explore all available items' }
      ]
    },
    productDisplay: {
      gridColumns: 3,
      layoutDensity: 'comfortable',
      cardRadius: '2xl',
      cardShadow: 'lg',
      imageAspectRatio: 'square',
      imageFit: 'cover',
      imagePadding: 0,
      showDiscountBadge: true,
      showStockBadge: true,
      buttonStyle: 'gradient'
    },
    buttons: {
      buttonPrimaryBg: '#C9A227',
      buttonPrimaryText: '#0B0B09',
      buttonRadius: 'full'
    },
    footer: {
      footerBgColor: '#0B0B09',
      footerTextColor: '#8C887B',
      showContact: true,
      showSocial: true,
      socialLinks: {
        facebook: '',
        viber: '',
        telegram: '',
        tiktok: '',
        phone: ''
      },
      copyrightText: 'Official Verified Storefront. All rights reserved.'
    }
  };
}

export function sanitizeThemeConfig(input: any, baseStoreName: string = 'My Store'): any {
  const defaults = getDefaultThemeConfig(baseStoreName);
  if (!input || typeof input !== 'object') return defaults;

  return {
    version: typeof input.version === 'number' ? input.version : defaults.version,
    updatedAt: new Date().toISOString(),
    publishedAt: input.publishedAt || defaults.publishedAt,
    industryProfile: ['general', 'fashion', 'electronics', 'cosmetics', 'grocery', 'home'].includes(input.industryProfile) ? input.industryProfile : defaults.industryProfile,
    brand: {
      logoUrl: typeof input.brand?.logoUrl === 'string' ? input.brand.logoUrl : defaults.brand.logoUrl,
      faviconUrl: typeof input.brand?.faviconUrl === 'string' ? input.brand.faviconUrl : defaults.brand.faviconUrl,
      storeName: typeof input.brand?.storeName === 'string' && input.brand.storeName.trim() ? input.brand.storeName.trim() : defaults.brand.storeName,
      tagline: typeof input.brand?.tagline === 'string' ? input.brand.tagline : defaults.brand.tagline,
      description: typeof input.brand?.description === 'string' ? input.brand.description : defaults.brand.description,
      primaryColor: typeof input.brand?.primaryColor === 'string' && input.brand.primaryColor.startsWith('#') ? input.brand.primaryColor : defaults.brand.primaryColor,
      secondaryColor: typeof input.brand?.secondaryColor === 'string' ? input.brand.secondaryColor : defaults.brand.secondaryColor,
      accentColor: typeof input.brand?.accentColor === 'string' ? input.brand.accentColor : defaults.brand.accentColor,
      headingTextColor: typeof input.brand?.headingTextColor === 'string' ? input.brand.headingTextColor : defaults.brand.headingTextColor,
      bodyTextColor: typeof input.brand?.bodyTextColor === 'string' ? input.brand.bodyTextColor : defaults.brand.bodyTextColor,
      surfaceColor: typeof input.brand?.surfaceColor === 'string' ? input.brand.surfaceColor : defaults.brand.surfaceColor,
      surfaceBorderColor: typeof input.brand?.surfaceBorderColor === 'string' ? input.brand.surfaceBorderColor : defaults.brand.surfaceBorderColor,
    },
    background: {
      storeBgImage: typeof input.background?.storeBgImage === 'string' ? input.background.storeBgImage : defaults.background.storeBgImage,
      storeBgColor: typeof input.background?.storeBgColor === 'string' ? input.background.storeBgColor : defaults.background.storeBgColor,
      heroBgImage: typeof input.background?.heroBgImage === 'string' ? input.background.heroBgImage : defaults.background.heroBgImage,
      bannerBgImage: typeof input.background?.bannerBgImage === 'string' ? input.background.bannerBgImage : defaults.background.bannerBgImage,
      bgPosition: ['center', 'top', 'bottom', 'left', 'right'].includes(input.background?.bgPosition) ? input.background.bgPosition : defaults.background.bgPosition,
      bgSize: ['cover', 'contain', 'auto'].includes(input.background?.bgSize) ? input.background.bgSize : defaults.background.bgSize,
      bgRepeat: ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'].includes(input.background?.bgRepeat) ? input.background.bgRepeat : defaults.background.bgRepeat,
      overlayColor: typeof input.background?.overlayColor === 'string' ? input.background.overlayColor : defaults.background.overlayColor,
      overlayOpacity: typeof input.background?.overlayOpacity === 'number' && input.background.overlayOpacity >= 0 && input.background.overlayOpacity <= 100 ? input.background.overlayOpacity : defaults.background.overlayOpacity,
    },
    typography: {
      headingFont: ['Plus Jakarta Sans', 'Outfit', 'Playfair Display', 'DM Sans', 'Space Grotesk', 'Cinzel'].includes(input.typography?.headingFont) ? input.typography.headingFont : defaults.typography.headingFont,
      bodyFont: ['Plus Jakarta Sans', 'DM Sans', 'Manrope', 'Source Serif 4', 'Public Sans'].includes(input.typography?.bodyFont) ? input.typography.bodyFont : defaults.typography.bodyFont,
      headingScale: ['normal', 'large', 'compact'].includes(input.typography?.headingScale) ? input.typography.headingScale : defaults.typography.headingScale,
      bodyScale: ['normal', 'large', 'compact'].includes(input.typography?.bodyScale) ? input.typography.bodyScale : defaults.typography.bodyScale,
      textAlignment: ['left', 'center'].includes(input.typography?.textAlignment) ? input.typography.textAlignment : defaults.typography.textAlignment,
    },
    header: {
      logoPosition: ['left', 'center'].includes(input.header?.logoPosition) ? input.header.logoPosition : defaults.header.logoPosition,
      headerBgColor: typeof input.header?.headerBgColor === 'string' ? input.header.headerBgColor : defaults.header.headerBgColor,
      headerTextColor: typeof input.header?.headerTextColor === 'string' ? input.header.headerTextColor : defaults.header.headerTextColor,
      showNavigation: typeof input.header?.showNavigation === 'boolean' ? input.header.showNavigation : defaults.header.showNavigation,
      showSearch: typeof input.header?.showSearch === 'boolean' ? input.header.showSearch : defaults.header.showSearch,
      showCart: typeof input.header?.showCart === 'boolean' ? input.header.showCart : defaults.header.showCart,
      stickyHeader: typeof input.header?.stickyHeader === 'boolean' ? input.header.stickyHeader : defaults.header.stickyHeader,
    },
    homepage: {
      sections: Array.isArray(input.homepage?.sections) ? input.homepage.sections.map((sec: any) => ({
        id: sec.id,
        enabled: typeof sec.enabled === 'boolean' ? sec.enabled : true,
        title: typeof sec.title === 'string' ? sec.title : undefined,
        subtitle: typeof sec.subtitle === 'string' ? sec.subtitle : undefined
      })) : defaults.homepage.sections
    },
    productDisplay: {
      gridColumns: [2, 3, 4, 5, 6].includes(Number(input.productDisplay?.gridColumns)) ? Number(input.productDisplay.gridColumns) : defaults.productDisplay.gridColumns,
      layoutDensity: ['comfortable', 'compact', 'tight'].includes(input.productDisplay?.layoutDensity) ? input.productDisplay.layoutDensity : defaults.productDisplay.layoutDensity,
      cardRadius: ['none', 'md', 'xl', '2xl', '3xl'].includes(input.productDisplay?.cardRadius) ? input.productDisplay.cardRadius : defaults.productDisplay.cardRadius,
      cardShadow: ['none', 'sm', 'md', 'lg', 'glow'].includes(input.productDisplay?.cardShadow) ? input.productDisplay.cardShadow : defaults.productDisplay.cardShadow,
      imageAspectRatio: ['square', 'portrait', 'landscape', 'curated'].includes(input.productDisplay?.imageAspectRatio) ? input.productDisplay.imageAspectRatio : defaults.productDisplay.imageAspectRatio,
      imageFit: ['cover', 'contain'].includes(input.productDisplay?.imageFit) ? input.productDisplay.imageFit : defaults.productDisplay.imageFit,
      imagePadding: typeof input.productDisplay?.imagePadding === 'number' ? input.productDisplay.imagePadding : defaults.productDisplay.imagePadding,
      showDiscountBadge: typeof input.productDisplay?.showDiscountBadge === 'boolean' ? input.productDisplay.showDiscountBadge : defaults.productDisplay.showDiscountBadge,
      showStockBadge: typeof input.productDisplay?.showStockBadge === 'boolean' ? input.productDisplay.showStockBadge : defaults.productDisplay.showStockBadge,
      buttonStyle: ['gradient', 'solid', 'outline', 'pill'].includes(input.productDisplay?.buttonStyle) ? input.productDisplay.buttonStyle : defaults.productDisplay.buttonStyle,
    },
    buttons: {
      buttonPrimaryBg: typeof input.buttons?.buttonPrimaryBg === 'string' ? input.buttons.buttonPrimaryBg : defaults.buttons.buttonPrimaryBg,
      buttonPrimaryText: typeof input.buttons?.buttonPrimaryText === 'string' ? input.buttons.buttonPrimaryText : defaults.buttons.buttonPrimaryText,
      buttonRadius: ['none', 'md', 'lg', 'full'].includes(input.buttons?.buttonRadius) ? input.buttons.buttonRadius : defaults.buttons.buttonRadius,
    },
    footer: {
      footerBgColor: typeof input.footer?.footerBgColor === 'string' ? input.footer.footerBgColor : defaults.footer.footerBgColor,
      footerTextColor: typeof input.footer?.footerTextColor === 'string' ? input.footer.footerTextColor : defaults.footer.footerTextColor,
      showContact: typeof input.footer?.showContact === 'boolean' ? input.footer.showContact : defaults.footer.showContact,
      showSocial: typeof input.footer?.showSocial === 'boolean' ? input.footer.showSocial : defaults.footer.showSocial,
      socialLinks: {
        facebook: input.footer?.socialLinks?.facebook || '',
        viber: input.footer?.socialLinks?.viber || '',
        telegram: input.footer?.socialLinks?.telegram || '',
        tiktok: input.footer?.socialLinks?.tiktok || '',
        phone: input.footer?.socialLinks?.phone || ''
      },
      copyrightText: typeof input.footer?.copyrightText === 'string' ? input.footer.copyrightText : defaults.footer.copyrightText
    }
  };
}
