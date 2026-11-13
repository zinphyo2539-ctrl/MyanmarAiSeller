/**
 * Merchant Repository - Firestore Authoritative Implementation
 */
import { getFirestoreRestClient, FirestoreRestClient } from '../firestoreClient.ts';
import { MerchantRecord, withDbTransaction } from '../db.ts';

export class MerchantRepository {
  private client: FirestoreRestClient;

  constructor(client: FirestoreRestClient = getFirestoreRestClient()) {
    this.client = client;
  }

  async findById(merchantId: string): Promise<MerchantRecord | null> {
    if (!merchantId) return null;
    try {
      const doc = await this.client.getDocument<MerchantRecord>('merchants', merchantId);
      if (doc) return doc;
    } catch (err: any) {
      console.warn('Firestore getDocument failed for merchant, falling back to local db:', err?.message || err);
    }
    let found: MerchantRecord | null = null;
    await withDbTransaction((db: any) => {
      found = db.merchants?.[merchantId] || Object.values(db.merchants || {}).find((m: any) => m.id === merchantId) || null;
    });
    return found;
  }

  async findBySlug(slug: string): Promise<MerchantRecord | null> {
    if (!slug) return null;
    const cleanSlug = slug.trim().toLowerCase();
    try {
      const results = await this.client.runQuery<MerchantRecord>('merchants', {
        where: [{ field: 'store.slug', op: 'EQUAL', value: cleanSlug }],
        limit: 1,
      });
      if (results.length > 0) return results[0];
    } catch (err: any) {
      console.warn('Firestore query failed for merchants by slug, falling back to local db:', err?.message || err);
    }
    let foundMerchant: MerchantRecord | null = null;
    await withDbTransaction((db: any) => {
      const allMerchants = Object.values(db.merchants || {}) as MerchantRecord[];
      const match = allMerchants.find((m: any) => m.store?.slug?.toLowerCase() === cleanSlug || m.id === cleanSlug || m.slug === cleanSlug);
      if (match) {
        foundMerchant = match;
      }
    });
    return foundMerchant;
  }

  async findByEmail(email: string): Promise<MerchantRecord | null> {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const results = await this.client.runQuery<MerchantRecord>('merchants', {
      where: [{ field: 'email', op: 'EQUAL', value: cleanEmail }],
      limit: 1,
    });
    return results.length > 0 ? results[0] : null;
  }

  async upsert(merchant: MerchantRecord): Promise<MerchantRecord> {
    const existing = await this.findById(merchant.id);
    if (existing) {
      return await this.client.updateDocument<MerchantRecord>('merchants', merchant.id, merchant, {
        merge: true,
      });
    }
    return await this.client.createDocument<MerchantRecord>('merchants', merchant.id, merchant);
  }

  async listAll(limit = 100): Promise<MerchantRecord[]> {
    return await this.client.runQuery<MerchantRecord>('merchants', { limit });
  }
}

export const merchantRepository = new MerchantRepository();
